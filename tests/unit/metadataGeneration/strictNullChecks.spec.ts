import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { expect } from 'chai';
import 'mocha';
import type { CompilerOptions } from '@tsoa/cli/ts';
import { compilerDiagnostics } from '../../utils/diagnostics';

describe('MetadataGenerator strict null checking defaults', () => {
  const entryFile = './fixtures/strictNullChecks/strictNullChecksController.ts';
  const cases: Array<{ name: string; compilerOptions: CompilerOptions | undefined; nullable: boolean }> = [
    { name: 'omitted options', compilerOptions: undefined, nullable: false },
    { name: 'empty options', compilerOptions: {}, nullable: false },
    { name: 'strict enabled', compilerOptions: { strict: true }, nullable: true },
    { name: 'strict disabled', compilerOptions: { strict: false }, nullable: false },
    { name: 'strictNullChecks enabled', compilerOptions: { strictNullChecks: true }, nullable: true },
    { name: 'strictNullChecks disabled', compilerOptions: { strictNullChecks: false }, nullable: false },
    { name: 'explicit false overrides strict', compilerOptions: { strict: true, strictNullChecks: false }, nullable: false },
    { name: 'explicit true overrides strict', compilerOptions: { strict: false, strictNullChecks: true }, nullable: true },
    { name: 'undefined strictNullChecks inherits strict', compilerOptions: { strict: true, strictNullChecks: undefined }, nullable: true },
    { name: 'undefined flags use the legacy default', compilerOptions: { strict: undefined, strictNullChecks: undefined }, nullable: false },
  ];

  it('uses a fixture without source diagnostics with default or strict options', () => {
    for (const compilerOptions of [{}, { strict: true }, { strictNullChecks: true }]) {
      expect(compilerDiagnostics([entryFile], compilerOptions, entryFile)).to.deep.equal([]);
    }
  });

  for (const { name, controllers } of [
    { name: 'entry file', controllers: undefined },
    { name: 'controller glob', controllers: ['./fixtures/strictNullChecks/*Controller.ts'] },
  ]) {
    describe(name, () => {
      for (const { name, compilerOptions, nullable } of cases) {
        it(name, () => {
          const metadata = new MetadataGenerator(entryFile, compilerOptions, undefined, controllers).Generate();
          expect(metadata.controllers).to.have.length(1);
          expect(metadata.controllers[0].methods).to.have.length(1);
          const returnType = metadata.controllers[0].methods[0].type;
          if (nullable) {
            expect(returnType.dataType).to.equal('union');
            if (returnType.dataType !== 'union') {
              throw new Error('Expected a nullable return type');
            }
            expect(returnType.types).to.have.deep.members([{ dataType: 'string' }, { dataType: 'enum', enums: [null] }]);
          } else {
            expect(returnType).to.deep.equal({ dataType: 'string' });
          }
        });
      }
    });
  }
});
