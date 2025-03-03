import { expect } from 'chai';
import * as ts from 'typescript';
import { TypeResolver } from '@tsoa/cli/metadataGeneration/typeResolver';
import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';

const refAliasProperties = {
  default: undefined,
  description: undefined,
  format: undefined,
  validators: {},
};

const defaultProperties = {
  default: undefined,
  deprecated: false,
  description: undefined,
  example: undefined,
  extensions: [],
  format: undefined,
  validators: {},
};

function createProgramFromSource(source: string, fileName: string = 'test.ts') {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest);

  const defaultCompilerHost = ts.createCompilerHost({});
  const compilerHost = ts.createCompilerHost({});
  compilerHost.getSourceFile = (fileName, languageVersion) => {
    if (fileName === sourceFile.fileName) {
      return sourceFile;
    }
    return defaultCompilerHost.getSourceFile(fileName, languageVersion);
  };
  compilerHost.fileExists = fileName => {
    if (fileName === sourceFile.fileName) {
      return true;
    }
    return defaultCompilerHost.fileExists(fileName);
  };

  const program = ts.createProgram([sourceFile.fileName], {}, compilerHost);
  const metadataGenerator = new MetadataGenerator(fileName);
  (metadataGenerator as any).program = program;
  (metadataGenerator as any).typeChecker = program.getTypeChecker();

  const typeAliasDeclaration = sourceFile.statements.filter(ts.isTypeAliasDeclaration).pop();
  if (!typeAliasDeclaration) {
    throw new Error('No type alias declaration found in source');
  }

  return {
    metadataGenerator,
    typeNode: typeAliasDeclaration.type,
  };
}

