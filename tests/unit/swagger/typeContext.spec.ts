import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { SpecGenerator3 } from '@tsoa/cli/swagger/specGenerator3';
import { SpecGenerator31 } from '@tsoa/cli/swagger/specGenerator31';
import { Swagger } from '@tsoa/runtime';
import { expect } from 'chai';
import 'mocha';
import { createProgram, flattenDiagnosticMessageText, ModuleKind, ScriptTarget } from 'typescript';
import { getDefaultExtendedOptions } from '../../fixtures/defaultOptions';

const fixtureRoot = './fixtures/controllers/typeContext/';
const fixtureNames = ['arrayFirst', 'nestedFirst', 'intersection', 'namespaceUnion', 'genericEntries', 'continuity', 'tuple'];

function required<T>(value: T | undefined, name: string): T {
  if (value === undefined) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function generate(name: string, strictNullChecks: boolean) {
  const metadata = new MetadataGenerator(`${fixtureRoot}${name}Controller.ts`, { strictNullChecks }).Generate();
  const spec = new SpecGenerator3(metadata, getDefaultExtendedOptions()).GetSpec();
  if (spec.openapi !== '3.0.0') {
    throw new Error('Expected an OpenAPI 3.0 specification');
  }
  const schemas = required(spec.components.schemas, 'component schemas');
  const resolve = (schema: Swagger.Schema3 | undefined): Swagger.Schema3 => {
    const value = required(schema, 'schema');
    const reference = value.$ref ?? [...(value.allOf ?? []), ...(value.anyOf ?? [])].find(branch => branch.$ref)?.$ref;
    return reference ? resolve(required(schemas[reference.replace('#/components/schemas/', '')], reference)) : value;
  };
  const response = (path = '/type-context') => resolve(spec.paths[path].get?.responses['200'].content?.['application/json'].schema);
  return { metadata, spec, schemas, resolve, response };
}

describe('Type context across nested schemas', () => {
  for (const strictNullChecks of [false, true]) {
    describe(`strictNullChecks=${strictNullChecks}`, () => {
      it('uses fixtures without TypeScript diagnostics', () => {
        for (const name of fixtureNames) {
          const entryFile = `${fixtureRoot}${name}Controller.ts`;
          const program = createProgram([entryFile], { strictNullChecks, experimentalDecorators: true, target: ScriptTarget.ES2021, module: ModuleKind.CommonJS, skipLibCheck: true });
          const diagnostics = program
            .getSourceFiles()
            .filter(source => source.fileName.includes('/controllers/typeContext/'))
            .flatMap(source => [...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source)]);
          expect(
            diagnostics.map(diagnostic => flattenDiagnosticMessageText(diagnostic.messageText, '\n')),
            name,
          ).to.deep.equal([]);
        }
      });

      for (const name of ['arrayFirst', 'nestedFirst']) {
        it(`keeps mapped array items and nested properties with ${name} in a fresh generator`, () => {
          const { resolve, response } = generate(name, strictNullChecks);
          const target = response();
          const nestedProperty = target.properties?.nested;
          const list = required(target.properties?.list, 'list');
          expect(list.type).to.equal('array');
          expect(required(list.items?.$ref, 'array item reference')).to.equal(required(nestedProperty?.$ref, 'nested reference'));
          const nested = resolve(nestedProperty);
          expect(nested.properties).to.have.all.keys('text', 'count');
          expect(nested.properties?.text.type).to.equal('string');
          expect(nested.properties?.count.type).to.equal('number');
          expect(nested.required).to.equal(undefined);
          const joint = resolve(target.properties?.joint);
          expect(joint.properties).to.have.all.keys('left', 'right');
          expect(joint.properties?.left.type).to.equal('string');
          expect(joint.properties?.right.type).to.equal('number');
        });

        it(`keeps boolean and named enum normalization with ${name}`, () => {
          const { schemas, response } = generate(name, strictNullChecks);
          const target = response();
          expect(target.properties?.flag.type).to.equal('boolean');
          expect(target.properties?.flag.enum).to.equal(undefined);
          expect(target.properties?.color.$ref).to.equal('#/components/schemas/Shade');
          expect(schemas.Shade.enum).to.deep.equal(['red', 'blue']);
        });
      }

      it('keeps both namespace-qualified mapped union members', () => {
        const { resolve, response } = generate('namespaceUnion', strictNullChecks);
        const union = required(response().properties?.value, 'value');
        const members = required(union.anyOf, 'union members').map(member => resolve({ $ref: required(member.$ref, 'union member reference') }));
        expect(members).to.have.length(2);
        expect(members.map(member => Object.keys(member.properties ?? {}))).to.have.deep.members([['a'], ['b']]);
        expect(members.find(member => member.properties?.a)?.properties?.a.type).to.equal('string');
        expect(members.find(member => member.properties?.b)?.properties?.b.type).to.equal('number');
        expect(members.every(member => member.required === undefined)).to.equal(true);
      });

      it('keeps mapped properties inside a synthetic intersection', () => {
        const { resolve, response } = generate('intersection', strictNullChecks);
        const intersection = required(response().properties?.nested, 'nested intersection');
        const branches = required(intersection.allOf, 'intersection members');
        const mappedReference = required(branches.find(branch => branch.$ref)?.$ref, 'mapped intersection member');
        const mapped = resolve({ $ref: mappedReference });
        expect(mapped.properties).to.have.all.keys('value', 'count');
        expect(mapped.properties?.value.type).to.equal('string');
        expect(mapped.properties?.count.type).to.equal('number');
        expect(mapped.required).to.equal(undefined);
        expect(branches.find(branch => branch.properties?.marker)?.properties?.marker).to.deep.include({ type: 'boolean' });
      });

      it('keeps nested generic substitutions', () => {
        const { resolve, response } = generate('genericEntries', strictNullChecks);
        const text = resolve(response('/type-context/nested').properties?.value);
        expect(text.properties).to.have.all.keys('text');
        expect(text.properties?.text.type).to.equal('string');
        expect(text.required).to.equal(undefined);
      });

      it('keeps indexed generic aliases', () => {
        const { response } = generate('genericEntries', strictNullChecks);
        const count = response('/type-context/indexed');
        expect(count.properties).to.have.all.keys('count');
        expect(count.properties?.count.type).to.equal('number');
        expect(count.required).to.equal(undefined);
      });

      it('keeps inferred generic return types', () => {
        const { resolve, response } = generate('genericEntries', strictNullChecks);
        const inferred = resolve(response('/type-context/inferred').properties?.value);
        expect(inferred.properties).to.have.all.keys('count');
        expect(inferred.properties?.count.type).to.equal('number');
        expect(inferred.required).to.equal(undefined);
      });

      it('keeps annotations, defaults, validators, and inherited fields', () => {
        const { schemas, response } = generate('continuity', strictNullChecks);
        const annotated = response('/type-context/annotated');
        expect(annotated.properties).to.have.all.keys('id', 'label');
        expect(annotated.required).to.equal(undefined);
        expect(annotated.properties?.label).to.deep.include({
          type: 'string',
          description: 'A display label.',
          default: 'ready',
          minLength: 3,
          maxLength: 20,
          pattern: '^[a-z]+$',
          example: 'sample',
          deprecated: true,
        });
        expect(schemas).not.to.have.property('InheritedBase');
      });

      it('keeps actual recursive aliases connected to their own schema', () => {
        const { response } = generate('continuity', strictNullChecks);
        const recursive = response('/type-context/recursive');
        expect(recursive.properties).to.have.all.keys('label', 'children');
        expect(recursive.required).to.have.members(['label', 'children']);
        expect(recursive.properties?.children.type).to.equal('array');
        expect(recursive.properties?.children.items?.$ref).to.equal('#/components/schemas/RecursiveNode');
      });

      it('keeps every original DeepPartial and MergePatch level optional', () => {
        const metadata = new MetadataGenerator('./fixtures/controllers/recursiveMappedTypeController.ts', { strictNullChecks }).Generate();
        const spec = new SpecGenerator3(metadata, getDefaultExtendedOptions()).GetSpec();
        const schemas = required(spec.components.schemas, 'component schemas');
        for (const name of ['DeepPartial', 'MergePatch']) {
          const target = required(schemas[`${name}_Target_`], 'target');
          const nested = required(schemas[`${name}_Nested_`], 'nested');
          const deeper = required(schemas[`${name}_Deeper_`], 'deeper');
          expect(target.properties).to.have.all.keys('a', 'nested');
          expect(nested.properties).to.have.all.keys('b', 'deeper');
          expect(deeper.properties).to.have.all.keys('c');
          for (const schema of [target, nested, deeper]) {
            expect(schema.required).to.equal(undefined);
            for (const property of Object.values(schema.properties ?? {})) {
              expect(property.nullable).to.equal(name === 'MergePatch' && strictNullChecks ? true : undefined);
            }
          }
          expect(spec.paths[`/RecursiveMappedType/${name}`].patch?.requestBody?.content['application/json'].schema).to.deep.equal({ $ref: `#/components/schemas/${name}_Target_` });
        }
      });

      it('keeps readonly tuple elements and rest types in metadata and OpenAPI 3.1', () => {
        const metadata = new MetadataGenerator(`${fixtureRoot}tupleController.ts`, { strictNullChecks }).Generate();
        for (const name of ['FixedTuple', 'RestTuple']) {
          const reference = required(metadata.referenceTypeMap[name], name);
          expect(reference.dataType).to.equal('refAlias');
          if (reference.dataType !== 'refAlias' || reference.type.dataType !== 'tuple') {
            throw new Error(`Expected ${name} to be a tuple alias`);
          }
          expect(reference.type.types).to.deep.equal(name === 'FixedTuple' ? [{ dataType: 'string' }, { dataType: 'double' }] : [{ dataType: 'string' }]);
          expect(reference.type.restType).to.deep.equal(name === 'RestTuple' ? { dataType: 'double' } : undefined);
        }
        const spec = new SpecGenerator31(metadata, getDefaultExtendedOptions()).GetSpec();
        expect(spec.components.schemas?.FixedTuple).to.deep.include({ type: 'array', prefixItems: [{ type: 'string' }, { type: 'number', format: 'double' }], minItems: 2, maxItems: 2, items: false });
        expect(spec.components.schemas?.RestTuple).to.deep.include({ type: 'array', prefixItems: [{ type: 'string' }], minItems: 1, items: { type: 'number', format: 'double' } });
        expect(() => new SpecGenerator3(metadata, getDefaultExtendedOptions()).GetSpec()).to.throw('Tuple types are only supported in OpenAPI 3.1+');
      });
    });
  }
});
