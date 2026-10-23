import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { SpecGenerator3 } from '@tsoa/cli/swagger/specGenerator3';
import { Swagger, Tsoa } from '@tsoa/runtime';
import { expect } from 'chai';
import 'mocha';
import { createProgram, flattenDiagnosticMessageText, getPreEmitDiagnostics, ModuleKind, ScriptTarget } from 'typescript';
import { getDefaultExtendedOptions } from '../../fixtures/defaultOptions';

const fixtureRoot = './fixtures/controllers/typeContextHeritage/';
const fixtureNames = ['direct', 'interface', 'class', 'generic', 'objectGeneric', 'sibling', 'baseFirst', 'derivedFirst'];

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
  const response = (suffix = '') => required(spec.paths[`/type-context-heritage${suffix}`].get?.responses['200'].content?.['application/json'].schema, 'response schema');
  return { metadata, schemas, response };
}

function expectFields(schema: Swagger.Schema3, names: string[], requiredNames: string[] = []) {
  expect(schema.properties, 'emitted properties').to.have.all.keys(names);
  if (requiredNames.length) {
    expect(schema.required, 'required properties').to.have.members(requiredNames);
    expect(schema.required, 'required properties occur once').to.have.length(requiredNames.length);
  } else {
    expect(schema.required, 'all properties stay optional').to.equal(undefined);
  }
}

function expectLeftBase(schema: Swagger.Schema3) {
  expectFields(schema, ['left', 'amount', 'shared']);
  expect(schema.properties?.left).to.deep.include({ type: 'string' });
  expect(schema.properties?.amount).to.deep.include({ type: 'number', format: 'double' });
  expect(schema.properties?.shared).to.deep.include({ type: 'string' });
}

function expectRightBase(schema: Swagger.Schema3) {
  expectFields(schema, ['right', 'shared']);
  expect(schema.properties?.right).to.deep.include({ type: 'number', format: 'double' });
  expect(schema.properties?.shared).to.deep.include({ type: 'string' });
}

function expectDerived(schema: Swagger.Schema3) {
  expectFields(schema, ['left', 'amount', 'shared', 'extra'], ['extra']);
  expect(schema.properties?.left).to.deep.include({ type: 'string' });
  expect(schema.properties?.amount).to.deep.include({ type: 'number', format: 'double' });
  expect(schema.properties?.shared).to.deep.include({ type: 'string' });
  expect(schema.properties?.extra).to.deep.include({ type: 'string' });
}

function expectClass(schema: Swagger.Schema3) {
  expectFields(schema, ['left', 'amount', 'shared', 'classExtra']);
  expect(schema.properties?.left).to.deep.include({ type: 'string' });
  expect(schema.properties?.amount).to.deep.include({ type: 'number', format: 'double' });
  expect(schema.properties?.shared).to.deep.include({ type: 'string' });
  expect(schema.properties?.classExtra).to.deep.include({ type: 'boolean', default: true });
}

function expectGeneric(schemas: Record<string, Swagger.Schema3>, name = 'Generic_Left_') {
  expectFields(schemas[name], ['value', 'extra'], ['extra']);
  expect(schemas[name].properties?.value).to.deep.include({ $ref: '#/components/schemas/Left' });
  expect(schemas[name].properties?.extra).to.deep.include({ type: 'string' });
  expectFields(schemas.Left, ['left', 'amount', 'shared'], ['left', 'amount']);
  expect(schemas.Left.properties?.left).to.deep.include({ type: 'string' });
  expect(schemas.Left.properties?.amount).to.deep.include({ type: 'number', format: 'double' });
  expect(schemas.Left.properties?.shared).to.deep.include({ type: 'string' });
}

function expectSibling(schema: Swagger.Schema3) {
  expectFields(schema, ['left', 'amount', 'shared', 'right', 'extra'], ['shared', 'extra']);
  expect(schema.properties?.left).to.deep.include({ type: 'string' });
  expect(schema.properties?.amount).to.deep.include({ type: 'number', format: 'double' });
  expect(schema.properties?.right).to.deep.include({ type: 'number', format: 'double' });
  expect(schema.properties?.shared).to.deep.include({ type: 'string', enum: ['own'] });
  expect(schema.properties?.extra).to.deep.include({ type: 'boolean' });
}

function expectMetadataFields(metadata: Tsoa.Metadata, name: string, names: string[]) {
  let type: Tsoa.Type = required(metadata.referenceTypeMap[name], name);
  while (type.dataType === 'refAlias') {
    type = type.type;
  }
  if (type.dataType !== 'refObject' && type.dataType !== 'nestedObjectLiteral') {
    throw new Error(`Expected ${name} to have object properties`);
  }
  const actual = type.properties.map(property => property.name);
  expect(actual, `${name} metadata properties`).to.have.members(names);
  expect(actual, `${name} metadata properties occur once`).to.have.length(names.length);
}

