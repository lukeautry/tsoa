import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { SpecGenerator3 } from '@tsoa/cli/swagger/specGenerator3';
import { SpecGenerator31 } from '@tsoa/cli/swagger/specGenerator31';
import { Swagger, Tsoa } from '@tsoa/runtime';
import { expect } from 'chai';
import 'mocha';
import { createProgram, flattenDiagnosticMessageText, getPreEmitDiagnostics, ModuleKind, ScriptTarget } from 'typescript';
import { getDefaultExtendedOptions } from '../../fixtures/defaultOptions';

const fixtureRoot = './fixtures/controllers/typeContextSourceOccurrences/';
const fixtureNames = [
  'union',
  'intersection',
  'tuple',
  'fixedFirst',
  'valueFirst',
  'inferredUnion',
  'optionalTemplates',
  'staticShadow',
  'recursiveFractionFirst',
  'recursiveWholeFirst',
  'optionalWrapper',
];

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
  const resolve = (schema: Pick<Swagger.Schema3, '$ref'> | undefined): Swagger.Schema3 => {
    const reference = required(required(schema, 'schema').$ref, 'schema reference');
    const value = required(schemas[reference.replace('#/components/schemas/', '')], reference);
    return value.$ref ? resolve(value) : value;
  };
  const response = () => {
    const schema = required(spec.paths['/source-occurrences'].get?.responses['200'].content?.['application/json'].schema, 'response schema');
    return schema.$ref ? resolve(schema) : schema;
  };
  return { metadata, schemas, resolve, response };
}

function expectOptionalLeaf(schema: Pick<Swagger.BaseSchema, 'properties' | 'required'>) {
  expect(schema.properties, 'concrete mapped properties').to.have.all.keys('value');
  expect(schema.properties?.value).to.deep.include({ type: 'string' });
  expect(schema.required, 'mapped value stays optional').to.equal(undefined);
}

function aliasBody(metadata: Tsoa.Metadata, name: string) {
  const alias = required(metadata.referenceTypeMap[name], name);
  if (alias.dataType !== 'refAlias') {
    throw new Error(`Expected ${name} to be an alias`);
  }
  return alias.type;
}

