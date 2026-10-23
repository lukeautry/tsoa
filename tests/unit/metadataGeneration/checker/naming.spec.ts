import { LegacyNamer } from '@tsoa/cli/metadataGeneration/checker/naming';
import { modelDeclarations } from '@tsoa/cli/metadataGeneration/checker/declarations';
import { emptySubstitutions, rootSite, substitutionsFor } from '@tsoa/cli/metadataGeneration/checker/site';
import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { TypeResolver } from '@tsoa/cli/metadataGeneration/typeResolver';
import { expect } from 'chai';
import 'mocha';
import * as ts from 'typescript';
import { programOf } from './helpers';

const entry = './fixtures/express/server.ts';

function fixtureTypeReferences(program: ts.Program): ts.TypeReferenceNode[] {
  const nodes: ts.TypeReferenceNode[] = [];
  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile || !sourceFile.fileName.includes('/tests/fixtures/')) {
      continue;
    }
    const visit = (node: ts.Node) => {
      if (ts.isTypeReferenceNode(node)) {
        nodes.push(node);
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  return nodes;
}

const attempt = (fn: () => string) => {
  try {
    return fn();
  } catch (err) {
    return `THROWS ${(err as Error).message.split('\n')[0]}`;
  }
};

describe('LegacyNamer (port of legacy type naming)', () => {
  const legacyGenerator = new MetadataGenerator(entry);
  const portGenerator = new MetadataGenerator(entry);
  const namer = new LegacyNamer(portGenerator);
  const nodes = fixtureTypeReferences(programOf(portGenerator));
  const legacyNodes = fixtureTypeReferences(programOf(legacyGenerator));
  const portNames = nodes.map(node => attempt(() => LegacyNamer.refName(namer.typeName(node, emptySubstitutions))));

  it('finds the fixture type references', () => {
    expect(nodes.length).to.be.greaterThan(500);
    expect(legacyNodes.length).to.equal(nodes.length);
  });

  it('names every fixture type reference exactly as legacy does', () => {
    const mismatches: string[] = [];
    legacyNodes.forEach((node, i) => {
      const legacy = attempt(() => (new TypeResolver(node, legacyGenerator) as unknown as { calcTypeName(n: ts.TypeNode): string }).calcTypeName(node));
      const legacyRef = legacy.startsWith('THROWS') ? legacy : LegacyNamer.refName(legacy);
      if (legacyRef !== portNames[i]) {
        mismatches.push(`${node.getText()}: legacy=${legacyRef} port=${portNames[i]}`);
      }
    });
    expect(mismatches).to.deep.equal([]);
  });

  for (const expected of [
    'Omit_ErrorResponseModel.status_',
    'Partial__40__a-string_-or-_b-string__41_-and-_c-string__',
    'Partial___91_a-string_93__58_string__',
    'Exclude_keyofTestClassModel.account-or-defaultValue2-or-indexedTypeToInterface-or-indexedTypeToClass-or-indexedTypeToAlias-or-indexedResponseObject-or-arrayUnion-or-objectUnion_',
    'GenericRequest_TypeAliasModel1-Array_',
    'NonNullable_number-or-null_',
    'Generic__foo-string--bar-boolean__',
  ]) {
    it(`produces the suite-asserted name ${expected}`, () => {
      expect(portNames).to.include(expected);
    });
  }

  it('names references inside generic declarations with substituted arguments, as legacy does', () => {
    type LegacyInternals = {
      calcTypeName(n: ts.TypeNode): string;
      typeArgumentsToContext(n: ts.TypeReferenceNode, e: ts.EntityName): Record<string, { type: ts.TypeNode; name: string }>;
    };
    const mismatches: string[] = [];
    let compared = 0;
    legacyNodes.forEach((reference, i) => {
      if (!reference.typeArguments?.length) {
        return;
      }
      const declaration = modelDeclarations(portGenerator.typeChecker, nodes[i].typeName)[0];
      if (!declaration || !('typeParameters' in declaration) || !declaration.typeParameters) {
        return;
      }
      const subs = attemptValue(() => substitutionsFor(nodes[i], declaration.typeParameters, rootSite(), namer));
      const legacyRoot = new TypeResolver(reference, legacyGenerator) as unknown as LegacyInternals;
      const context = attemptValue(() => legacyRoot.typeArgumentsToContext(reference, reference.typeName));
      if (typeof subs === 'string' || typeof context === 'string') {
        if (subs !== context) {
          mismatches.push(`${reference.getText()}: legacy=${JSON.stringify(Object.keys(context))} port=${JSON.stringify(typeof subs === 'string' ? subs : [...subs.keys()])}`);
        }
        return;
      }
      const legacyDeclaration = modelDeclarations(legacyGenerator.typeChecker, reference.typeName)[0];
      const inner = (d: ts.Node) => {
        const found: ts.TypeReferenceNode[] = [];
        const visit = (n: ts.Node) => (ts.isTypeReferenceNode(n) && found.push(n), ts.forEachChild(n, visit));
        visit(d);
        return found;
      };
      const portInner = inner(declaration);
      inner(legacyDeclaration).forEach((node, j) => {
        compared++;
        const legacyResolver = new TypeResolver(node, legacyGenerator, undefined, context) as unknown as LegacyInternals;
        const legacy = attempt(() => legacyResolver.calcTypeName(node));
        const port = attempt(() => namer.typeName(portInner[j], subs));
        if (legacy !== port) {
          mismatches.push(`${reference.getText()} › ${node.getText()}: legacy=${legacy} port=${port}`);
        }
      });
    });
    expect(compared).to.be.greaterThan(50);
    expect(mismatches).to.deep.equal([]);
  });
});

function attemptValue<T>(fn: () => T): T | string {
  try {
    return fn();
  } catch (err) {
    return `THROWS ${(err as Error).message.split('\n')[0]}`;
  }
}
