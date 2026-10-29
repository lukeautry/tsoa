import { expect } from 'chai';
import 'mocha';
import { join, normalize, relative } from 'path';
import { getApi, isInterfaceDeclaration, type PropertySignatureDeclaration } from '@tsoa/cli/ts';
import { GenerateMetadataError } from '@tsoa/cli/metadataGeneration/exceptions';

const path = normalize(join(__dirname, '../../fixtures/program.ts'));
const { sourceFile } = getApi().createSourceFileFromFile(path);

const iface = sourceFile.statements.find(isInterfaceDeclaration)!;

const propertySignature = iface.members[2] as PropertySignatureDeclaration;
const type = propertySignature.type;

describe('GenerateMetadataError', () => {
  it(`Should have a given text`, () => {
    expect(new GenerateMetadataError('Text').message).to.eq('Text');
  });

  it(`Should give context on a failing type if provided`, () => {
    expect(new GenerateMetadataError('Text', type).message).to.eq(`Text\nAt: ${relative(process.cwd(), path)}:4:4.\nThis was caused by 'fail: unknown;'`);
  });
});
