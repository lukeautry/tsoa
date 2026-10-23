import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import type { Tsoa } from '@tsoa/runtime';
import { resolve } from 'node:path';
import * as ts from 'typescript';

export const checkerFixture = (fixture: string) => resolve(__dirname, '../../../fixtures/checker', fixture);

export function checkerGenerator(fixture: string, options: ts.CompilerOptions = {}): MetadataGenerator {
  return new MetadataGenerator(checkerFixture(fixture), options, undefined, undefined, [], 'double', false, 'checker');
}

export function checkerMetadata(fixture: string, options: ts.CompilerOptions = {}): Tsoa.Metadata {
  return checkerGenerator(fixture, options).Generate();
}

export function returnTypeOf(md: Tsoa.Metadata, method = 'm'): Tsoa.Type {
  for (const controller of md.controllers) {
    const found = controller.methods.find(m => m.name === method);
    if (found) {
      return found.type;
    }
  }
  throw new Error(`method ${method} not found`);
}

export function refOf(md: Tsoa.Metadata, refName: string): Tsoa.ReferenceType {
  const ref = md.referenceTypeMap[refName];
  if (!ref) {
    throw new Error(`refName ${refName} not in referenceTypeMap: ${Object.keys(md.referenceTypeMap).join(', ')}`);
  }
  return ref;
}

/** The program behind a generator; tests need it to find nodes in fixtures. */
export function programOf(generator: MetadataGenerator): ts.Program {
  return (generator as unknown as { program: ts.Program }).program;
}

export function findTypeAlias(sourceFile: ts.SourceFile, name: string): ts.TypeAliasDeclaration {
  let found: ts.TypeAliasDeclaration | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isTypeAliasDeclaration(node) && node.name.text === name) {
      found = node;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  if (!found) {
    throw new Error(`type alias ${name} not found in ${sourceFile.fileName}`);
  }
  return found;
}
