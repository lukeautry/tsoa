import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { SpecGenerator3 } from '@tsoa/cli/swagger/specGenerator3';
import { Swagger } from '@tsoa/runtime';
import { expect } from 'chai';
import 'mocha';
import { createProgram, flattenDiagnosticMessageText, getPreEmitDiagnostics, ModuleKind, ScriptTarget } from 'typescript';
import { getDefaultExtendedOptions } from '../../fixtures/defaultOptions';

const fixtureRoot = './fixtures/controllers/typeContextBoundaries/';
const fixtureNames = [
  'arrayOnly',
  'arrayFirst',
  'reversed',
  'rotated',
  'promise',
  'generics',
  'children',
  'heritage',
  'toJSON',
  'parameters',
  'unsupportedQueries',
  'normalization',
  'preservation',
  'declarationCollision',
  'expressionCollision',
  'unionArray',
  'unionOptional',
  'anonymousViews',
  'annotatedGroup',
  'recursiveAlias',
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
  const response = (suffix = '', method: 'get' | 'post' = 'get') => {
    const schema = required(spec.paths[`/type-context-boundaries${suffix}`][method]?.responses['200'].content?.['application/json'].schema, 'response schema');
    return schema.$ref ? resolve(schema) : schema;
  };
  return { metadata, spec, schemas, resolve, response };
}

function expectOptionalLeaf(schema: Swagger.Schema3, properties: Record<string, string>) {
  expect(schema.properties, 'concrete mapped properties').to.have.all.keys(Object.keys(properties));
  for (const [name, type] of Object.entries(properties)) {
    expect(schema.properties?.[name].type, name).to.equal(type);
  }
  expect(schema.required, 'mapped properties stay optional').to.equal(undefined);
}