describe('Mapped alias heritage', () => {
  for (const strictNullChecks of [false, true]) {
    describe(`strictNullChecks=${strictNullChecks}`, () => {
      it('uses fixtures without TypeScript diagnostics', () => {
        const program = createProgram(
          fixtureNames.map(name => `${fixtureRoot}${name}Controller.ts`),
          { strict: false, strictNullChecks, experimentalDecorators: true, target: ScriptTarget.ES2021, module: ModuleKind.CommonJS, skipLibCheck: true, noEmit: true },
        );
        expect(getPreEmitDiagnostics(program).map(diagnostic => flattenDiagnosticMessageText(diagnostic.messageText, '\n'))).to.deep.equal([]);
      });

      it('keeps direct mapped bases concrete and optional', () => {
        const { metadata, schemas, response } = generate('direct', strictNullChecks);
        expect(response('/left')).to.deep.include({ $ref: '#/components/schemas/Base_Left_' });
        expect(response('/right')).to.deep.include({ $ref: '#/components/schemas/Base_Right_' });
        expectLeftBase(schemas.Base_Left_);
        expectRightBase(schemas.Base_Right_);
        expectMetadataFields(metadata, 'Base_Left_', ['left', 'amount', 'shared']);
        expectMetadataFields(metadata, 'Base_Right_', ['right', 'shared']);
      });

      it('inherits a closed mapped base in an interface', () => {
        const { metadata, schemas, response } = generate('interface', strictNullChecks);
        expect(response()).to.deep.include({ $ref: '#/components/schemas/Derived' });
        expectDerived(schemas.Derived);
        expectMetadataFields(metadata, 'Derived', ['left', 'amount', 'shared', 'extra']);
      });

      it('emits mapped implements fields once in a class', () => {
        const { metadata, schemas, response } = generate('class', strictNullChecks);
        expect(response()).to.deep.include({ $ref: '#/components/schemas/DerivedClass' });
        expectClass(schemas.DerivedClass);
        expectMetadataFields(metadata, 'DerivedClass', ['left', 'amount', 'shared', 'classExtra']);
      });

      it('resolves a generic base with statically known mapped keys', () => {
        const { metadata, schemas, response } = generate('generic', strictNullChecks);
        expect(response()).to.deep.include({ $ref: '#/components/schemas/Generic_Left_' });
        expectGeneric(schemas);
        expectMetadataFields(metadata, 'Generic_Left_', ['value', 'extra']);
      });

      it('resolves statically known keys inside a generic mapped alias argument', () => {
        const { metadata, schemas, response } = generate('objectGeneric', strictNullChecks);
        expect(response()).to.deep.include({ $ref: '#/components/schemas/ObjectGeneric_Left_' });
        expectGeneric(schemas, 'ObjectGeneric_Left_');
        expectMetadataFields(metadata, 'ObjectGeneric_Left_', ['value', 'extra']);
      });

      it('keeps a two-base own override and excludes duplicate inherited fields', () => {
        const { metadata, schemas, response } = generate('sibling', strictNullChecks);
        expect(response()).to.deep.include({ $ref: '#/components/schemas/Sibling' });
        expectSibling(schemas.Sibling);
        expectMetadataFields(metadata, 'Sibling', ['left', 'amount', 'shared', 'right', 'extra']);
      });

      for (const name of ['baseFirst', 'derivedFirst']) {
        it(`keeps bases, own overrides and generic references with ${name} property order`, () => {
          const { metadata, schemas, response } = generate(name, strictNullChecks);
          const rootName = name === 'baseFirst' ? 'BaseFirst' : 'DerivedFirst';
          expect(response()).to.deep.include({ $ref: `#/components/schemas/${rootName}` });
          expectFields(schemas[rootName], ['leftBase', 'rightBase', 'derived', 'classDerived', 'generic', 'sibling'], ['leftBase', 'rightBase', 'derived', 'classDerived', 'generic', 'sibling']);
          expect(schemas[rootName].properties?.leftBase).to.deep.include({ $ref: '#/components/schemas/Base_Left_' });
          expect(schemas[rootName].properties?.rightBase).to.deep.include({ $ref: '#/components/schemas/Base_Right_' });
          expect(schemas[rootName].properties?.derived).to.deep.include({ $ref: '#/components/schemas/Derived' });
          expect(schemas[rootName].properties?.classDerived).to.deep.include({ $ref: '#/components/schemas/DerivedClass' });
          expect(schemas[rootName].properties?.generic).to.deep.include({ $ref: '#/components/schemas/Generic_Left_' });
          expect(schemas[rootName].properties?.sibling).to.deep.include({ $ref: '#/components/schemas/Sibling' });
          expectLeftBase(schemas.Base_Left_);
          expectRightBase(schemas.Base_Right_);
          expectDerived(schemas.Derived);
          expectClass(schemas.DerivedClass);
          expectGeneric(schemas);
          expectSibling(schemas.Sibling);
          expectMetadataFields(metadata, 'Base_Left_', ['left', 'amount', 'shared']);
          expectMetadataFields(metadata, 'Base_Right_', ['right', 'shared']);
          expectMetadataFields(metadata, 'Derived', ['left', 'amount', 'shared', 'extra']);
          expectMetadataFields(metadata, 'DerivedClass', ['left', 'amount', 'shared', 'classExtra']);
          expectMetadataFields(metadata, 'Generic_Left_', ['value', 'extra']);
          expectMetadataFields(metadata, 'Sibling', ['left', 'amount', 'shared', 'right', 'extra']);
        });
      }
    });
  }
});
