import { readAnnotations } from '@tsoa/cli/metadataGeneration/checker/annotations';
import { rootSite } from '@tsoa/cli/metadataGeneration/checker/site';
import { resolveSpecialType } from '@tsoa/cli/metadataGeneration/checker/specialTypes';
import { PrimitiveTransformer } from '@tsoa/cli/metadataGeneration/transformer/primitiveTransformer';
import { expect } from 'chai';
import 'mocha';
import * as ts from 'typescript';
import { checkerFixture, checkerGenerator, programOf } from './helpers';

describe('checker resolver annotations and special types', () => {
  const generator = checkerGenerator('annotations.ts');
  const sourceFile = programOf(generator).getSourceFile(checkerFixture('annotations.ts'))!;
  const model = sourceFile.statements.find((s): s is ts.InterfaceDeclaration => ts.isInterfaceDeclaration(s) && s.name.text === 'Annotated')!;
  const prop = (name: string) => model.members.find((m): m is ts.PropertySignature => ts.isPropertySignature(m) && (m.name as ts.Identifier).text === name)!;
  const special = (name: string) => resolveSpecialType(generator.typeChecker.getTypeAtLocation(prop(name)), rootSite(prop(name).type, prop(name)), generator);

  it('reads number format tags', () => {
    expect(readAnnotations(prop('n'), generator).tagNames).to.include('isInt');
    expect(PrimitiveTransformer.numberType('double', ['isInt'])).to.deep.equal({ dataType: 'integer' });
    expect(PrimitiveTransformer.numberType('long', [])).to.deep.equal({ dataType: 'long' });
  });

  it('reads validators', () => {
    expect(readAnnotations(prop('s'), generator).validators.pattern?.value).to.equal('^a$');
  });

  it('reads defaults', () => {
    expect(readAnnotations(prop('d'), generator).default).to.equal(3);
  });

  it('reads deprecation', () => {
    expect(readAnnotations(prop('old'), generator).deprecated).to.equal(true);
    expect(readAnnotations(prop('s'), generator).deprecated).to.equal(false);
  });

  it('reads @ignore', () => {
    expect(readAnnotations(prop('hidden'), generator).ignored).to.equal(true);
  });

  it('reads descriptions', () => {
    expect(readAnnotations(prop('day'), generator).description).to.equal('A day');
  });

  it('maps Date by its JSDoc format', () => {
    expect(special('day')).to.deep.equal({ dataType: 'date' });
    expect(special('at')).to.deep.equal({ dataType: 'datetime' });
  });

  it('maps Buffer and String', () => {
    expect(special('data')).to.deep.equal({ dataType: 'buffer' });
    expect(special('boxed')).to.deep.equal({ dataType: 'string' });
  });

  it('leaves ordinary types alone', () => {
    expect(special('s')).to.equal(undefined);
  });
});