describe('Type context at child and entry boundaries', () => {
  for (const strictNullChecks of [false, true]) {
    describe(`strictNullChecks=${strictNullChecks}`, () => {
      it('uses fixtures without TypeScript diagnostics', () => {
        const program = createProgram(
          fixtureNames.map(name => `${fixtureRoot}${name}Controller.ts`),
          { strictNullChecks, experimentalDecorators: true, target: ScriptTarget.ES2021, module: ModuleKind.CommonJS, skipLibCheck: true, noEmit: true },
        );
        expect(getPreEmitDiagnostics(program).map(diagnostic => flattenDiagnosticMessageText(diagnostic.messageText, '\n'))).to.deep.equal([]);
      });

      it('resolves Array<T> items when the root has no direct mapped child', () => {
        const { response, resolve } = generate('arrayOnly', strictNullChecks);
        const list = required(response().properties?.list, 'list');
        expect(list.type).to.equal('array');
        expectOptionalLeaf(resolve(list.items), { text: 'string', count: 'number' });
      });

      for (const name of ['arrayFirst', 'reversed', 'rotated']) {
        it(`keeps Array<T> and readonly array items with ${name} property order`, () => {
          const { response, resolve } = generate(name, strictNullChecks);
          const root = response();
          for (const propertyName of ['list', 'readonlyList']) {
            const list = required(root.properties?.[propertyName], propertyName);
            expect(list.type, propertyName).to.equal('array');
            expectOptionalLeaf(resolve(list.items), { text: 'string', count: 'number' });
          }
          expectOptionalLeaf(resolve(root.properties?.nested), { text: 'string', count: 'number' });
        });
      }

      it('unwraps Promise<Array<T>> without losing the mapped element', () => {
        const { response, resolve } = generate('promise', strictNullChecks);
        const array = response();
        expect(array.type).to.equal('array');
        expectOptionalLeaf(resolve(array.items), { text: 'string', count: 'number' });
      });

      for (const [path, propertyName, type] of [
        ['/default', 'defaultValue', 'string'],
        ['/forwarded', 'forwardedValue', 'number'],
        ['/shadowed', 'shadowedValue', 'boolean'],
      ]) {
        it(`retains the captured generic scope for ${path}`, () => {
          const { response, resolve } = generate('generics', strictNullChecks);
          expectOptionalLeaf(resolve(response(path).properties?.value), { [propertyName]: type });
        });
      }

      it('projects mapped children of a computed type literal', () => {
        const { response, resolve } = generate('children', strictNullChecks);
        const literal = required(response().properties?.literal, 'type literal');
        expect(literal.required).to.deep.equal(['child']);
        expectOptionalLeaf(resolve(literal.properties?.child), { literalValue: 'string' });
      });

      it('projects mapped values of a computed index signature', () => {
        const { response, resolve } = generate('children', strictNullChecks);
        const dictionary = resolve(response().properties?.index);
        const values = required(dictionary.additionalProperties, 'index values');
        if (typeof values === 'boolean') {
          throw new Error('Expected a schema for index values');
        }
        expectOptionalLeaf(resolve(values), { indexValue: 'number' });
      });

      it('keeps mapped children reached through indexed access', () => {
        const { response, resolve } = generate('children', strictNullChecks);
        expectOptionalLeaf(resolve(response().properties?.access), { accessValue: 'boolean' });
      });

      it('projects mapped children reached through a string keyword index', () => {
        const { response } = generate('children', strictNullChecks);
        expectOptionalLeaf(response('/keyword'), { keywordValue: 'string' });
      });

      it('projects mapped children reached through a matching keyof index', () => {
        const { response } = generate('children', strictNullChecks);
        expectOptionalLeaf(response('/keyof'), { keyofValue: 'number' });
      });

      it('keeps concrete mapped index values', () => {
        const { response, resolve } = generate('children', strictNullChecks);
        const values = required(response('/mapped-index').additionalProperties, 'mapped index values');
        if (typeof values === 'boolean') {
          throw new Error('Expected a schema for mapped index values');
        }
        expectOptionalLeaf(resolve(values), { mappedIndexValue: 'boolean' });
      });

      for (const [path, propertyName, type, description] of [
        ['/interface', 'interfaceValue', 'string', 'Inherited interface value.'],
        ['/class', 'classValue', 'number', 'Inherited class value.'],
      ]) {
        it(`instantiates inherited ${path} properties and excludes heritage-only bases`, () => {
          const { response, resolve, schemas } = generate('heritage', strictNullChecks);
          const derived = response(path);
          const value = required(derived.properties?.value, 'inherited value');
          expect(value.description).to.equal(description);
          expect(derived.required).to.include('value');
          expectOptionalLeaf(resolve(value), { [propertyName]: type });
          expect(Object.keys(schemas).filter(name => name === 'Base' || name.startsWith('Base_') || name === 'BaseClass' || name.startsWith('BaseClass_'))).to.deep.equal([]);
        });
      }

      for (const [path, propertyName, type] of [
        ['/explicit', 'explicitValue', 'string'],
        ['/inferred', 'inferredValue', 'number'],
      ]) {
        it(`uses the concrete generic ${path} toJSON result`, () => {
          const { response } = generate('toJSON', strictNullChecks);
          expectOptionalLeaf(response(path), { [propertyName]: type });
        });
      }

      it('retains the inferred type of a body parameter with a default', () => {
        const { spec, resolve } = generate('parameters', strictNullChecks);
        const body = required(spec.paths['/type-context-boundaries/body'].post?.requestBody, 'body');
        expect(body.required).to.equal(false);
        expectOptionalLeaf(resolve(body.content['application/json'].schema), { bodyValue: 'string' });
      });

      it('expands inferred mapped Queries properties', () => {
        const { spec } = generate('parameters', strictNullChecks);
        const parameters = required(spec.paths['/type-context-boundaries/queries'].get?.parameters, 'query parameters');
        expect(parameters.map(parameter => parameter.name)).to.have.members(['search', 'limit']);
        for (const parameter of parameters) {
          expect(parameter.in).to.equal('query');
          expect(parameter.required).to.equal(false);
          expect(parameter.schema?.type).to.equal(parameter.name === 'search' ? 'string' : 'number');
        }
      });

      it('keeps named nested Queries outside the supported query types', () => {
        expect(() => generate('unsupportedQueries', strictNullChecks)).to.throw("@Queries('values') nested property 'nested' Can't support 'refObject' type.");
      });

      it('keeps source boolean and single-member enum occurrences distinct', () => {
        const { response, schemas, metadata } = generate('normalization', strictNullChecks);
        const source = response('/source');
        expect(source.properties?.keyword.type).to.equal('boolean');
        expect(source.properties?.keyword.enum).to.equal(undefined);
        expect(source.properties?.literals.type).to.equal('boolean');
        expect(source.properties?.literals.enum).to.deep.equal([true, false]);
        expect(source.properties?.whole.$ref).to.equal('#/components/schemas/Single');
        expect(source.properties?.member.$ref).to.equal('#/components/schemas/Single.Only');
        expect(schemas.Single).to.deep.include({ enum: ['only'], type: 'string' });
        expect(schemas['Single.Only']).to.deep.include({ enum: ['only'], type: 'string' });
        const whole = required(metadata.referenceTypeMap.Single, 'whole enum metadata');
        const member = required(metadata.referenceTypeMap['Single.Only'], 'enum member metadata');
        if (whole.dataType !== 'refEnum' || member.dataType !== 'refEnum') {
          throw new Error('Expected named enum metadata');
        }
        expect(whole.enumVarnames).to.deep.equal(['Only']);
        expect(member.enumVarnames).to.deep.equal(['Only']);
      });

      it('keeps existing computed boolean and single-member enum normalization', () => {
        const { response } = generate('normalization', strictNullChecks);
        const computed = response('/computed');
        expect(computed.properties?.keyword.type).to.equal('boolean');
        expect(computed.properties?.keyword.enum).to.equal(undefined);
        expect(computed.properties?.literals.type).to.equal('boolean');
        expect(computed.properties?.literals.enum).to.equal(undefined);
        expect(computed.properties?.whole.$ref).to.equal('#/components/schemas/Single');
        expect(computed.properties?.member.$ref).to.equal('#/components/schemas/Single');
      });

      it('keeps both annotated source Box<T> views after compiler normalization', () => {
        const { schemas, response } = generate('preservation', strictNullChecks);
        expect(response('/boxes').anyOf).to.deep.equal([{ $ref: '#/components/schemas/Box_IntegerView_' }, { $ref: '#/components/schemas/Box_FloatView_' }]);
        expect(schemas.Box_IntegerView_.properties?.value.$ref).to.equal('#/components/schemas/IntegerView');
        expect(schemas.Box_FloatView_.properties?.value.$ref).to.equal('#/components/schemas/FloatView');
        expect(schemas.Box_IntegerView_.required).to.deep.equal(['value']);
        expect(schemas.Box_FloatView_.required).to.deep.equal(['value']);
        expect(schemas.IntegerView).to.deep.include({ type: 'integer', format: 'int32', default: 3, description: 'Integer description.' });
        expect(schemas.FloatView).to.deep.include({ type: 'number', format: 'float', default: 4.5, description: 'Float description.' });
      });

      it('keeps the named Pair alias and member order in a computed mapped union', () => {
        const { response, schemas } = generate('preservation', strictNullChecks);
        const value = required(response('/pair').properties?.value, 'mapped union');
        expect(value.anyOf).to.deep.equal([{ type: 'number', format: 'double' }, { $ref: '#/components/schemas/Pair' }]);
        expect(value.nullable).to.equal(strictNullChecks ? true : undefined);
        expect(schemas.Pair.anyOf).to.deep.equal([{ $ref: '#/components/schemas/Left' }, { $ref: '#/components/schemas/Right' }]);
      });

      it('keeps both populated branches of a computed array union', () => {
        const { response } = generate('unionArray', strictNullChecks);
        expect(response('/array-union').properties?.value.anyOf).to.deep.equal([
          { type: 'array', items: { type: 'string' } },
          { type: 'array', items: { type: 'number', format: 'double' } },
        ]);
      });

      it('populates both branches of a computed Optional union', () => {
        const { response, schemas } = generate('unionOptional', strictNullChecks);
        expect(response('/optional-union', 'post').properties?.value.anyOf).to.deep.equal([{ $ref: '#/components/schemas/Optional_Left_' }, { $ref: '#/components/schemas/Optional_Right_' }]);
        expectOptionalLeaf(schemas.Optional_Left_, { left: 'string' });
        expectOptionalLeaf(schemas.Optional_Right_, { right: 'number' });
      });

      it('keeps the two source Box views and their distinct annotations', () => {
        const { response, resolve } = generate('anonymousViews', strictNullChecks);
        const views = response('/anonymous-source').properties?.value.anyOf;
        expect(views).to.have.length(2);
        const properties = views?.map(view => resolve(view).properties?.value.properties?.value);
        expect(properties?.[0]).to.deep.include({ type: 'integer', format: 'int32', description: 'Integer property description.', default: 3 });
        expect(properties?.[1]).to.deep.include({ type: 'number', format: 'float', description: 'Float property description.', default: 4.5 });
      });

      it('preserves the closed annotated Box source view through a computed alias', () => {
        const { response, schemas } = generate('annotatedGroup', strictNullChecks);
        const value = required(response('/annotated-group').properties?.value, 'annotated value');
        expect(value.anyOf).to.deep.equal([{ type: 'number', format: 'double' }, { $ref: '#/components/schemas/Annotated_Left.Left_' }]);
        expect(value.nullable).to.equal(strictNullChecks ? true : undefined);
        expect(schemas['Annotated_Left.Left_'].anyOf).to.deep.equal([{ $ref: '#/components/schemas/Box_IntegerView_' }, { $ref: '#/components/schemas/Optional_Left_' }]);
        expect(schemas.Box_IntegerView_.properties?.value.$ref).to.equal('#/components/schemas/IntegerView');
        expect(schemas.IntegerView).to.deep.include({ type: 'integer', format: 'int32', default: 3, description: 'Integer description.' });
        expect(schemas.Box_number_).to.equal(undefined);
      });

      it('emits a named recursive alias reference for array items', () => {
        const { spec, schemas } = generate('recursiveAlias', strictNullChecks);
        const root = required(spec.paths['/type-context-boundaries/recursive-alias'].get?.responses['200'].content?.['application/json'].schema, 'recursive alias response schema');
        expect(root.$ref).to.equal('#/components/schemas/Recursive');
        expect(schemas.Recursive.anyOf).to.deep.equal([{ type: 'string' }, { type: 'array', items: { $ref: '#/components/schemas/Recursive' } }]);
      });

      it('keeps the current single plain-double Box view for a computed anonymous union', () => {
        const { response, resolve } = generate('anonymousViews', strictNullChecks);
        const box = resolve(response('/anonymous-computed').properties?.value);
        const value = required(box.properties?.value.properties?.value, 'computed value');
        expect(value).to.deep.include({ type: 'number', format: 'double' });
        expect(value.description).to.equal(undefined);
        expect(value.default).to.equal(undefined);
      });

      it('rejects different declarations that use the same output model name', () => {
        expect(() => generate('declarationCollision', strictNullChecks)).to.throw('Found 2 different model definitions for model Same');
      });

      it('rejects different type expressions that format to the same schema name', () => {
        expect(() => generate('expressionCollision', strictNullChecks)).to.throw('Found 2 different type expressions for formatted name "Box_Value_"');
      });
    });
  }
});
