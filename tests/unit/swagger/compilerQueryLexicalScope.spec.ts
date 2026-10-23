import { createCompilerQueries, ProjectionStep } from '@tsoa/cli/metadataGeneration/compilerQueries';
import { expect } from 'chai';
import * as path from 'path';
import * as ts from 'typescript';

const entryFile = path.resolve(__dirname, '../../fixtures/controllers/typeContextOptionalPresence/shadowedUtilities.ts');

function nameAt(source: ts.SourceFile, name: string) {
  const visit = (node: ts.Node): ts.Identifier | undefined => {
    if (ts.isIdentifier(node) && node.text === name && (ts.isFunctionDeclaration(node.parent) || ts.isClassDeclaration(node.parent) || ts.isVariableDeclaration(node.parent))) return node;
    return ts.forEachChild(node, visit);
  };
  const result = visit(source);
  if (!result) throw new Error(`Missing ${name} declaration`);
  return result;
}

describe('Compiler query lexical scope', () => {
  for (const strictNullChecks of [false, true]) {
    it(`keeps value projections when utility names are shadowed with strictNullChecks=${strictNullChecks}`, () => {
      const options: ts.CompilerOptions = { target: ts.ScriptTarget.ES2021, module: ts.ModuleKind.CommonJS, strictNullChecks, skipLibCheck: true, types: [] };
      const seed = ts.createProgram([entryFile], options);
      expect(ts.getPreEmitDiagnostics(seed)).to.deep.equal([]);
      const source = seed.getSourceFile(entryFile);
      if (!source) throw new Error('Missing utility shadow fixture');
      const cases = [
        ['factory', [{ kind: 'return' }], ['returned']],
        ['Owner', [{ kind: 'instance' }], ['method']],
        ['accept', [{ kind: 'parameters' }, { kind: 'index', index: 0 }], ['value']],
        ['maybe', [{ kind: 'nonNullable' }], ['value']],
      ] satisfies Array<[string, ProjectionStep[], string[]]>;
      const queries = createCompilerQueries(seed, options);
      const captures = cases.map(([name, steps, properties]) => ({ capture: queries.addValue(nameAt(source, name), steps), properties }));
      const result = queries.compile();
      expect(result.diagnostics).to.deep.equal([]);
      for (const { capture, properties } of captures) {
        expect(result.checker.getPropertiesOfType(result.get(capture).type).map(property => property.getName())).to.deep.equal(properties);
      }
    });
  }
});
