import { GenerateMetadataError } from '@tsoa/cli/metadataGeneration/exceptions';
import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { SpecGenerator3 } from '@tsoa/cli/swagger/specGenerator3';
import { SpecGenerator31 } from '@tsoa/cli/swagger/specGenerator31';
import { Swagger, Tsoa } from '@tsoa/runtime';
import { expect } from 'chai';
import * as fs from 'fs';
import 'mocha';
import { CompilerOptions, createProgram, flattenDiagnosticMessageText, getPreEmitDiagnostics, ModuleKind, ScriptTarget } from 'typescript';
import { getDefaultExtendedOptions } from '../../fixtures/defaultOptions';

const fixtureRoot = './fixtures/controllers/';
const syntheticRoot = `${fixtureRoot}syntheticChildren/`;

type Schema = Swagger.Schema31;
type Operations = Record<string, Partial<Record<string, Swagger.Operation31>>>;
type SchemaSlot = Schema | boolean | undefined;

const asSchema = (slot: SchemaSlot) => (typeof slot === 'object' ? slot : undefined);

type Resolve = (schema: Schema | undefined) => Schema;

interface Generated {
  metadata: Tsoa.Metadata;
  schemas: Record<string, Schema>;
  resolve: Resolve;
  response: (path: string, method?: string) => Schema;
  body: (path: string, method: string) => Schema;
}

interface Run {
  strictNullChecks: boolean;
  compilerOptions: CompilerOptions;
  generate: (controller?: string) => Generated;
}

interface Row {
  name: string;
  controller: string;
  openapi?: '3.1';
  modes?: CompilerOptions[];
  check: (run: Run) => void;
}

const nullModes: CompilerOptions[] = [{ strictNullChecks: false }, { strictNullChecks: true }];
const exactMode: CompilerOptions = { strictNullChecks: true, exactOptionalPropertyTypes: true };

