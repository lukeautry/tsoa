import { CheckerTypeResolver } from '@tsoa/cli/metadataGeneration/checker/checkerTypeResolver';
import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import type { Tsoa } from '@tsoa/runtime';
import { expect } from 'chai';
import 'mocha';
import { resolve } from 'node:path';
import * as ts from 'typescript';
import { checkerFixture, checkerGenerator, checkerMetadata, findTypeAlias, programOf, refOf, returnTypeOf } from './helpers';

/** Follows refAliases so assertions hold whether or not the alias is kept as a named model. */
export function unwrap(type: Tsoa.Type): Tsoa.Type {
  return type.dataType === 'refAlias' ? unwrap(type.type) : type;
}

function aliasResolver(options: ts.CompilerOptions) {
  const generator = checkerGenerator('dispatch.ts', options);
  const resolver = new CheckerTypeResolver(generator);
  const sourceFile = programOf(generator).getSourceFile(checkerFixture('dispatch.ts'))!;
  return (name: string) => {
    const alias = findTypeAlias(sourceFile, name);
    return resolver.resolveNode(alias.type, alias);
  };
}

describe('checker resolver dispatch (non-object types)', () => {
  const strict = aliasResolver({ strict: true });
  const loose = aliasResolver({});

  it('maps primitives', () => {
    expect(strict('Str')).to.deep.equal({ dataType: 'string' });
    expect(strict('Num')).to.deep.equal({ dataType: 'double' });
    expect(strict('Vd')).to.deep.equal({ dataType: 'void' });
    expect(strict('Und')).to.deep.equal({ dataType: 'undefined' });
    expect(strict('Anything')).to.deep.equal({ dataType: 'any' });
    expect(strict('Unk')).to.deep.equal({ dataType: 'any' });
    expect(strict('Obj')).to.deep.equal({ dataType: 'object' });
    expect(strict('Bool')).to.deep.equal({ dataType: 'boolean' });
  });

  it('uses JSDoc number formats from the declaration', () => {
    expect(strict('Int')).to.deep.equal({ dataType: 'integer' });
  });

  it('rejects never outside a union', () => {
    expect(() => strict('Nv')).to.throw(/Unknown type: NeverKeyword/);
  });

  it('maps literal unions in written order', () => {
    expect(strict('Lit')).to.deep.equal({
      dataType: 'union',
      types: [
        { dataType: 'enum', enums: ['a'] },
        { dataType: 'enum', enums: ['b'] },
        { dataType: 'enum', enums: [null] },
      ],
    });
    expect(strict('Neg')).to.deep.equal({ dataType: 'enum', enums: [-1] });
  });

  it('keeps written boolean literals and written boolean keywords as legacy does', () => {
    expect(strict('WrittenBooleans')).to.deep.equal({
      dataType: 'union',
      types: [
        { dataType: 'enum', enums: [true] },
        { dataType: 'enum', enums: [false] },
      ],
    });
    expect(strict('StrOrBool')).to.deep.equal({ dataType: 'union', types: [{ dataType: 'string' }, { dataType: 'boolean' }] });
  });

  it('maps keyof results like legacy', () => {
    expect(strict('KeysOfAny')).to.deep.equal({ dataType: 'union', types: [{ dataType: 'string' }, { dataType: 'double' }] });
    expect(strict('KeysMixed')).to.deep.equal({
      dataType: 'union',
      types: [
        { dataType: 'enum', enums: ['a'] },
        { dataType: 'enum', enums: [2] },
      ],
    });
    expect(strict('KeysIndexed')).to.deep.equal({ dataType: 'union', types: [{ dataType: 'string' }, { dataType: 'double' }] });
    expect(strict('KeysOne')).to.deep.equal({ dataType: 'enum', enums: ['only'] });
  });

  it('maps arrays and tuples', () => {
    expect(strict('Arr')).to.deep.equal({ dataType: 'array', elementType: { dataType: 'double' } });
    expect(strict('Tup')).to.deep.equal({ dataType: 'tuple', types: [{ dataType: 'string' }], restType: { dataType: 'double' } });
  });

  it('evaluates intrinsic string types (repro 04)', () => {
    expect(unwrap(strict('Upper'))).to.deep.equal({
      dataType: 'union',
      types: [
        { dataType: 'enum', enums: ['ABC'] },
        { dataType: 'enum', enums: ['DEF'] },
      ],
    });
  });

  it('maps infinite template literals to string (repro 05) and finite ones to enums', () => {
    expect(strict('Template')).to.deep.equal({ dataType: 'string' });
    expect(unwrap(strict('FiniteTemplate'))).to.deep.equal({ dataType: 'enum', enums: ['ac', 'ad'] });
  });

  it('adds written null back in non-strict programs', () => {
    expect(loose('NullableString')).to.deep.equal({ dataType: 'union', types: [{ dataType: 'string' }, { dataType: 'enum', enums: [null] }] });
    expect(strict('NullableString')).to.deep.equal({ dataType: 'union', types: [{ dataType: 'string' }, { dataType: 'enum', enums: [null] }] });
  });

  it('reports unresolvable references by their written name', () => {
    const entry = resolve(__dirname, '../../../fixtures/tsconfig-bundler/controller.ts');
    const generator = new MetadataGenerator(entry, undefined, undefined, undefined, [], 'double', false, 'checker');
    const method = programOf(generator)
      .getSourceFile(entry)!
      .statements.filter(ts.isClassDeclaration)[0]
      .members.filter(ts.isMethodDeclaration)
      .find(m => (m.name as ts.Identifier).text === 'getWidget')!;
    expect(() => new CheckerTypeResolver(generator).resolveNode(method.type!)).to.throw(/Could not find declarations for type 'Widget'/);
  });

  // Review focus 1. Needs object members (Task 7).
  it('keeps a nullable type argument nullable in non-strict programs', () => {
    const md = checkerMetadata('nonStrictNull.ts');
    const page = returnTypeOf(md) as Tsoa.ReferenceType;
    const items = (refOf(md, page.refName) as Tsoa.RefObjectType).properties.find(p => p.name === 'items')!;
    const element = (items.type as Tsoa.ArrayType).elementType as Tsoa.UnionType;
    expect(element.types).to.deep.include({ dataType: 'enum', enums: [null] });
  });
});
