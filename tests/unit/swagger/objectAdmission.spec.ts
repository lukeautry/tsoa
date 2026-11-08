import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { DefaultRouteGenerator } from '@tsoa/cli/routeGeneration/defaultRouteGenerator';
import { SpecGenerator3 } from '@tsoa/cli/swagger/specGenerator3';
import { FieldErrors, Swagger, ValidationService } from '@tsoa/runtime';
import { expect } from 'chai';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import 'mocha';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { createProgram, flattenDiagnosticMessageText } from 'typescript';
import { getDefaultExtendedOptions } from '../../fixtures/defaultOptions';

describe('Object admission at resolver boundaries', () => {
  let directory: string;
  let entryFile: string;
  before(() => {
    directory = mkdtempSync(join(tmpdir(), 'tsoa-object-admission-'));
    entryFile = join(directory, 'controller.ts');
  });
  after(() => rmSync(directory, { recursive: true, force: true }));

  const generate = (definitions: string, method: string, lib: string[], strict = true) => {
    const runtime = resolve('../packages/runtime').replace(/\\/g, '/');
    writeFileSync(entryFile, `import { Body, Post, Route } from '${runtime}';\n${definitions}\n@Route('objects') export class ObjectAdmissionController {\n@Post() ${method}\n}`);
    const options = { strict, experimentalDecorators: true, skipLibCheck: true, types: [], lib };
    const diagnostics = createProgram([entryFile], options).getSemanticDiagnostics();
    expect(diagnostics.map(diagnostic => flattenDiagnosticMessageText(diagnostic.messageText, '\n'))).to.deep.equal([]);
    return new MetadataGenerator(entryFile, options).Generate();
  };

  const cases = [
    { type: 'RegExp', value: '/x/', libs: [['lib.es5.d.ts'], ['lib.es2021.d.ts'], ['lib.es2021.d.ts', 'lib.dom.d.ts']] },
    { type: 'Set<string>', value: 'new Set<string>()', libs: [['lib.es5.d.ts', 'lib.es2015.collection.d.ts'], ['lib.es2021.d.ts'], ['lib.es2021.d.ts', 'lib.dom.d.ts']] },
    { type: 'WeakRef<object>', value: 'new WeakRef({})', libs: [['lib.es2021.d.ts'], ['lib.es2021.d.ts', 'lib.dom.d.ts']] },
  ];
  for (const { type, value, libs } of cases) {
    for (const lib of libs) {
      for (const form of ['direct', 'aliased', 'inferred', 'nested'] as const) {
        it(`rejects ${form} ${type} with ${lib.join(', ')}`, () => {
          const definitions = form === 'aliased' ? `type Unsupported = ${type};` : '';
          const method =
            form === 'inferred'
              ? `post() { return { value: ${value} }; }`
              : form === 'nested'
                ? `post(@Body() body: { groups: { value: ${type} }[] }): void {}`
                : `post(@Body() body: { value: ${form === 'aliased' ? 'Unsupported' : type} }): void {}`;
          let message: string | undefined;
          try {
            generate(definitions, method, lib);
          } catch (error) {
            message = (error as Error).message;
          }
          expect(message, 'unsupported objects must not generate a schema').to.be.a('string');
          const path = form === 'inferred' ? 'value' : form === 'nested' ? 'body.groups[].value' : 'body.value';
          expect(message).to.include('Unsupported type:');
          expect(message).to.include(`at '${path}'. Built-in classes such as Set and Map have no JSON form`);
          const sourceLine = form === 'aliased' ? 2 : 4;
          expect(message).to.include(`At: ${entryFile}:${sourceLine}:${sourceLine}.`);
          expect(message).not.to.include('At unknown position');
          expect(message).to.include("in 'ObjectAdmissionController.post'");
          expect(message).not.to.match(/At: .*lib\.es\d/);
        });
      }
    }
  }

  for (const strict of [false, true]) {
    for (const type of ['URL', 'DOMRect']) {
      it(`preserves ${type}.toJSON with DOM libs and strict ${strict}`, () => {
        const metadata = generate('', `post(@Body() body: { value: ${type} }): void {}`, ['lib.es2021.d.ts', 'lib.dom.d.ts'], strict);
        const spec = new SpecGenerator3(metadata, getDefaultExtendedOptions('', entryFile)).GetSpec();
        const schemas = JSON.parse(JSON.stringify(spec.components.schemas!)) as Record<string, Swagger.Schema3>;
        const models = new DefaultRouteGenerator(metadata, { entryFile, routesDir: directory, noImplicitAdditionalProperties: 'ignore', bodyCoercion: false }).buildModels();
        expect(schemas[type].properties).to.equal(undefined);
        expect(schemas[type].type).to.equal(type === 'URL' ? 'string' : undefined);
        expect(models[type].dataType).to.equal('refAlias');
        const validate = (value: unknown) => {
          const errors: FieldErrors = {};
          new ValidationService(models, { bodyCoercion: false, noImplicitAdditionalProperties: 'ignore' }).ValidateParam({ ref: type, required: true }, value, 'body.value', errors, true);
          return Object.keys(errors).length === 0;
        };
        if (type === 'URL') {
          expect(validate('https://example.com')).to.equal(true);
          expect(validate(42)).to.equal(false);
          expect(validate({ href: 'https://example.com' })).to.equal(false);
        } else {
          // lib.dom declares DOMRect.toJSON(): any, so no rectangle properties are required.
          expect(validate({ x: 1, y: 2, width: 3, height: 4 })).to.equal(true);
          expect(validate({})).to.equal(true);
          expect(validate('serialized rectangle')).to.equal(true);
        }
      });
    }
  }

  for (const lib of [['lib.es5.d.ts'], ['lib.es2021.d.ts'], ['lib.es2022.d.ts']]) {
    it(`preserves Error, supported aliases, utility aliases and library heritage with ${lib.join(', ')}`, () => {
      const metadata = generate(
        `/** A documented date. */
        type Timestamp = Date;
        type Pending<T> = Promise<T>;
        type Values = ReadonlyArray<Timestamp>;
        interface CustomError extends Error { status: number }
        interface Descriptor extends TypedPropertyDescriptor<string> { label: string }
        interface Result {
          error: Error;
          custom: CustomError;
          date: Timestamp;
          pending: Pending<Timestamp>;
          values: Values;
          partial: Partial<{ name: Timestamp }>;
          record: Record<string, Timestamp>;
          descriptor: Descriptor;
        }`,
        'post(@Body() body: Result): void {}',
        lib,
      );
      const spec = new SpecGenerator3(metadata, getDefaultExtendedOptions('', entryFile)).GetSpec();
      const schemas = JSON.parse(JSON.stringify(spec.components.schemas!)) as Record<string, Swagger.Schema3>;
      expect(schemas.Error.properties).to.include.keys('name', 'message', 'stack');
      expect(schemas.CustomError.properties).to.include.keys('name', 'message', 'stack', 'status');
      expect(schemas.Timestamp).to.deep.equal({ type: 'string', format: 'date-time', description: 'A documented date.' });
      expect(schemas.Result.properties!.pending).to.deep.equal({ $ref: '#/components/schemas/Pending_Timestamp_' });
      expect(schemas.Pending_Timestamp_).to.deep.equal({ $ref: '#/components/schemas/Timestamp' });
      expect(schemas.Values).to.deep.include({ type: 'array', items: { $ref: '#/components/schemas/Timestamp' } });
      const partial = schemas[schemas.Result.properties!.partial.$ref!.split('/').pop()!];
      expect(partial.properties!.name).to.deep.equal({ type: 'string', format: 'date-time' });
      expect(partial.required).to.equal(undefined);
      const record = schemas[schemas.Result.properties!.record.$ref!.split('/').pop()!];
      expect(record.additionalProperties).to.deep.equal({ type: 'string', format: 'date-time' });
      expect(schemas.Descriptor.properties).to.include.keys('label', 'value', 'writable', 'enumerable', 'configurable');
      expect(schemas.Descriptor.properties!.value).to.deep.equal({ type: 'string' });
      expect(schemas.Descriptor.properties!.writable).to.deep.equal({ type: 'boolean' });
      expect(schemas.Descriptor.required).to.deep.equal(['label']);
    });
  }
});
