import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { expect } from 'chai';
import 'mocha';
import { createProgram, flattenDiagnosticMessageText, ScriptTarget } from 'typescript';

describe('MetadataGenerator Error library declarations', () => {
  const entryFile = './fixtures/errorDeclarations/errorDeclarationsController.ts';
  const compilerOptions = { target: ScriptTarget.ES2022 };

  it('uses a fixture without source diagnostics', () => {
    const program = createProgram([entryFile], compilerOptions);
    const sourceFile = program.getSourceFile(entryFile);
    if (!sourceFile) {
      throw new Error('Missing Error declarations fixture');
    }
    const diagnostics = [...program.getSyntacticDiagnostics(sourceFile), ...program.getSemanticDiagnostics(sourceFile)];
    expect(diagnostics.map(diagnostic => flattenDiagnosticMessageText(diagnostic.messageText, '\n'))).to.deep.equal([]);
  });

  for (const { methodName, refName } of [
    { methodName: 'directError', refName: 'Error' },
    { methodName: 'customError', refName: 'Failure' },
  ]) {
    it(`resolves ${methodName} with Error members and an ES2022 target`, () => {
      const metadata = new MetadataGenerator(entryFile, compilerOptions).Generate();
      expect(metadata.controllers).to.have.length(1);
      const returnType = metadata.controllers[0].methods.find(method => method.name === methodName)?.type;
      expect(returnType).to.include({ dataType: 'refObject', refName });

      const model = metadata.referenceTypeMap[refName];
      if (model.dataType !== 'refObject') {
        throw new Error('Expected an Error object model');
      }
      const properties = model.properties.map(({ name, required, type }) => ({ name, required, type }));
      expect(properties).to.deep.include.members([
        { name: 'name', required: true, type: { dataType: 'string' } },
        { name: 'message', required: true, type: { dataType: 'string' } },
        { name: 'cause', required: false, type: { dataType: 'any' } },
      ]);
      if (refName === 'Failure') {
        expect(properties).to.deep.include({ name: 'code', required: true, type: { dataType: 'string' } });
      }
    });
  }
});