describe('Type context at source occurrences', () => {
  for (const strictNullChecks of [false, true]) {
    describe(`strictNullChecks=${strictNullChecks}`, () => {
      it('uses fixtures without TypeScript diagnostics', () => {
        const program = createProgram(
          fixtureNames.map(name => `${fixtureRoot}${name}Controller.ts`),
          { strictNullChecks, experimentalDecorators: true, target: ScriptTarget.ES2021, module: ModuleKind.CommonJS, skipLibCheck: true, noEmit: true },
        );
        expect(getPreEmitDiagnostics(program).map(diagnostic => flattenDiagnosticMessageText(diagnostic.messageText, '\n'))).to.deep.equal([]);
      });

      it('populates a source generic mapped branch beside null', () => {
        const { metadata, schemas, response } = generate('union', strictNullChecks);
        expect(response().allOf).to.deep.equal([{ $ref: '#/components/schemas/Optional_Leaf_' }]);
        expect(response().nullable).to.equal(true);
        expectOptionalLeaf(required(schemas.Optional_Leaf_, 'Optional schema'));
        const maybe = aliasBody(metadata, 'Maybe_Leaf_');
        if (maybe.dataType !== 'union') {
          throw new Error('Expected a nullable alias union');
        }
        expect(maybe.types).to.have.length(2);
        expect(maybe.types[0]).to.deep.include({ dataType: 'refAlias', refName: 'Optional_Leaf_' });
        expect(maybe.types[1]).to.deep.equal({ dataType: 'enum', enums: [null] });
      });

      it('populates a source generic mapped intersection member', () => {
        const { schemas, response, resolve } = generate('intersection', strictNullChecks);
        const members = required(response().allOf, 'intersection members');
        expect(members).to.have.length(2);
        expect(members[0].$ref).to.equal('#/components/schemas/Optional_Leaf_');
        expectOptionalLeaf(resolve(members[0]));
        expect(members[1].properties?.marker).to.deep.include({ type: 'boolean' });
        expect(members[1].required).to.deep.equal(['marker']);
        expectOptionalLeaf(required(schemas.Optional_Leaf_, 'Optional schema'));
      });

      for (const name of ['Entries', 'Rest']) {
        it(`populates mapped elements and nested arrays in a source ${name} tuple`, () => {
          const metadata = new MetadataGenerator(`${fixtureRoot}tupleController.ts`, { strictNullChecks }).Generate();
          const tuple = aliasBody(metadata, `${name}_Leaf_`);
          if (tuple.dataType !== 'tuple') {
            throw new Error(`Expected ${name} to be a tuple`);
          }
          expect(tuple.types).to.have.length(name === 'Entries' ? 2 : 1);
          expect(tuple.types[0]).to.deep.include({ dataType: 'refAlias', refName: 'Optional_Leaf_' });
          const array = required(name === 'Entries' ? tuple.types[1] : tuple.restType, 'array element');
          if (array.dataType !== 'array') {
            throw new Error('Expected a mapped array element');
          }
          expect(array.elementType).to.deep.include({ dataType: 'refAlias', refName: 'Optional_Leaf_' });
          const spec = new SpecGenerator31(metadata, getDefaultExtendedOptions()).GetSpec();
          const schemas = required(spec.components.schemas, 'component schemas');
          const schema = required(schemas[`${name}_Leaf_`], 'tuple schema');
          expect(schema.type).to.equal('array');
          expect(schema.prefixItems?.[0]).to.deep.equal({ $ref: '#/components/schemas/Optional_Leaf_' });
          expect(schema.minItems).to.equal(name === 'Entries' ? 2 : 1);
          const arraySchema = name === 'Entries' ? schema.prefixItems?.[1] : schema.items;
          expect(arraySchema).to.deep.equal({ type: 'array', items: { $ref: '#/components/schemas/Optional_Leaf_' } });
          if (name === 'Entries') {
            expect(schema.items).to.equal(false);
            expect(schema.maxItems).to.equal(2);
          } else {
            expect(schema.maxItems).to.equal(undefined);
          }
          expectOptionalLeaf(required(schemas.Optional_Leaf_, 'Optional schema'));
        });
      }

      for (const name of ['fixedFirst', 'valueFirst']) {
        it(`keeps annotated and plain number occurrences distinct with ${name} property order`, () => {
          const { schemas, response, resolve } = generate(name, strictNullChecks);
          const group = resolve(response().properties?.group);
          expect(group.properties).to.have.all.keys('fixed', 'value');
          expect(group.required).to.have.members(['fixed', 'value']);
          expect(group.properties?.fixed.$ref).to.equal('#/components/schemas/IntegerView');
          expect(group.properties?.value).to.deep.include({ type: 'number', format: 'double' });
          expect(group.properties?.value.$ref).to.equal(undefined);
          expect(group.properties?.value.description).to.equal(undefined);
          expect(group.properties?.value.default).to.equal(undefined);
          expect(schemas.IntegerView).to.deep.include({ type: 'integer', format: 'int32', default: 7, description: 'A whole count.' });
        });
      }

      it('keeps both annotated number aliases in an inferred generic union', () => {
        const { metadata, schemas, response } = generate('inferredUnion', strictNullChecks);
        expect(response().anyOf).to.deep.equal([{ type: 'string' }, { $ref: '#/components/schemas/Fraction' }, { $ref: '#/components/schemas/Whole' }]);
        expect(schemas.Fraction).to.deep.include({ type: 'number', format: 'float', description: 'A fractional count.' });
        expect(schemas.Whole).to.deep.include({ type: 'integer', format: 'int32', description: 'A whole count.' });
        const result = aliasBody(metadata, 'Result_string_');
        if (result.dataType !== 'union') {
          throw new Error('Expected a result union');
        }
        expect(result.types).to.have.length(3);
        expect(result.types[0]).to.deep.equal({ dataType: 'string' });
        expect(result.types[1]).to.deep.include({ dataType: 'refAlias', refName: 'Fraction' });
        expect(result.types[2]).to.deep.include({ dataType: 'refAlias', refName: 'Whole' });
      });

      it('keeps optional closed and bound template aliases without adding undefined', () => {
        const { metadata, schemas, response, resolve } = generate('optionalTemplates', strictNullChecks);
        const target = response();
        expect(target.properties).to.have.all.keys('closed', 'nullable', 'maybeUndefined', 'bound', 'boxed');
        expect(target.required).to.deep.equal(['boxed']);
        expect(target.properties?.closed.$ref).to.equal('#/components/schemas/ClosedTemplate');
        expect(schemas.ClosedTemplate).to.deep.include({ type: 'string', enum: ['item-one', 'item-two'], default: 'item-one', description: 'A closed template.' });
        const bound = required(target.properties?.bound, 'bound template');
        expect(bound.$ref).to.be.a('string');
        expect(resolve(bound)).to.deep.include({ type: 'string', enum: ['bound-one', 'bound-two'], default: 'bound-one', description: 'A bound template.' });
        const box = resolve(target.properties?.boxed);
        expect(box.properties?.value.$ref).to.equal('#/components/schemas/ClosedTemplate');
        expect(box.required).to.equal(undefined);
        const targetMetadata = required(metadata.referenceTypeMap.Target, 'Target metadata');
        if (targetMetadata.dataType !== 'refObject') {
          throw new Error('Expected Target object metadata');
        }
        for (const name of ['closed', 'bound']) {
          const property = required(
            targetMetadata.properties.find(value => value.name === name),
            name,
          );
          expect(property.required).to.equal(false);
          expect(property.type.dataType).to.equal('refAlias');
        }
      });

      it('keeps declared null and undefined on optional template aliases', () => {
        const { metadata, response } = generate('optionalTemplates', strictNullChecks);
        expect(response().properties?.nullable.allOf).to.deep.equal([{ $ref: '#/components/schemas/ClosedTemplate' }]);
        expect(response().properties?.nullable.nullable).to.equal(true);
        const target = required(metadata.referenceTypeMap.Target, 'Target metadata');
        if (target.dataType !== 'refObject') {
          throw new Error('Expected Target object metadata');
        }
        const nullable = required(
          target.properties.find(property => property.name === 'nullable'),
          'nullable property',
        );
        expect(nullable.required).to.equal(false);
        if (nullable.type.dataType !== 'union') {
          throw new Error('Expected a nullable template union');
        }
        expect(nullable.type.types).to.have.length(2);
        expect(nullable.type.types[0]).to.deep.include({ dataType: 'refAlias', refName: 'ClosedTemplate' });
        expect(nullable.type.types[1]).to.deep.equal({ dataType: 'enum', enums: [null] });
        expect(response().properties?.maybeUndefined.$ref).to.equal('#/components/schemas/ClosedTemplate');
        expect(response().properties?.maybeUndefined.nullable).to.equal(undefined);
        const maybeUndefined = required(
          target.properties.find(property => property.name === 'maybeUndefined'),
          'property with undefined',
        );
        expect(maybeUndefined.required).to.equal(false);
        if (maybeUndefined.type.dataType !== 'union') {
          throw new Error('Expected a template union with undefined');
        }
        expect(maybeUndefined.type.types).to.have.length(2);
        expect(maybeUndefined.type.types[0]).to.deep.include({ dataType: 'refAlias', refName: 'ClosedTemplate' });
        expect(maybeUndefined.type.types[1]).to.deep.equal({ dataType: 'undefined' });
      });

      it('keeps an inherited instance property beside a derived static property', () => {
        const { metadata, response } = generate('staticShadow', strictNullChecks);
        expect(response().properties).to.have.all.keys('value');
        expect(response().properties?.value).to.deep.include({ type: 'string' });
        expect(response().required).to.deep.equal(['value']);
        const derived = required(metadata.referenceTypeMap.Derived, 'Derived metadata');
        if (derived.dataType !== 'refObject') {
          throw new Error('Expected Derived object metadata');
        }
        expect(derived.properties.map(property => ({ name: property.name, required: property.required, type: property.type }))).to.deep.equal([
          { name: 'value', required: true, type: { dataType: 'string' } },
        ]);
      });

      for (const name of ['recursiveFractionFirst', 'recursiveWholeFirst']) {
        it(`keeps recursive forwarded number aliases distinct with ${name} property order`, () => {
          const { schemas, response, resolve } = generate(name, strictNullChecks);
          const target = response();
          expect(target.properties).to.have.all.keys('fraction', 'whole');
          expect(target.required).to.have.members(['fraction', 'whole']);
          for (const [property, alias] of [
            ['fraction', 'Fraction'],
            ['whole', 'Whole'],
          ]) {
            expect(target.properties?.[property].$ref).to.equal(`#/components/schemas/Forward_${alias}_`);
            expect(schemas[`Forward_${alias}_`].$ref).to.equal(`#/components/schemas/Node_${alias}_`);
            const node = resolve(target.properties?.[property]);
            expect(node.properties).to.have.all.keys('value', 'next');
            expect(node.required).to.deep.equal(['value']);
            expect(node.properties?.value.$ref).to.equal(`#/components/schemas/${alias}`);
            expect(node.properties?.next.$ref).to.equal(`#/components/schemas/Node_${alias}_`);
          }
          expect(schemas.Fraction).to.deep.include({ type: 'number', format: 'float' });
          expect(schemas.Whole).to.deep.include({ type: 'integer', format: 'int32' });
        });
      }

      it('keeps a declared optional generic container without an implicit undefined union', () => {
        const { metadata, schemas, response, resolve } = generate('optionalWrapper', strictNullChecks);
        const wrapper = required(metadata.referenceTypeMap.Wrapper_Leaf_, 'Wrapper metadata');
        if (wrapper.dataType !== 'refObject') {
          throw new Error('Expected Wrapper object metadata');
        }
        expect(wrapper.properties).to.have.length(1);
        expect(wrapper.properties[0].name).to.equal('value');
        expect(wrapper.properties[0].required).to.equal(false);
        expect(wrapper.properties[0].type).to.deep.include({ dataType: 'refObject', refName: 'Box_Leaf_' });
        expect(response().properties).to.have.all.keys('value');
        expect(response().required).to.equal(undefined);
        expect(response().properties?.value.$ref).to.equal('#/components/schemas/Box_Leaf_');
        const box = resolve(response().properties?.value);
        expect(box.properties).to.have.all.keys('item');
        expect(box.required).to.deep.equal(['item']);
        expect(box.properties?.item.$ref).to.equal('#/components/schemas/Leaf');
        expect(schemas.Leaf.properties).to.have.all.keys('text', 'count');
        expect(schemas.Leaf.required).to.have.members(['text', 'count']);
        expect(schemas.Leaf.properties?.text).to.deep.include({ type: 'string' });
        expect(schemas.Leaf.properties?.count).to.deep.include({ type: 'number', format: 'double' });
      });
    });
  }
});