describe('TypeResolver.resolve', () => {
  it('should resolve an object type', () => {
    const { metadataGenerator, typeNode } = createProgramFromSource('type ObjectType = { a: string; b: number; };');
    const resolver = new TypeResolver(typeNode, metadataGenerator);
    const result = resolver.resolve();
    expect(result).to.deep.equal({
      dataType: 'nestedObjectLiteral',
      properties: [
        {
          name: 'b',
          type: { dataType: 'double' },
          required: true,
          ...defaultProperties,
        },
        {
          name: 'a',
          type: { dataType: 'string' },
          required: true,
          ...defaultProperties,
        },
      ],
      additionalProperties: undefined,
    });
  });

  it('should resolve conditional types', () => {
    const { metadataGenerator, typeNode } = createProgramFromSource('type ConditionalType<T> = T extends string ? string : number; type Concrete = ConditionalType<boolean>;');
    const resolver = new TypeResolver(typeNode, metadataGenerator);
    const result = resolver.resolve();
    expect(result).to.deep.equal({
      refName: 'ConditionalType_boolean_',
      dataType: 'refAlias',
      type: { dataType: 'double' },
      ...refAliasProperties,
    });
  });

  it('should resolve indexed access types', () => {
    const { metadataGenerator, typeNode } = createProgramFromSource('type IndexedAccessType = { a: string }["a"];');
    const resolver = new TypeResolver(typeNode, metadataGenerator);
    const result = resolver.resolve();
    expect(result).to.deep.equal({ dataType: 'string' });
  });

  it('should resolve inferred types', () => {
    const source = 'type InferredType<T> = T extends infer U ? U : never;\n' + 'type Concrete = InferredType<string>;';
    const { metadataGenerator, typeNode } = createProgramFromSource(source);
    const resolver = new TypeResolver(typeNode, metadataGenerator);
    const result = resolver.resolve();
    expect(result).to.deep.equal({
      refName: 'InferredType_string_',
      dataType: 'refAlias',
      type: { dataType: 'string' },
      ...refAliasProperties,
    });
  });

  it('should resolve typeof with literal', () => {
    const source = `
      const hello = "hello"
      type InferredType = typeof hello;
    `;
    const { metadataGenerator, typeNode } = createProgramFromSource(source);
    const resolver = new TypeResolver(typeNode, metadataGenerator);
    const result = resolver.resolve();
    expect(result).to.deep.equal({
      dataType: 'enum',
      enums: ['hello'],
    });
  });

  it('should resolve typeof with object', () => {
    const source = `
      const concrete = {a: "a", b: 1};
      type InferredType = typeof concrete;
    `;
    const { metadataGenerator, typeNode } = createProgramFromSource(source);
    const resolver = new TypeResolver(typeNode, metadataGenerator);
    const result = resolver.resolve();
    expect(result).to.deep.equal({
      dataType: 'nestedObjectLiteral',
      properties: [
        {
          name: 'a',
          type: { dataType: 'string' },
          required: true,
          ...defaultProperties,
        },
        {
          name: 'b',
          type: { dataType: 'double' },
          required: true,
          ...defaultProperties,
        },
      ],
    });
  });

  it('should resolve intersection types', () => {
    const { metadataGenerator, typeNode } = createProgramFromSource('type IntersectionType = { a: string } & { b: number };');
    const resolver = new TypeResolver(typeNode, metadataGenerator);
    const result = resolver.resolve();
    expect(result).to.deep.equal({
      dataType: 'intersection',
      types: [
        {
          additionalProperties: undefined,
          dataType: 'nestedObjectLiteral',
          properties: [
            {
              name: 'a',
              type: { dataType: 'string' },
              required: true,
              ...defaultProperties,
            },
          ],
        },
        {
          additionalProperties: undefined,
          dataType: 'nestedObjectLiteral',
          properties: [
            {
              name: 'b',
              type: { dataType: 'double' },
              required: true,
              ...defaultProperties,
            },
          ],
        },
      ],
    });
  });

  it('should resolve intrinsic types', () => {
    const { metadataGenerator, typeNode } = createProgramFromSource('type IntrinsicType = string;');
    const resolver = new TypeResolver(typeNode, metadataGenerator);
    const result = resolver.resolve();
    expect(result).to.deep.equal({ dataType: 'string' });
  });

  it('should resolve literal types', () => {
    const { metadataGenerator, typeNode } = createProgramFromSource('type LiteralType = "literal";');
    const resolver = new TypeResolver(typeNode, metadataGenerator);
    const result = resolver.resolve();
    expect(result).to.deep.equal({ dataType: 'enum', enums: ['literal'] });
  });

  it('should resolve mapped types', () => {
    const source = 'type MappedType<T> = { [P in keyof T]: T[P] }; \n' + 'type Concrete = MappedType<{ a: string; b: number }>;';
    const { metadataGenerator, typeNode } = createProgramFromSource(source);
    const resolver = new TypeResolver(typeNode, metadataGenerator);
    const result = resolver.resolve();
    expect(result).to.deep.equal({
      dataType: 'refAlias',
      refName: 'MappedType__a-string--b-number__',
      type: {
        dataType: 'nestedObjectLiteral',
        properties: [
          {
            name: 'a',
            type: { dataType: 'string' },
            required: true,
            ...defaultProperties,
          },
          {
            name: 'b',
            type: { dataType: 'double' },
            required: true,
            ...defaultProperties,
          },
        ],
      },
      ...refAliasProperties,
    });
  });

  it('should resolve mapped types with contraints', () => {
    const source = `
      type Flatten<T extends Record<string, string>> = {
        [k in keyof T]: T[k];
      };

      type ValueType = Flatten<{ name: string }>;
    `;
    const { metadataGenerator, typeNode } = createProgramFromSource(source);
    const resolver = new TypeResolver(typeNode, metadataGenerator);
    const result = resolver.resolve();
    expect(result).to.deep.equal({
      dataType: 'refAlias',
      refName: 'Flatten__name-string__',
      type: {
        dataType: 'nestedObjectLiteral',
        properties: [
          {
            name: 'name',
            type: { dataType: 'string' },
            required: true,
            ...defaultProperties,
          },
        ],
      },
      ...refAliasProperties,
    });
  });

  it('should resolve optional types', () => {
    const { metadataGenerator, typeNode } = createProgramFromSource('type OptionalType = { a?: string };');
    const resolver = new TypeResolver(typeNode, metadataGenerator);
    const result = resolver.resolve();
    expect(result).to.deep.equal({
      dataType: 'nestedObjectLiteral',
      properties: [
        {
          name: 'a',
          type: { dataType: 'string' },
          required: false,
          ...defaultProperties,
        },
      ],
      additionalProperties: undefined,
    });
  });

  it('should resolve predicate types', () => {
    const source = `
      type PredicateType = (x: any) => x is string;
      type Concrete = ReturnType<PredicateType>;
    `;
    const { metadataGenerator, typeNode } = createProgramFromSource(source);
    const resolver = new TypeResolver(typeNode, metadataGenerator);
    const result = resolver.resolve();
    expect(result).to.deep.equal({
      dataType: 'refAlias',
      refName: 'ReturnType_PredicateType_',
      type: { dataType: 'boolean' },
      ...refAliasProperties,
      description: 'Obtain the return type of a function type',
    });
  });

  it('should resolve keyof query types', () => {
    const { metadataGenerator, typeNode } = createProgramFromSource('type QueryType = keyof { a: string };');
    const resolver = new TypeResolver(typeNode, metadataGenerator);
    const result = resolver.resolve();
    expect(result).to.deep.equal({ dataType: 'enum', enums: ['a'] });
  });

  it('should resolve reference types', () => {
    const { metadataGenerator, typeNode } = createProgramFromSource('type ReferenceType = { a: string };');
    const resolver = new TypeResolver(typeNode, metadataGenerator);
    const result = resolver.resolve();
    expect(result).to.deep.equal({
      dataType: 'nestedObjectLiteral',
      properties: [
        {
          name: 'a',
          type: { dataType: 'string' },
          required: true,
          ...defaultProperties,
        },
      ],
      additionalProperties: undefined,
    });
  });

  // works with nested types, but not with interfaces
  it.skip('should resolve nested interface types', () => {
    const source = `
      interface Address { line1: string; line2?: string; postalCode: string; };
      type Person = { 
        first: string;
        last: string;
        address: Address;
      };
    `;
    const { metadataGenerator, typeNode } = createProgramFromSource(source);
    const resolver = new TypeResolver(typeNode, metadataGenerator);
    const result = resolver.resolve();
    expect(result).to.deep.equal({
      dataType: 'nestedObjectLiteral',
      properties: [
        {
          name: 'a',
          type: { dataType: 'string' },
          required: true,
          ...defaultProperties,
        },
      ],
      additionalProperties: undefined,
    });
  });

  it('should resolve rest types', () => {
    const source = 'type Sum = (...numbers: number[]) => number;\n' + 'type RestType = Parameters<Sum>;';
    const { metadataGenerator, typeNode } = createProgramFromSource(source);
    const resolver = new TypeResolver(typeNode, metadataGenerator);
    const result = resolver.resolve();
    expect(result).to.deep.equal({
      dataType: 'refAlias',
      refName: 'Parameters_Sum_',
      type: {
        dataType: 'array',
        elementType: {
          dataType: 'double',
        },
      },
      ...refAliasProperties,
      description: 'Obtain the parameters of a function type in a tuple',
    });
  });

  // Only template literal types with literal string unions are supported
  it('should resolve template literal types', () => {
    const { metadataGenerator, typeNode } = createProgramFromSource('type TemplateLiteralType = `prefix_${"a" | "b"}`;');
    const resolver = new TypeResolver(typeNode, metadataGenerator);
    const result = resolver.resolve();
    expect(result).to.deep.equal({ dataType: 'enum', enums: ['prefix_a', 'prefix_b'] });
  });

  it('should resolve type operator types', () => {
    const { metadataGenerator, typeNode } = createProgramFromSource('type TypeOperatorType = keyof { a: string };');
    const resolver = new TypeResolver(typeNode, metadataGenerator);
    const result = resolver.resolve();
    expect(result).to.deep.equal({ dataType: 'enum', enums: ['a'] });
  });

  it('should resolve union types', () => {
    const { metadataGenerator, typeNode } = createProgramFromSource('type UnionType = string | number;');
    const resolver = new TypeResolver(typeNode, metadataGenerator);
    const result = resolver.resolve();
    expect(result).to.deep.equal({ dataType: 'union', types: [{ dataType: 'string' }, { dataType: 'double' }] });
  });

  it('should resolve unknown types', () => {
    const { metadataGenerator, typeNode } = createProgramFromSource('type UnknownType = unknown;');
    const resolver = new TypeResolver(typeNode, metadataGenerator);
    const result = resolver.resolve();
    expect(result).to.deep.equal({ dataType: 'any' });
  });

  it('should resolve simple generic types', () => {
    const source = `
      type Wrapper<T> = { data: T };
      type Concrete = Wrapper<string>;
    `;
    const { metadataGenerator, typeNode } = createProgramFromSource(source);
    const resolver = new TypeResolver(typeNode, metadataGenerator);
    const result = resolver.resolve();
    expect(result).to.deep.equal({
      dataType: 'refAlias',
      refName: 'Wrapper_string_',
      type: {
        dataType: 'nestedObjectLiteral',
        properties: [{ name: 'data', type: { dataType: 'string' }, required: true, ...defaultProperties }],
        additionalProperties: undefined,
      },
      ...refAliasProperties,
    });
  });

  // One of the issues that blocks zod's z.infer from working as expected
  // see https://github.com/lukeautry/tsoa/issues/1256#issuecomment-2649340573
  it.skip('should resolve indexed generic types', () => {
    const source = `
      type Type<Output> = { _type: Output };
      type ValueType = Type<string>["_type"];
    `;
    const { metadataGenerator, typeNode } = createProgramFromSource(source);
    const resolver = new TypeResolver(typeNode, metadataGenerator);
    const result = resolver.resolve();
    expect(result).to.deep.equal({
      dataType: 'nestedObjectLiteral',
      properties: [
        { name: 'a', type: { dataType: 'string' }, required: true, ...defaultProperties },
        { name: 'b', type: { dataType: 'double' }, required: true, ...defaultProperties },
      ],
      additionalProperties: undefined,
    });
  });

  // Note: requires installing zod as a dependency as well
  it.skip('should resolve Zod inferred types', () => {
    const source = `
      import { z } from 'zod';
      const schema = z.object({ a: z.string(), b: z.number() });
      type InferredType = z.infer<typeof schema>;
    `;
    const { metadataGenerator, typeNode } = createProgramFromSource(source);
    const resolver = new TypeResolver(typeNode, metadataGenerator);
    const result = resolver.resolve();
    expect(result).to.deep.equal({
      dataType: 'nestedObjectLiteral',
      properties: [
        { name: 'a', type: { dataType: 'string' }, required: true, ...defaultProperties },
        { name: 'b', type: { dataType: 'double' }, required: true, ...defaultProperties },
      ],
      additionalProperties: undefined,
    });
  });

  it('should resolve references to inferred types with intrinsic', () => {
    const source = `
      const value: string = "a";
      type Infer<T> = T;
      type ValueType = Infer<typeof value>;
    `;
    const { metadataGenerator, typeNode } = createProgramFromSource(source);
    const resolver = new TypeResolver(typeNode, metadataGenerator);
    const result = resolver.resolve();
    expect(result).to.deep.equal({
      dataType: 'refAlias',
      refName: 'Infer_typeofvalue_',
      type: { dataType: 'string' },
      ...refAliasProperties,
    });
  });

  it('should resolve references to inferred types with literal', () => {
    const source = `
      const value = "a";
      type Infer<T> = T;
      type ValueType = Infer<typeof value>;
    `;
    const { metadataGenerator, typeNode } = createProgramFromSource(source);
    const resolver = new TypeResolver(typeNode, metadataGenerator);
    const result = resolver.resolve();
    expect(result).to.deep.equal({
      dataType: 'refAlias',
      refName: 'Infer_typeofvalue_',
      type: { dataType: 'enum', enums: ['a'] },
      ...refAliasProperties,
    });
  });
  it('should resolve references to inferred types with object', () => {
    const source = `
      const value = { a: "a", b: 1};
      type Infer<T> = T;
      type ValueType = Infer<typeof value>;
    `;
    const { metadataGenerator, typeNode } = createProgramFromSource(source);
    const resolver = new TypeResolver(typeNode, metadataGenerator);
    const result = resolver.resolve();
    expect(result).to.deep.equal({
      dataType: 'refAlias',
      refName: 'Infer_typeofvalue_',
      type: {
        dataType: 'nestedObjectLiteral',
        properties: [
          { name: 'a', type: { dataType: 'string' }, required: true, ...defaultProperties },
          { name: 'b', type: { dataType: 'double' }, required: true, ...defaultProperties },
        ],
      },
      ...refAliasProperties,
    });
  });
});
