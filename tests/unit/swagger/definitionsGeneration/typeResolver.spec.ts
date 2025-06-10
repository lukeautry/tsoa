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

function createProgramFromSource(source: string, fileName = 'test.ts') {
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
  // @ts-expect-error: 'program' is a private and read-only property of MetadataGenerator
  metadataGenerator.program = program;
  // @ts-expect-error: 'program' is a private and read-only property of MetadataGenerator
  metadataGenerator.typeChecker = program.getTypeChecker();

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
    const { metadataGenerator, typeNode } = createProgramFromSource(/*ts*/ `
      type ObjectType = { a: string; b: number; };
    `);

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
    const { metadataGenerator, typeNode } = createProgramFromSource(/*ts*/ `
      type ConditionalType<T> = T extends string ? string : number; 
      type Concrete = ConditionalType<boolean>;
    `);

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
    const { metadataGenerator, typeNode } = createProgramFromSource(/*ts*/ `
      type IndexedAccessType = { a: string }["a"];
    `);

    const resolver = new TypeResolver(typeNode, metadataGenerator);
    const result = resolver.resolve();
    expect(result).to.deep.equal({ dataType: 'string' });
  });

  it('should resolve inferred types', () => {
    const { metadataGenerator, typeNode } = createProgramFromSource(/*ts*/ `
      type InferredType<T> = T extends infer U ? U : never;
      type Concrete = InferredType<string>;
    `);

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
    const { metadataGenerator, typeNode } = createProgramFromSource(/*ts*/ `
      const hello = "hello"
      type InferredType = typeof hello;
    `);

    const resolver = new TypeResolver(typeNode, metadataGenerator);
    const result = resolver.resolve();
    expect(result).to.deep.equal({
      dataType: 'enum',
      enums: ['hello'],
    });
  });

  it('should resolve typeof with object', () => {
    const { metadataGenerator, typeNode } = createProgramFromSource(/*ts*/ `
      const concrete = {a: "a", b: 1};
      type InferredType = typeof concrete;
    `);

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
    const { metadataGenerator, typeNode } = createProgramFromSource(/*ts*/ `
      type IntersectionType = { a: string } & { b: number };
    `);

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
    const { metadataGenerator, typeNode } = createProgramFromSource(/*ts*/ `
      type IntrinsicType = string;
    `);

    const resolver = new TypeResolver(typeNode, metadataGenerator);
    const result = resolver.resolve();
    expect(result).to.deep.equal({ dataType: 'string' });
  });

  it('should resolve literal types', () => {
    const { metadataGenerator, typeNode } = createProgramFromSource(/*ts*/ `
      type LiteralType = "literal";
    `);

    const resolver = new TypeResolver(typeNode, metadataGenerator);
    const result = resolver.resolve();
    expect(result).to.deep.equal({ dataType: 'enum', enums: ['literal'] });
  });

  it('should resolve mapped types', () => {
    const { metadataGenerator, typeNode } = createProgramFromSource(/*ts*/ `
      type MappedType<T> = { [P in keyof T]: T[P] }; 
      type Concrete = MappedType<{ a: string; b: number }>;
    `);

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
    const { metadataGenerator, typeNode } = createProgramFromSource(/*ts*/ `
      type OptionalType = { a?: string };
    `);

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
    const { metadataGenerator, typeNode } = createProgramFromSource(/*ts*/ `
      type PredicateType = (x: any) => x is string;
      type Concrete = ReturnType<PredicateType>;
    `);

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
    const { metadataGenerator, typeNode } = createProgramFromSource(/*ts*/ `
      type QueryType = keyof { a: string };
    `);

    const resolver = new TypeResolver(typeNode, metadataGenerator);
    const result = resolver.resolve();
    expect(result).to.deep.equal({ dataType: 'enum', enums: ['a'] });
  });

  it('should resolve reference types', () => {
    const { metadataGenerator, typeNode } = createProgramFromSource(/*ts*/ `
      type ReferenceType = { a: string };
    `);

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
    const { metadataGenerator, typeNode } = createProgramFromSource(/*ts*/ `
      interface Address { line1: string; line2?: string; postalCode: string; };
      type Person = { 
        first: string;
        last: string;
        address: Address;
      };
    `);

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
    const { metadataGenerator, typeNode } = createProgramFromSource(/*ts*/ `
      type Sum = (...numbers: number[]) => number;
      type RestType = Parameters<Sum>;
    `);

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
    const { metadataGenerator, typeNode } = createProgramFromSource(/*ts*/ `
      type TemplateLiteralType = \`prefix_\${"a" | "b"}\`;
    `);

    const resolver = new TypeResolver(typeNode, metadataGenerator);
    const result = resolver.resolve();
    expect(result).to.deep.equal({ dataType: 'enum', enums: ['prefix_a', 'prefix_b'] });
  });

  it('should resolve type operator types', () => {
    const { metadataGenerator, typeNode } = createProgramFromSource(/*ts*/ `
      type TypeOperatorType = keyof { a: string };
    `);

    const resolver = new TypeResolver(typeNode, metadataGenerator);
    const result = resolver.resolve();
    expect(result).to.deep.equal({ dataType: 'enum', enums: ['a'] });
  });

  it('should resolve union types', () => {
    const { metadataGenerator, typeNode } = createProgramFromSource(/*ts*/ `
      type UnionType = string | number;
    `);

    const resolver = new TypeResolver(typeNode, metadataGenerator);
    const result = resolver.resolve();
    expect(result).to.deep.equal({ dataType: 'union', types: [{ dataType: 'string' }, { dataType: 'double' }] });
  });

  it('should resolve unknown types', () => {
    const { metadataGenerator, typeNode } = createProgramFromSource(/*ts*/ `
      type UnknownType = unknown;
    `);

    const resolver = new TypeResolver(typeNode, metadataGenerator);
    const result = resolver.resolve();
    expect(result).to.deep.equal({ dataType: 'any' });
  });

  it('should resolve simple generic types', () => {
    const { metadataGenerator, typeNode } = createProgramFromSource(/*ts*/ `
      type Wrapper<T> = { data: T };
      type Concrete = Wrapper<string>;
    `);

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
    const { metadataGenerator, typeNode } = createProgramFromSource(/*ts*/ `
      type Type<Output> = { _type: Output };
      type ValueType = Type<string>["_type"];
    `);

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
    const { metadataGenerator, typeNode } = createProgramFromSource(/*ts*/ `
      import { z } from 'zod';
      const schema = z.object({ a: z.string(), b: z.number() });
      type InferredType = z.infer<typeof schema>;
    `);

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
    const { metadataGenerator, typeNode } = createProgramFromSource(/*ts*/ `
      const value: string = "a";
      type Infer<T> = T;
      type ValueType = Infer<typeof value>;
    `);

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
    const { metadataGenerator, typeNode } = createProgramFromSource(/*ts*/ `
      const value = "a";
      type Infer<T> = T;
      type ValueType = Infer<typeof value>;
    `);

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
    const { metadataGenerator, typeNode } = createProgramFromSource(/*ts*/ `
      const value = { a: "a", b: 1};
      type Infer<T> = T;
      type ValueType = Infer<typeof value>;
    `);

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
