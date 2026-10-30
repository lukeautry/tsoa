import * as ts from '../../compiler/index';
import { GenerateMetadataError } from '../exceptions';
import { isExistJSDocTag } from '../../utils/jsDocUtils';
import { throwUnless } from '../../utils/flowUtils';

/** Declarations that can back a tsoa model. */
export type ModelDeclaration = ts.InterfaceDeclaration | ts.ClassDeclaration | ts.TypeAliasDeclaration | ts.EnumDeclaration | ts.EnumMember;

/** The symbol at a node, with import aliases resolved. */
export function symbolAt(checker: ts.TypeChecker, node: ts.Node): ts.Symbol | undefined {
  const symbol = checker.getSymbolAtLocation(node) ?? (node as { symbol?: ts.Symbol }).symbol;
  return (symbol && symbol.flags & ts.SymbolFlags.Alias && checker.getAliasedSymbol(symbol)) || symbol;
}

/**
 * The model declarations a written reference points at.
 * Returns [] when the reference has no usable declarations (type parameters, built-ins, unresolved).
 */
export function modelDeclarations(checker: ts.TypeChecker, entity: ts.EntityName): ModelDeclaration[] {
  let typeName = ts.isIdentifier(entity) ? entity.text : entity.right.text;

  let symbol = symbolAt(checker, entity);
  if (!symbol && ts.isQualifiedName(entity)) {
    symbol = symbolAt(checker, entity.left)?.exports?.get(typeName as ts.__String);
  }
  const declarations = symbol?.getDeclarations();
  if (!symbol || !declarations || declarations.length === 0) {
    return [];
  }
  if ((symbol.escapedName as string) !== typeName && (symbol.escapedName as string) !== 'default') {
    typeName = symbol.escapedName as string;
  }

  let models = declarations.filter((node): node is ModelDeclaration => isModelDeclaration(node) && node.name?.getText() === typeName);
  if (models.length > 1) {
    const nonLib = models.filter(model => !isTypeScriptLib(model.getSourceFile()));
    // ES2022 adds `cause` to Error in a second library declaration.
    if (!(nonLib.length === 0 && typeName === 'Error')) {
      models = nonLib;
    }
    models = designatedModels(models, typeName);
  }
  return models;
}

/** A declaration file shipped with TypeScript itself (`lib.es2015.collection.d.ts`, …). */
export function isTypeScriptLib(sourceFile: ts.SourceFile): boolean {
  return sourceFile.fileName.replace(/\\/g, '/').toLowerCase().includes('node_modules/typescript');
}

function isModelDeclaration(node: ts.Node): node is ModelDeclaration {
  return ts.isInterfaceDeclaration(node) || ts.isClassDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node) || ts.isEnumMember(node);
}

/** A model marked `@tsoaModel` is the canonical one among several declarations. */
function designatedModels<T extends ts.Node>(nodes: T[], typeName: string): T[] {
  const designated = nodes.filter(node => isExistJSDocTag(node, tag => tag.tagName.text === 'tsoaModel'));
  if (designated.length === 0) {
    return nodes;
  }
  throwUnless(designated.length === 1, new GenerateMetadataError(`Multiple models for ${typeName} marked with '@tsoaModel'; '@tsoaModel' should only be applied to one model.`));
  return designated;
}
