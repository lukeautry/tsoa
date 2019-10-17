import { expect } from 'chai';
import 'mocha';
import { join, normalize } from 'path';
import { createProgram, InterfaceDeclaration, isInterfaceDeclaration, PropertySignature } from 'typescript';
import { GenerateMetadataError } from '../../../src/metadataGeneration/exceptions';

const path = normalize(join(__dirname, '../../fixtures/program.ts'));
const program = createProgram([path], {});
program.getTypeChecker();
const sourceFile = program.getSourceFiles().filter(sourceFile => normalize(sourceFile.fileName) === path)[0];

const iface = sourceFile
  .getChildren()[0]
  .getChildren()
  .find(child => isInterfaceDeclaration(child)) as InterfaceDeclaration;

const propertySignature = iface.members[2] as PropertySignature;
const type = propertySignature.type!;

describe('GenerateMetadataError', () => {
  it(`Should have a given text`, () => {
    expect(new GenerateMetadataError('Text').message).to.eq('Text');
  });

  it(`Should give context on a failing type if provided`, () => {
    expect(new GenerateMetadataError('Text', type).message).to.eq(`Text\nAt: ${path}:4:4.\nThis was caused by 'fail: unknown;'`);
  });
});