function required<T>(value: T | undefined, name: string): T {
  if (value === undefined) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function generate(controller: string, compilerOptions: CompilerOptions, openapi?: '3.1'): Generated {
  const metadata = new MetadataGenerator(`${fixtureRoot}${controller}.ts`, compilerOptions).Generate();
  const options = getDefaultExtendedOptions();
  const generated = openapi ? new SpecGenerator31(metadata, options).GetSpec() : new SpecGenerator3(metadata, options).GetSpec();
  const spec = JSON.parse(JSON.stringify(generated)) as Swagger.Spec3;
  const schemas = required(spec.components.schemas, 'component schemas') as Record<string, Schema>;
  const paths = spec.paths as Operations;
  const operation = (path: string, method: string) => required(paths[path]?.[method], `${method} ${path}`);
  const resolve: Resolve = schema => {
    const value = required(schema, 'schema');
    if (value.$ref) {
      return resolve(required(schemas[value.$ref.replace('#/components/schemas/', '')], value.$ref));
    }
    return value.allOf?.length === 1 ? resolve(value.allOf[0]) : value;
  };
  return {
    metadata,
    schemas,
    resolve,
    response: (path, method = 'get') => required(operation(path, method).responses['200'].content?.['application/json']?.schema, `response of ${method} ${path}`),
    body: (path, method) => required(operation(path, method).requestBody?.content['application/json']?.schema, `body of ${method} ${path}`),
  };
}

function refAlias(metadata: Tsoa.Metadata, name: string): Tsoa.RefAliasType {
  const alias = required(metadata.referenceTypeMap[name], name);
  if (alias.dataType !== 'refAlias') {
    throw new Error(`${name} is not an alias`);
  }
  return alias;
}

function expectOptionalLeaf(schema: Schema, properties: Record<string, string>) {
  expect(Object.keys(schema.properties ?? {}), 'leaf properties').to.have.members(Object.keys(properties));
  for (const [name, type] of Object.entries(properties)) {
    expect(schema.properties?.[name].type, name).to.equal(type);
  }
  expect(schema.required, 'mapped properties stay optional').to.equal(undefined);
}

const optionalMember = (name: string, type: Tsoa.Type): Tsoa.Property => ({ name, required: false, deprecated: false, type, validators: {}, extensions: [] });

const leafObject = (withUndefined: boolean): Tsoa.NestedObjectLiteralType => {
  const orUndefined = (type: Tsoa.Type): Tsoa.Type => (withUndefined ? { dataType: 'union', types: [type, { dataType: 'undefined' }] } : type);
  return { dataType: 'nestedObjectLiteral', properties: [optionalMember('text', orUndefined({ dataType: 'string' })), optionalMember('count', orUndefined({ dataType: 'double' }))] };
};

const leafSchema: Schema = { type: 'object', properties: { text: { type: 'string' }, count: { type: 'number', format: 'double' } } };

const ref = (name: string) => `#/components/schemas/${name}`;
const route = (name: string) => `/synthetic-children/${name}`;

function roleRow(name: string, controller: string, path: string, leaf: string, properties: Record<string, string>, locate: (response: Schema, resolve: Resolve) => SchemaSlot, openapi?: '3.1'): Row {
  return {
    name,
    controller: `syntheticChildren/${controller}Controller`,
    openapi,
    check: ({ generate }) => {
      const { response, resolve } = generate();
      const child = required(asSchema(locate(response(route(path)), resolve)), 'child schema');
      expect(child.$ref).to.equal(ref(`Optional_${leaf}_`));
      expectOptionalLeaf(resolve(child), properties);
    },
  };
}

const memberOf = (response: Schema, resolve: Resolve, name = 'value') => required(resolve(response).properties?.[name], `${name} property`);
const refMember = (schemas: Schema[] | undefined) => schemas?.find(member => member.$ref);

function expectLevel(schema: Schema, keys: string[], nullable: boolean) {
  expect(Object.keys(schema.properties ?? {})).to.deep.equal(keys);
  expect(schema.required).to.equal(undefined);
  for (const key of keys) {
    expect(schema.properties?.[key].nullable, `nullable ${key}`).to.equal(nullable ? true : undefined);
  }
}

function recursiveRow(alias: 'DeepPartial' | 'MergePatch'): Row {
  return {
    name: `${alias} keeps every nested property, optional${alias === 'MergePatch' ? ', and null where the type has it' : ''}`,
    controller: 'recursiveMappedTypeController',
    modes: [...nullModes, exactMode],
    check: ({ generate, strictNullChecks }) => {
      const { body, resolve } = generate();
      const nullable = alias === 'MergePatch' && strictNullChecks;
      const target = resolve(body(`/RecursiveMappedType/${alias}`, 'patch'));
      expectLevel(target, ['a', 'nested'], nullable);
      const nested = resolve(target.properties?.nested);
      expectLevel(nested, ['b', 'deeper'], nullable);
      const deeper = resolve(nested.properties?.deeper);
      expectLevel(deeper, ['c'], nullable);
    },
  };
}

const preservationRow = (name: string, check: (generated: Generated, strictNullChecks: boolean) => void): Row => ({
  name: `keeps ${name} as before`,
  controller: 'syntheticChildren/preservationController',
  openapi: '3.1',
  check: ({ generate, strictNullChecks }) => check(generate(), strictNullChecks),
});

const aliasWithoutUndefinedRow = (name: string, controllers: string[]): Row => ({
  name,
  controller: `syntheticChildren/${controllers[0]}Controller`,
  openapi: '3.1',
  modes: [exactMode],
  check: ({ generate }) => {
    for (const controller of controllers) {
      const alias = refAlias(generate(`syntheticChildren/${controller}Controller`).metadata, 'Optional_Leaf_');
      expect(alias.type.dataType, controller).to.equal('nestedObjectLiteral');
      expect(JSON.stringify(alias.type), controller).to.not.include('"dataType":"undefined"');
    }
  },
});

const rows: Row[] = [
  roleRow('array item', 'roles', 'array', 'ArrayLeaf', { arrayValue: 'string' }, (response, resolve) => memberOf(response, resolve).items),
  roleRow('readonly array item', 'roles', 'readonly-array', 'ReadonlyLeaf', { readonlyValue: 'string' }, (response, resolve) => memberOf(response, resolve).items),
  roleRow('ReadonlyArray<T> item', 'roles', 'readonly-generic-array', 'ReadonlyGenericLeaf', { readonlyGenericValue: 'string' }, (response, resolve) => memberOf(response, resolve).items),
  roleRow('tuple element', 'tuples', 'tuple', 'TupleLeaf', { tupleValue: 'string' }, (response, resolve) => memberOf(response, resolve, 'pair').prefixItems?.[0], '3.1'),
  roleRow('named tuple element', 'tuples', 'named-tuple', 'NamedLeaf', { namedValue: 'string' }, (response, resolve) => memberOf(response, resolve, 'named').prefixItems?.[0], '3.1'),
  roleRow('tuple rest element', 'tuples', 'tuple-rest', 'RestLeaf', { restValue: 'string' }, (response, resolve) => memberOf(response, resolve, 'rest').items, '3.1'),
  roleRow(
    'tuple rest of arrays',
    'tuples',
    'tuple-rest-arrays',
    'RestArrayLeaf',
    { restArrayValue: 'string' },
    (response, resolve) => {
      const items = required(asSchema(memberOf(response, resolve, 'rest').items), 'rest items');
      expect(items.type).to.equal('array');
      return items.items;
    },
    '3.1',
  ),
  roleRow('type literal member', 'roles', 'member', 'MemberLeaf', { memberValue: 'string' }, (response, resolve) => memberOf(response, resolve).properties?.child),
  roleRow('string index value', 'roles', 'index', 'IndexLeaf', { indexValue: 'number' }, (response, resolve) => memberOf(response, resolve).additionalProperties),
  roleRow('union member', 'roles', 'union', 'UnionLeaf', { unionValue: 'string' }, (response, resolve) => refMember(memberOf(response, resolve).anyOf)),
  roleRow('intersection member', 'roles', 'intersection', 'IntersectionLeaf', { intersectionValue: 'string' }, (response, resolve) => refMember(memberOf(response, resolve).allOf)),
  roleRow('indexed access by string keyword', 'roles', 'indexed-keyword', 'KeywordLeaf', { keywordValue: 'string' }, response => response),
  roleRow('indexed access by literal', 'roles', 'indexed-literal', 'LiteralLeaf', { literalValue: 'boolean' }, response => response),
  roleRow('indexed access by keyof', 'roles', 'indexed-keyof', 'KeyofLeaf', { keyofValue: 'number' }, response => refMember(response.anyOf)),
  {
    name: 'gives identical schemas whether arrays or nested objects come first',
    controller: 'syntheticChildren/orderArrayFirstController',
    check: ({ generate }) => {
      const runs = ['orderArrayFirst', 'orderNestedFirst', 'orderRotated'].map(order => generate(`syntheticChildren/${order}Controller`));
      for (const { response, resolve } of runs) {
        const target = resolve(response('/synthetic-children'));
        const nested = required(target.properties?.nested, 'nested');
        for (const list of ['list', 'plainList', 'readonlyList', 'readonlyGenericList']) {
          expect(target.properties?.[list].type, list).to.equal('array');
          expect(asSchema(target.properties?.[list].items)?.$ref, list).to.equal(nested.$ref);
        }
        expectOptionalLeaf(resolve(nested), { text: 'string', count: 'number' });
        expectOptionalLeaf(resolve(target.properties?.joint), { left: 'string', right: 'number' });
      }
      expect(runs[1].schemas).to.deep.equal(runs[0].schemas);
      expect(runs[2].schemas).to.deep.equal(runs[0].schemas);
    },
  },
  {
    name: 'tells apart members that two namespaces declare with the same names',
    controller: 'syntheticChildren/namespacesController',
    check: ({ generate }) => {
      const { response, resolve } = generate();
      const members = required(resolve(response('/synthetic-children')).properties?.value.anyOf, 'union members');
      const leaves = members.map(member => resolve(member));
      expect(leaves.map(leaf => Object.keys(leaf.properties ?? {}))).to.deep.equal([['a'], ['b']]);
      expect(leaves[0].properties?.a.type).to.equal('string');
      expect(leaves[1].properties?.b.type).to.equal('number');
      expect(leaves.every(leaf => leaf.required === undefined)).to.equal(true);
    },
  },
  {
    name: 'keeps a project Array and ReadonlyArray interface as objects',
    controller: 'syntheticChildren/ownArraysController',
    check: ({ generate }) => {
      const { schemas, response, resolve } = generate();
      const holder = resolve(response('/synthetic-children'));
      expect(holder.properties?.chain.$ref).to.equal(ref('Chain_Leaf_'));
      expect(holder.properties?.frozen.$ref).to.equal(ref('FrozenChain_Leaf_'));
      expect(schemas.Chain_Leaf_).to.deep.include({ type: 'object' });
      expect(schemas.Chain_Leaf_.properties).to.have.all.keys('head', 'tail');
      expect(schemas.FrozenChain_Leaf_).to.deep.include({ type: 'object' });
      expect(schemas.FrozenChain_Leaf_.properties).to.have.all.keys('front', 'rest');

      const mapped = resolve(response(route('mapped')));
      expect(mapped.properties?.frozen.$ref).to.equal(ref('FrozenChain_Leaf_'));
      expect(schemas).to.not.have.property('ReadonlyArray_Leaf_');
    },
  },
  {
    name: 'generates a member next to a computed property name',
    controller: 'syntheticChildren/computedNameController',
    check: ({ generate }) => {
      const { schemas, response, resolve } = generate();
      const value = memberOf(response('/synthetic-children'), resolve);
      expect(value.properties?.child.$ref).to.equal(ref('Optional_Leaf_'));
      expectOptionalLeaf(schemas.Optional_Leaf_, { text: 'string' });
    },
  },
  {
    name: 'gives identical schemas for optional members whatever their order',
    controller: 'syntheticChildren/exactInnerFirstController',
    modes: [...nullModes, exactMode],
    check: ({ generate }) => {
      const runs = ['exactInnerFirst', 'exactSecondFirst'].map(order => generate(`syntheticChildren/${order}Controller`));
      for (const { schemas, response, resolve } of runs) {
        const members = required(memberOf(response('/synthetic-children'), resolve, 'lit').properties, 'literal members');
        expect(members.inner.$ref).to.equal(ref('Optional_Leaf_'));
        expect(members.second.$ref).to.equal(ref('Optional_Leaf_'));
        expectOptionalLeaf(schemas.Optional_Leaf_, { text: 'string' });
      }
      expect(runs[1].schemas.Optional_Leaf_).to.deep.equal(runs[0].schemas.Optional_Leaf_);
    },
  },
  {
    name: 'gives identical schemas for an optional member that also allows null, whatever the order',
    controller: 'syntheticChildren/exactNullInnerFirstController',
    modes: [...nullModes, exactMode],
    check: ({ generate, strictNullChecks }) => {
      const runs = ['exactNullInnerFirst', 'exactNullPlainFirst'].map(order => generate(`syntheticChildren/${order}Controller`));
      for (const { response, resolve } of runs) {
        const members = required(memberOf(response('/synthetic-children'), resolve, 'lit').properties, 'literal members');
        expectOptionalLeaf(resolve(members.inner), { text: 'string', count: 'number' });
        expectOptionalLeaf(resolve(members.plain), { text: 'string', count: 'number' });
        expect(members.inner.nullable, 'nullable inner').to.equal(strictNullChecks ? true : undefined);
        expect(members.plain.nullable, 'nullable plain').to.equal(undefined);
      }
      expect(runs[1].schemas.Optional_Leaf_).to.deep.equal(runs[0].schemas.Optional_Leaf_);
    },
  },
  {
    name: 'gives the same output for an optional member that allows null, in either property order',
    controller: 'syntheticChildren/exactNullAliasLitFirstController',
    openapi: '3.1',
    modes: [...nullModes, exactMode],
    check: ({ generate, strictNullChecks, compilerOptions }) => {
      const leaf = leafObject(strictNullChecks && !compilerOptions.exactOptionalPropertyTypes);
      const type: Tsoa.Type = strictNullChecks ? { dataType: 'union', types: [leaf, { dataType: 'enum', enums: [null] }] } : leaf;
      const schema = strictNullChecks ? { ...leafSchema, nullable: true } : leafSchema;
      for (const controller of ['exactNullAliasLitFirst', 'exactNullAliasDirectFirst']) {
        const { metadata, schemas } = generate(`syntheticChildren/${controller}Controller`);
        expect(JSON.parse(JSON.stringify(refAlias(metadata, 'P_Leaf-or-null_').type)), `${controller} alias`).to.deep.equal(type);
        expect(schemas['P_Leaf-or-null_'], `${controller} schema`).to.deep.equal(schema);
      }
    },
  },
  aliasWithoutUndefinedRow('keeps undefined out of the alias of an optional member, whatever the order', ['exactInnerFirst', 'exactNullPlainFirst']),
  aliasWithoutUndefinedRow('keeps undefined out of the alias of an optional tuple element, whatever the order', ['exactTupleFirst', 'exactDirectFirst']),
  {
    name: 'keeps an alias that includes undefined whole when an optional property uses it, whatever the order',
    controller: 'syntheticChildren/optionalAliasBoxFirstController',
    modes: [...nullModes, exactMode],
    check: ({ generate }) => {
      const maybe: Tsoa.Type = { dataType: 'union', types: [{ dataType: 'string' }, { dataType: 'undefined' }] };
      for (const controller of ['optionalAliasBoxFirst', 'optionalAliasMaybeFirst']) {
        const { metadata, schemas } = generate(`syntheticChildren/${controller}Controller`);
        expect(JSON.parse(JSON.stringify(refAlias(metadata, 'Maybe_string_').type)), `${controller} alias`).to.deep.equal(maybe);
        expect(schemas.MaybeBox_string_.properties?.value.$ref, `${controller} property`).to.equal(ref('Maybe_string_'));
        expect(schemas.MaybeBox_string_.required, `${controller} required`).to.equal(undefined);
      }
    },
  },
  {
    name: 'resolves union members by the names the source file imports',
    controller: 'syntheticChildren/indexedUnionController',
    check: ({ generate, strictNullChecks }) => {
      const { schemas, response } = generate();
      expect(required(response('/synthetic-children').anyOf, 'union members').map(member => member.$ref)).to.deep.equal([ref('Opt_Leaf_'), ref('Other_Leaf_')]);
      expectOptionalLeaf(schemas.Opt_Leaf_, { text: 'string', count: 'number' });
      expectOptionalLeaf(schemas.Other_Leaf_, { text: 'string', count: 'number' });
      expect(schemas.Opt_Leaf_.properties?.text.nullable, 'nullable Opt').to.equal(undefined);
      expect(schemas.Other_Leaf_.properties?.text.nullable, 'nullable Other').to.equal(strictNullChecks ? true : undefined);
    },
  },
  {
    name: 'keeps the type of a member that the printer reuses from the source',
    controller: 'syntheticChildren/indexedMemberController',
    check: ({ generate, strictNullChecks }) => {
      const { schemas, response, resolve } = generate();
      const members = required(resolve(response('/synthetic-children')).properties, 'members');
      expect(members.first.$ref).to.equal(ref('Opt_Leaf_'));
      expect(members.second.$ref).to.equal(ref('Other_Leaf_'));
      expect(schemas.Opt_Leaf_.properties?.text.nullable, 'nullable Opt').to.equal(undefined);
      expect(schemas.Other_Leaf_.properties?.text.nullable, 'nullable Other').to.equal(strictNullChecks ? true : undefined);
    },
  },
  {
    name: 'keeps a union member that a package declares',
    controller: 'syntheticChildren/packageMemberController',
    modes: [...nullModes, exactMode],
    check: ({ generate }) => {
      const { schemas, response, resolve } = generate();
      const members = required(resolve(response('/synthetic-children')).properties, 'members');
      expect(members.flag.anyOf).to.deep.equal([{ type: 'boolean' }, { $ref: ref('multer.Field') }]);
      expect(members.color.anyOf).to.deep.equal([{ $ref: ref('multer.Field') }, { $ref: ref('Color') }]);
      expect(Object.keys(schemas['multer.Field'].properties ?? {})).to.deep.equal(['name', 'maxCount']);
      expect(schemas['multer.Field'].required).to.deep.equal(['name']);
    },
  },
  {
    name: 'keeps a package union member next to namespaced members',
    controller: 'syntheticChildren/namespacedPackageMemberController',
    modes: [...nullModes, exactMode],
    check: ({ generate }) => {
      const { schemas, response, resolve } = generate();
      const members = required(resolve(response('/synthetic-children')).properties?.value.anyOf, 'union members');
      expect(members.map(member => member.$ref)).to.deep.equal([ref('First.Optional_First.Nested_'), ref('Second.Optional_Second.Nested_'), ref('multer.Field')]);
      expectOptionalLeaf(schemas['First.Optional_First.Nested_'], { a: 'string' });
      expectOptionalLeaf(schemas['Second.Optional_Second.Nested_'], { b: 'number' });
      expect(Object.keys(schemas['multer.Field'].properties ?? {})).to.deep.equal(['name', 'maxCount']);
    },
  },
  {
    name: 'keeps the types of union members that print the same name',
    controller: 'syntheticChildren/sharedPrintController',
    modes: [...nullModes, exactMode],
    check: ({ generate }) => {
      const { schemas, response, resolve } = generate();
      const members = required(resolve(response('/synthetic-children')).properties?.value.anyOf, 'union members');
      expect(members.map(member => member.$ref)).to.deep.equal([ref('Optional_First.Nested_'), ref('Optional_Second.Nested_')]);
      expectOptionalLeaf(schemas['Optional_First.Nested_'], { a: 'string' });
      expectOptionalLeaf(schemas['Optional_Second.Nested_'], { b: 'number' });
    },
  },
  {
    name: 'rejects a deferred conditional type with a metadata error',
    controller: 'syntheticChildren/deferredConditionalArrayController',
    check: ({ generate }) => {
      for (const controller of ['deferredConditionalArray', 'deferredConditionalUnion']) {
        expect(() => generate(`syntheticChildren/${controller}Controller`), controller).to.throw(GenerateMetadataError);
      }
    },
  },
  preservationRow('boolean', ({ resolve, response }, strictNullChecks) => {
    const members = required(resolve(response(route('mapped'))).properties, 'mapped members');
    expect(members.flag).to.deep.equal({ type: 'boolean' });
    expect(members.maybeFlag).to.deep.equal(strictNullChecks ? { type: 'boolean', nullable: true } : { type: 'boolean' });
  }),
  preservationRow('an enum name', ({ schemas, resolve, response }) => {
    const members = required(resolve(response(route('mapped'))).properties, 'mapped members');
    expect(members.color).to.deep.equal({ $ref: ref('Color') });
    expect(members.maybeColor).to.deep.equal({ $ref: ref('Color') });
    expect(schemas.Color).to.deep.equal({ type: 'string', enum: ['red', 'blue'] });
  }),
  preservationRow('a keyof union', ({ resolve, response }) => {
    const mapped = required(resolve(response(route('mapped'))).properties, 'mapped members');
    expect(mapped.side).to.deep.equal({ type: 'string', enum: ['width', 'height'] });
    const source = required(resolve(response(route('source'))).properties, 'source members');
    expect(source.key).to.deep.equal({ type: 'string', enum: ['width', 'height'], nullable: false });
    expect(source.mixed).to.deep.equal({ type: 'string', enum: ['width', 'height', 'other'] });
  }),
  preservationRow('a named alias inside a union', ({ schemas, resolve, response }) => {
    const members = required(resolve(response(route('mapped'))).properties, 'mapped members');
    expect(members.pair.anyOf).to.deep.equal([{ type: 'string' }, { $ref: ref('Pair') }]);
    expect(schemas.Pair).to.deep.equal({
      type: 'array',
      prefixItems: [{ type: 'string' }, { type: 'number', format: 'double' }],
      minItems: 2,
      maxItems: 2,
      items: false,
    });
  }),
  {
    name: 'keeps the open object of Record<string, any> inside an inferred type',
    controller: 'syntheticChildren/recordAnyInferredController',
    check: ({ generate }) => {
      const { schemas, body, resolve } = generate();
      expect(resolve(body('/synthetic-children', 'post')).properties?.values.$ref).to.equal(ref('Record_string.any_'));
      expect(schemas['Record_string.any_'].additionalProperties).to.deep.equal({});
    },
  },
  {
    name: 'keeps the open object of a Record<string, any> body',
    controller: 'syntheticChildren/recordAnyDirectController',
    check: ({ generate }) => {
      const { schemas, body } = generate();
      expect(body('/synthetic-children', 'post').$ref).to.equal(ref('Record_string.any_'));
      expect(schemas['Record_string.any_'].additionalProperties).to.deep.equal({});
    },
  },
  recursiveRow('DeepPartial'),
  recursiveRow('MergePatch'),
  {
    name: 'uses fixtures without TypeScript diagnostics',
    controller: 'syntheticChildren/rolesController',
    modes: [...nullModes, exactMode],
    check: ({ compilerOptions }) => {
      const entryFiles = fs
        .readdirSync(syntheticRoot)
        .filter(file => file.endsWith('Controller.ts'))
        .map(file => `${syntheticRoot}${file}`);
      const program = createProgram(entryFiles, { ...compilerOptions, experimentalDecorators: true, target: ScriptTarget.ES2021, module: ModuleKind.CommonJS, skipLibCheck: true, noEmit: true });
      expect(getPreEmitDiagnostics(program).map(diagnostic => flattenDiagnosticMessageText(diagnostic.messageText, '\n'))).to.deep.equal([]);
    },
  },
];

const describeMode = (compilerOptions: CompilerOptions) =>
  Object.entries(compilerOptions)
    .map(([option, value]) => `${option}=${JSON.stringify(value)}`)
    .join(', ');

describe('Children of synthetic type nodes', () => {
  for (const row of rows) {
    for (const compilerOptions of row.modes ?? nullModes) {
      it(`${row.name} (${describeMode(compilerOptions)})`, () => {
        row.check({
          strictNullChecks: compilerOptions.strictNullChecks === true,
          compilerOptions,
          generate: (controller = row.controller) => generate(controller, compilerOptions, row.openapi),
        });
      });
    }
  }
});
