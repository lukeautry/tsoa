import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { SpecGenerator2 } from '@tsoa/cli/swagger/specGenerator2';
import { SpecGenerator3 } from '@tsoa/cli/swagger/specGenerator3';
import { SpecGenerator31 } from '@tsoa/cli/swagger/specGenerator31';
import { Tsoa } from '@tsoa/runtime';
import { expect } from 'chai';
import 'mocha';
import { createProgram, flattenDiagnosticMessageText, getPreEmitDiagnostics, ModuleKind, ScriptTarget } from 'typescript';
import { getDefaultExtendedOptions } from '../../fixtures/defaultOptions';

const fixtureRoot = './fixtures/controllers/typeContextOptionalPresence/';
const fixtureNames = ['inferredFirst', 'sourceFirst'];
const captureNames = [
  'literalUnion',
  'boolean',
  'namedUnion',
  'namedIntersection',
  'primitiveUnion',
  'enum',
  'enumMember',
  'object',
  'array',
  'index',
  'literals',
  'fixed',
  'rest',
  'optionalLength',
  'readonlyArray',
  'mutableArray',
];

function object(metadata: Tsoa.Metadata, name: string) {
  const reference = metadata.referenceTypeMap[name];
  if (reference?.dataType !== 'refObject') {
    throw new Error(`Expected ${name} to be an object`);
  }
  return reference;
}

function property(metadata: Tsoa.Metadata, model: string, name: string) {
  const value = object(metadata, model).properties.find(property => property.name === name);
  if (!value) {
    throw new Error(`Missing ${model}.${name}`);
  }
  return value;
}

function responseValue(metadata: Tsoa.Metadata, name = 'get') {
  const method = metadata.controllers[0].methods.find(method => method.name === name);
  if (method?.type.dataType !== 'refObject') {
    throw new Error(`Expected ${name} to return a named object`);
  }
  return property(metadata, method.type.refName, 'value').type;
}

