import { createCompilerQueries } from '@tsoa/cli/metadataGeneration/compilerQueries';
import { expect } from 'chai';
import * as path from 'path';
import * as ts from 'typescript';

const firstFile = path.resolve(__dirname, '../../fixtures/compilerQueries/first.ts');
const secondFile = path.resolve(__dirname, '../../fixtures/compilerQueries/second.ts');

function source(program: ts.Program, file: string): ts.SourceFile {
  const result = program.getSourceFile(file);
  if (!result) throw new Error(`Missing source file ${file}`);
  return result;
}

function laterDeclaration(file: ts.SourceFile): ts.InterfaceDeclaration {
  const declaration = file.statements.find(ts.isInterfaceDeclaration);
  if (!declaration) throw new Error('Missing Later interface');
  return declaration;
}

describe('Compiler query source continuity', () => {
  for (const strictNullChecks of [false, true]) {
    it(`keeps prior source edits when a chained query edits another file with strictNullChecks=${strictNullChecks}`, () => {
      const options: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2021,
        module: ts.ModuleKind.NodeNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        strictNullChecks,
        skipLibCheck: true,
        types: [],
      };
      const seed = ts.createProgram([firstFile, secondFile], options);
      const originalFirst = source(seed, firstFile);
      const localFunction = originalFirst.statements.find(ts.isFunctionDeclaration);
      const local = localFunction?.body?.statements.find(ts.isTypeAliasDeclaration);
      if (!local) throw new Error('Missing local type alias');
      const originalLater = laterDeclaration(originalFirst);
      const firstQueries = createCompilerQueries(seed, options);
      const firstCapture = firstQueries.addSource(local.type);
      const first = firstQueries.compile();
      expect(first.diagnostics).to.deep.equal([]);
      expect(first.checker.getPropertiesOfType(first.get(firstCapture).type).map(property => property.name)).to.deep.equal(['value']);
      const firstSource = source(first.program, firstFile);
      const firstLater = laterDeclaration(firstSource);
      expect(firstLater.pos).to.be.greaterThan(originalLater.pos);

      const secondQueries = createCompilerQueries(first.program, options);
      const other = source(first.program, secondFile).statements.find(ts.isTypeAliasDeclaration);
      if (!other) throw new Error('Missing Other type alias');
      const secondCapture = secondQueries.addSource(other.type);
      const second = secondQueries.compile();
      expect(second.diagnostics).to.deep.equal([]);
      const secondSource = source(second.program, firstFile);
      const rebound = second.originalNode(secondQueries.sourceKey(firstLater));
      expect(rebound).to.equal(laterDeclaration(secondSource));
      expect(rebound.getSourceFile()).to.equal(secondSource);
      expect(secondSource).not.to.equal(firstSource);
      expect(secondSource.text).to.equal(firstSource.text);
      expect(secondSource.impliedNodeFormat).to.equal(firstSource.impliedNodeFormat);
      const previousLocation = second.originalLocation(rebound);
      if (!previousLocation) throw new Error('Missing prior source location');
      expect(first.originalLocationAt(previousLocation)).to.deep.equal({ fileName: firstFile, pos: originalLater.pos, end: originalLater.end, kind: originalLater.kind });

      const result = second.get(secondCapture);
      expect(result.node.getSourceFile()).to.equal(source(second.program, secondFile));
      const later = second.checker.getPropertyOfType(result.type, 'later');
      if (!later) throw new Error('Missing later property');
      const laterType = second.checker.getTypeOfSymbolAtLocation(later, result.node);
      const field = second.checker.getPropertyOfType(laterType, 'field');
      if (!field) throw new Error('Missing field property');
      expect(second.checker.typeToString(second.checker.getTypeOfSymbolAtLocation(field, rebound))).to.equal('string');
    });
  }
});