describe('Optional values in inferred named models', () => {
  for (const strictNullChecks of [false, true]) {
    describe(`strictNullChecks=${strictNullChecks}`, () => {
      it('uses fixtures without TypeScript diagnostics', () => {
        const program = createProgram(
          [...fixtureNames, ...captureNames].map(name => `${fixtureRoot}${name}Controller.ts`),
          { strictNullChecks, experimentalDecorators: true, target: ScriptTarget.ES2021, module: ModuleKind.CommonJS, skipLibCheck: true, noEmit: true },
        );
        expect(getPreEmitDiagnostics(program).map(diagnostic => flattenDiagnosticMessageText(diagnostic.messageText, '\n'))).to.deep.equal([]);
      });

      for (const name of fixtureNames) {
        describe(name, () => {
          let metadata: Tsoa.Metadata;

          before(() => {
            metadata = new MetadataGenerator(`${fixtureRoot}${name}Controller.ts`, { strictNullChecks }).Generate();
          });

          it('separates property presence from its declared value type', () => {
            for (const model of ['LocalOptional', 'OptionalValues_string_', 'OptionalValues', 'OptionalClass']) {
              expect(property(metadata, model, 'value').type, model).to.deep.equal({ dataType: 'string' });
              expect(
                object(metadata, model).properties.every(property => !property.required),
                model,
              ).to.equal(true);
            }
            for (const model of ['OptionalValues_string_', 'OptionalValues', 'OptionalClass']) {
              expect(property(metadata, model, 'inherited').type, model).to.deep.equal({ dataType: 'string' });
              expect(property(metadata, model, 'nullable').type, model).to.deep.equal({ dataType: 'union', types: [{ dataType: 'string' }, { dataType: 'enum', enums: [null] }] });
              expect(property(metadata, model, 'explicitUndefined').type, model).to.deep.equal({ dataType: 'union', types: [{ dataType: 'string' }, { dataType: 'undefined' }] });
            }
            expect(property(metadata, 'OptionalClass', 'token').type).to.deep.equal({ dataType: 'string' });
            expect(property(metadata, 'OptionalClass', 'count').default).to.equal(7);
          });

          for (const specVersion of [2, 3, 3.1]) {
            it(`preserves optional string schemas and number annotations in OpenAPI ${specVersion}`, () => {
              const options = getDefaultExtendedOptions();
              const spec =
                specVersion === 2
                  ? new SpecGenerator2(metadata, options).GetSpec()
                  : specVersion === 3
                    ? new SpecGenerator3(metadata, options).GetSpec()
                    : new SpecGenerator31(metadata, options).GetSpec();
              const schemas = 'swagger' in spec ? spec.definitions : spec.components.schemas;
              if (!schemas) {
                throw new Error('Missing schemas');
              }
              const prefix = specVersion === 2 ? '#/definitions/' : '#/components/schemas/';
              for (const model of ['LocalOptional', 'OptionalValues_string_', 'OptionalValues', 'OptionalClass']) {
                expect(schemas[model].properties?.value, model).to.deep.include({ type: 'string' });
                expect(schemas[model].required, model).to.equal(undefined);
              }
              for (const model of ['OptionalValues_string_', 'OptionalValues']) {
                expect(schemas[model].properties?.count, model).to.deep.include({ $ref: `${prefix}Whole` });
                expect(schemas[model].properties?.literals, model).to.deep.include({ type: 'boolean', enum: [true, false] });
              }
              expect(schemas.Whole).to.deep.include({ type: 'integer', format: 'int32', default: 7, description: 'A whole count.' });
              expect(schemas.OptionalClass.properties?.count).to.deep.include({ type: 'number', format: 'double', default: 7 });
              expect(schemas.OptionalClass.properties?.token).to.deep.include({ type: 'string' });
            });
          }
        });
      }

      describe('computed generic arguments', () => {
        const cases = [
          ['literalUnion', { dataType: 'enum', enums: ['x-a', 'x-b'] }],
          ['boolean', { dataType: 'enum', enums: ['x-false', 'x-true'] }],
          ['namedUnion', { dataType: 'union', types: [{ dataType: 'string' }, { dataType: 'double' }] }],
          ['namedIntersection', { dataType: 'enum', enums: ['left', 'right'] }],
          ['primitiveUnion', { dataType: 'double' }],
          ['enum', { dataType: 'enum', enums: ['enum'] }],
          ['enumMember', { dataType: 'enum', enums: ['enum'] }],
        ] satisfies Array<[string, Tsoa.Type]>;

        for (const [name, expected] of cases) {
          it(`closes the optional ${name} annotation with its exact argument`, () => {
            const metadata = new MetadataGenerator(`${fixtureRoot}${name}Controller.ts`, { strictNullChecks }).Generate();
            expect(responseValue(metadata)).to.deep.equal(expected);
          });
        }
      });

      describe('anonymous data arguments', () => {
        it('populates an optional Partial of an inferred object', () => {
          const metadata = new MetadataGenerator(`${fixtureRoot}objectController.ts`, { strictNullChecks }).Generate();
          const partial = responseValue(metadata);
          if (partial.dataType !== 'refAlias' || partial.type.dataType !== 'nestedObjectLiteral') {
            throw new Error('Expected an anonymous Partial object');
          }
          expect(partial.type.properties.map(property => property.name)).to.have.members(['left', 'count']);
          expect(partial.type.properties.every(property => !property.required)).to.equal(true);
          const spec = new SpecGenerator3(metadata, getDefaultExtendedOptions()).GetSpec();
          expect(spec.components.schemas?.[partial.refName].properties?.left).to.deep.include({ type: 'string' });
          expect(spec.components.schemas?.[partial.refName].properties?.count).to.deep.include({ type: 'number', format: 'double' });
        });

        it('keeps a mapped inferred array as an array', () => {
          const metadata = new MetadataGenerator(`${fixtureRoot}arrayController.ts`, { strictNullChecks }).Generate();
          const partial = responseValue(metadata);
          if (partial.dataType !== 'refAlias' || partial.type.dataType !== 'array') {
            throw new Error('Expected a mapped array alias');
          }
          expect(partial.type.elementType).to.deep.equal(strictNullChecks ? { dataType: 'union', types: [{ dataType: 'string' }, { dataType: 'undefined' }] } : { dataType: 'string' });
          const spec = new SpecGenerator31(metadata, getDefaultExtendedOptions()).GetSpec();
          expect(spec.components.schemas?.[partial.refName]).to.deep.include({ type: 'array', items: { type: 'string' } });
        });

        it('keeps object-valued string indexes', () => {
          const metadata = new MetadataGenerator(`${fixtureRoot}indexController.ts`, { strictNullChecks }).Generate();
          const partial = responseValue(metadata);
          if (partial.dataType !== 'refAlias' || partial.type.dataType !== 'nestedObjectLiteral') {
            throw new Error('Expected a mapped string index');
          }
          const spec = new SpecGenerator3(metadata, getDefaultExtendedOptions()).GetSpec();
          const additional = spec.components.schemas?.[partial.refName].additionalProperties;
          if (typeof additional !== 'object') {
            throw new Error('Expected an object schema for index values');
          }
          expect(additional.properties?.valid).to.deep.include({ type: 'boolean' });
        });

        it('keeps literal boolean and enum fields in an inferred readonly object', () => {
          const metadata = new MetadataGenerator(`${fixtureRoot}literalsController.ts`, { strictNullChecks }).Generate();
          expect(responseValue(metadata)).to.deep.equal({ dataType: 'enum', enums: ['retained'] });
        });
      });

      describe('tuple and readonly arguments', () => {
        it('keeps fixed tuple elements in OpenAPI 3.1', () => {
          const metadata = new MetadataGenerator(`${fixtureRoot}fixedController.ts`, { strictNullChecks }).Generate();
          expect(responseValue(metadata)).to.deep.equal({ dataType: 'tuple', types: [{ dataType: 'string' }, { dataType: 'double' }] });
          const spec = new SpecGenerator31(metadata, getDefaultExtendedOptions()).GetSpec();
          const fixed = metadata.controllers[0].methods[0].type;
          if (fixed?.dataType !== 'refObject') {
            throw new Error('Expected a fixed tuple owner');
          }
          expect(spec.components.schemas?.[fixed.refName].properties?.value).to.deep.include({
            type: 'array',
            prefixItems: [{ type: 'string' }, { type: 'number', format: 'double' }],
            minItems: 2,
            maxItems: 2,
            items: false,
          });
          expect(() => new SpecGenerator2(metadata, getDefaultExtendedOptions()).GetSpec()).to.throw('Tuple types are only supported in OpenAPI 3.1+');
          expect(() => new SpecGenerator3(metadata, getDefaultExtendedOptions()).GetSpec()).to.throw('Tuple types are only supported in OpenAPI 3.1+');
        });

        it('keeps rest tuple elements in OpenAPI 3.1', () => {
          const metadata = new MetadataGenerator(`${fixtureRoot}restController.ts`, { strictNullChecks }).Generate();
          expect(responseValue(metadata)).to.deep.equal({ dataType: 'tuple', types: [{ dataType: 'string' }], restType: { dataType: 'double' } });
          const spec = new SpecGenerator31(metadata, getDefaultExtendedOptions()).GetSpec();
          const rest = metadata.controllers[0].methods[0].type;
          if (rest.dataType !== 'refObject') {
            throw new Error('Expected a rest tuple owner');
          }
          expect(spec.components.schemas?.[rest.refName].properties?.value).to.deep.include({
            type: 'array',
            prefixItems: [{ type: 'string' }],
            minItems: 1,
            items: { type: 'number', format: 'double' },
          });
        });

        it('keeps optional tuple positions', () => {
          const metadata = new MetadataGenerator(`${fixtureRoot}optionalLengthController.ts`, { strictNullChecks }).Generate();
          const value = responseValue(metadata);
          if (value.dataType !== 'union') {
            throw new Error('Expected both possible tuple lengths');
          }
          expect(value.types).to.have.deep.members([
            { dataType: 'enum', enums: [1] },
            { dataType: 'enum', enums: [2] },
          ]);
        });

        for (const kind of ['readonly', 'mutable']) {
          it(`keeps ${kind} array arguments when Array and ReadonlyArray names are shadowed`, () => {
            const metadata = new MetadataGenerator(`${fixtureRoot}${kind}ArrayController.ts`, { strictNullChecks }).Generate();
            expect(responseValue(metadata)).to.deep.equal({ dataType: 'enum', enums: [kind] });
          });
        }
      });
    });
  }
});
