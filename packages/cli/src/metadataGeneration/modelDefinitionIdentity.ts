import * as fs from 'fs';
import * as path from 'path';
import {
  isArrayLiteralExpression,
  isAsExpression,
  isClassDeclaration,
  isEnumDeclaration,
  isIdentifier,
  isIndexedAccessTypeNode,
  isInterfaceDeclaration,
  isLiteralTypeNode,
  isModuleBlock,
  isNumericLiteral,
  isObjectLiteralExpression,
  isParenthesizedExpression,
  isParenthesizedTypeNode,
  isPropertyAssignment,
  isPropertySignature,
  isSourceFile,
  isStringLiteral,
  isTypeAliasDeclaration,
  isTypeLiteralNode,
  isTypeQueryNode,
  isUnionTypeNode,
  isVariableStatement,
  type Declaration,
  type EnumDeclaration,
  type Expression,
  type Node,
  type Statement,
  type TypeAliasDeclaration,
  type TypeNode,
  type VariableStatement,
} from 'typescript';

export interface ModelDefinitionPosition {
  fileName: string;
  pos: number;
  declaration?: Declaration;
}

/**
 * Decides whether two same-named model declarations are the same logical declaration even though
 * the TypeScript program reaches them through different files.
 *
 * A valid TypeScript program can contain several physical duplicates of one logical declaration:
 * - the same file reached through a symlinked path (e.g. package manager workspace links);
 * - a hardlinked or byte-identical copy of the file (e.g. pnpm injected workspace packages);
 * - a built declaration file (`.d.ts` with a `.d.ts.map`) next to the source file it was compiled from;
 * - a verbatim copy of the declaration in another file (common with generated API clients).
 *
 * None of these should be reported as conflicting model definitions. Everything else - two genuinely
 * different declarations that happen to share a name - is a real conflict and stays one.
 */
export class ModelDefinitionIdentity {
  private readonly realPathCache = new Map<string, string>();
  private readonly fileContentCache = new Map<string, string | undefined>();
  private readonly declarationSourceCache = new Map<string, string | undefined>();
  private readonly declarationTextCache = new WeakMap<Declaration, string>();
  private readonly literalValueSetCache = new WeakMap<Declaration, string | undefined>();
  private readonly propertyShapeCache = new WeakMap<Declaration, string | undefined>();

  public areDefinitionsEquivalent(a: ModelDefinitionPosition, b: ModelDefinitionPosition): boolean {
    if (a.fileName === b.fileName) {
      return a.pos === b.pos;
    }

    if (a.pos === b.pos) {
      // Same path after resolving symlinks: one file reached through two paths.
      if (this.toRealPath(a.fileName) === this.toRealPath(b.fileName)) {
        return true;
      }

      // Byte-identical files (hardlinks or copies) declare the model at the same position.
      const contentOfA = this.readFile(a.fileName);
      if (contentOfA !== undefined && contentOfA === this.readFile(b.fileName)) {
        return true;
      }
    }

    // Verbatim duplicates of one declaration describe the same model wherever they live, apart
    // from whitespace and the 'declare' modifier that declaration files add. The compared text
    // includes every same-name declaration merged in the same container (e.g. the companion
    // `const X = {...}` of an `export type X = typeof X[keyof typeof X]` pair), because the
    // model's shape can live in those merged declarations.
    if (a.declaration && b.declaration && this.getNormalizedDeclarationText(a.declaration) === this.getNormalizedDeclarationText(b.declaration)) {
      return true;
    }

    if (a.declaration && b.declaration) {
      // Declarations that declare the same wire contract are the same model, even when they are
      // written differently: an enum, a union of literals, and a generated client's merged
      // `const X = {...} as const` / `type X = ...` pair with the same value set all accept and
      // produce the same values; two plain interfaces with the same property signatures accept
      // and produce the same objects.
      const valuesOfA = this.getLiteralValueSet(a.declaration);
      if (valuesOfA !== undefined && valuesOfA === this.getLiteralValueSet(b.declaration)) {
        return true;
      }
      const shapeOfA = this.getPropertySignatureShape(a.declaration);
      if (shapeOfA !== undefined && shapeOfA === this.getPropertySignatureShape(b.declaration)) {
        return true;
      }
    }

    // A built declaration file is the compiled output of the source file its declaration map points
    // to, so a declaration in it is the same logical model as the same-named declaration in that
    // source file. Positions are not comparable between a source file and its build output.
    const sourceOfA = this.toDeclarationSource(a.fileName);
    const sourceOfB = this.toDeclarationSource(b.fileName);
    if (sourceOfA === undefined && sourceOfB === undefined) {
      return false;
    }
    return (sourceOfA ?? this.toRealPath(a.fileName)) === (sourceOfB ?? this.toRealPath(b.fileName));
  }

  private getNormalizedDeclarationText(declaration: Declaration): string {
    let text = this.declarationTextCache.get(declaration);
    if (text === undefined) {
      const sourceFile = declaration.getSourceFile();
      text = collectMergedDeclarations(declaration)
        .map(node =>
          sourceFile.text
            // Include the JSDoc comment: it contributes to the generated model (e.g. descriptions).
            .slice(node.getStart(sourceFile, true), node.getEnd()),
        )
        .join('\n')
        .replace(/\bdeclare\s+(?=(abstract\s+)?(const|let|var|enum|class|interface|type|namespace|module|function)\b)/g, '')
        .replace(/\s+/g, ' ');
      this.declarationTextCache.set(declaration, text);
    }
    return text;
  }

  /**
   * The set of literal values an enum-like declaration declares, as a canonical string, or
   * undefined when the declaration is not a plain closed set of string/number literals. Covers
   * enum declarations, unions of literals, `(typeof SOME_CONST)[number]` array lookups, and the
   * merged `const X = {...} as const` / `type X = typeof X[keyof typeof X]` pairs that API client
   * generators emit. Member names and documentation deliberately do not participate: declarations
   * accepting and producing the same wire values describe the same model.
   */
  private getLiteralValueSet(declaration: Declaration): string | undefined {
    if (!this.literalValueSetCache.has(declaration)) {
      this.literalValueSetCache.set(declaration, computeLiteralValueSet(declaration));
    }
    return this.literalValueSetCache.get(declaration);
  }

  /**
   * The property signatures of a plain object interface, as a canonical string, or undefined when
   * the declaration is not a plain object interface (type parameters, heritage clauses, index or
   * call signatures, or merged declarations all disqualify it). Property order, `readonly`,
   * property-name quoting, and JSDoc metadata deliberately do not participate: interfaces with the
   * same property names, optionality, and property types describe the same model. In particular a
   * declaration-file copy of a model (e.g. in a generated API client) cannot carry the original's
   * JSDoc validators, so validators and documentation stay with whichever declaration is rendered.
   */
  private getPropertySignatureShape(declaration: Declaration): string | undefined {
    if (!this.propertyShapeCache.has(declaration)) {
      this.propertyShapeCache.set(declaration, computePropertySignatureShape(declaration));
    }
    return this.propertyShapeCache.get(declaration);
  }

  private toRealPath(fileName: string): string {
    let realPath = this.realPathCache.get(fileName);
    if (realPath === undefined) {
      try {
        realPath = normalizePath(fs.realpathSync(fileName));
      } catch {
        realPath = normalizePath(path.resolve(fileName));
      }
      this.realPathCache.set(fileName, realPath);
    }
    return realPath;
  }

  private readFile(fileName: string): string | undefined {
    if (!this.fileContentCache.has(fileName)) {
      let content: string | undefined;
      try {
        content = fs.readFileSync(fileName, 'utf8');
      } catch {
        content = undefined;
      }
      this.fileContentCache.set(fileName, content);
    }
    return this.fileContentCache.get(fileName);
  }

  /**
   * Resolves a built declaration file (`foo.d.ts` with a `foo.d.ts.map` next to it) to the real
   * path of the source file it was compiled from. Returns undefined for everything else.
   */
  private toDeclarationSource(fileName: string): string | undefined {
    if (!this.declarationSourceCache.has(fileName)) {
      this.declarationSourceCache.set(fileName, this.readDeclarationSource(fileName));
    }
    return this.declarationSourceCache.get(fileName);
  }

  private readDeclarationSource(fileName: string): string | undefined {
    if (!/\.d\.(ts|mts|cts)$/.test(fileName)) {
      return undefined;
    }
    const declarationMapContent = this.readFile(`${fileName}.map`);
    if (declarationMapContent === undefined) {
      return undefined;
    }
    try {
      const declarationMap: unknown = JSON.parse(declarationMapContent);
      if (typeof declarationMap !== 'object' || declarationMap === null) {
        return undefined;
      }
      const sources = (declarationMap as { sources?: unknown }).sources;
      if (!Array.isArray(sources) || sources.length !== 1 || typeof sources[0] !== 'string') {
        return undefined;
      }
      return this.toRealPath(path.resolve(path.dirname(fileName), sources[0]));
    } catch {
      return undefined;
    }
  }
}

function normalizePath(fileName: string): string {
  return fileName.replace(/\\/g, '/');
}

/**
 * Collects every declaration in the same container that shares the declaration's name, in source
 * order. TypeScript merges those declarations into one symbol (e.g. `const X = {...} as const`
 * next to `type X = typeof X[keyof typeof X]`, a pattern common in generated API clients), so the
 * model's identity spans all of them.
 */
function collectMergedDeclarations(declaration: Declaration): Node[] {
  const name = getDeclaredName(declaration);
  const container = declaration.parent;
  if (name === undefined || !(isSourceFile(container) || isModuleBlock(container))) {
    return [declaration];
  }
  const merged = container.statements.filter(statement => declaresName(statement, name));
  return merged.length > 0 ? merged : [declaration];
}

function getDeclaredName(declaration: Declaration): string | undefined {
  const name: unknown = (declaration as { name?: unknown }).name;
  return name && isIdentifier(name as Node) ? (name as { text: string }).text : undefined;
}

function declaresName(statement: Statement, name: string): boolean {
  if (isInterfaceDeclaration(statement) || isClassDeclaration(statement) || isTypeAliasDeclaration(statement) || isEnumDeclaration(statement)) {
    return statement.name !== undefined && statement.name.text === name;
  }
  if (isVariableStatement(statement)) {
    return statement.declarationList.declarations.some(variable => isIdentifier(variable.name) && variable.name.text === name);
  }
  return false;
}

function computeLiteralValueSet(declaration: Declaration): string | undefined {
  const values: Array<string | number> = [];
  for (const node of collectMergedDeclarations(declaration)) {
    if (isEnumDeclaration(node)) {
      if (!collectEnumValues(node, values)) {
        return undefined;
      }
    } else if (isTypeAliasDeclaration(node)) {
      if (!collectTypeAliasValues(node, values)) {
        return undefined;
      }
    } else if (isVariableStatement(node)) {
      if (!collectConstObjectValues(node, getDeclaredName(declaration), values)) {
        return undefined;
      }
    } else {
      return undefined;
    }
  }
  if (values.length === 0) {
    return undefined;
  }
  return JSON.stringify(values.map(value => `${typeof value}:${value}`).sort());
}

function collectEnumValues(node: EnumDeclaration, values: Array<string | number>): boolean {
  for (const member of node.members) {
    const value = member.initializer && literalValueOf(member.initializer);
    if (value === undefined) {
      return false;
    }
    values.push(value);
  }
  return true;
}

function collectTypeAliasValues(node: TypeAliasDeclaration, values: Array<string | number>): boolean {
  if (node.typeParameters) {
    return false;
  }
  const collectFromTypeNode = (typeNode: TypeNode): boolean => {
    if (isParenthesizedTypeNode(typeNode)) {
      return collectFromTypeNode(typeNode.type);
    }
    if (isUnionTypeNode(typeNode)) {
      return typeNode.types.every(collectFromTypeNode);
    }
    if (isLiteralTypeNode(typeNode)) {
      const value = literalValueOf(typeNode.literal as Expression);
      if (value === undefined) {
        return false;
      }
      values.push(value);
      return true;
    }
    if (isIndexedAccessTypeNode(typeNode)) {
      // `typeof X[keyof typeof X]` contributes the values of the merged const X (collected from
      // its own variable statement), and `(typeof SOME_CONST)[number]` contributes the values of
      // the referenced same-container array const.
      let objectType = typeNode.objectType;
      if (isParenthesizedTypeNode(objectType)) {
        objectType = objectType.type;
      }
      if (!isTypeQueryNode(objectType) || !isIdentifier(objectType.exprName)) {
        return false;
      }
      const targetName = objectType.exprName.text;
      if (targetName === getDeclaredName(node)) {
        return true; // values come from the merged const declaration
      }
      if (typeNode.indexType.getText().replace(/\s+/g, '') === 'number') {
        return collectArrayConstValues(node, targetName, values);
      }
      return false;
    }
    return false;
  };
  return collectFromTypeNode(node.type);
}

function collectConstObjectValues(statement: VariableStatement, name: string | undefined, values: Array<string | number>): boolean {
  const variable = statement.declarationList.declarations.find(declarator => isIdentifier(declarator.name) && declarator.name.text === name);
  if (!variable) {
    return false;
  }

  // In a declaration file the const has no initializer; its values live in the type annotation:
  // `export declare const X: { readonly A: "A"; readonly B: "B" };`
  if (!variable.initializer) {
    const typeNode = variable.type;
    if (!typeNode || !isTypeLiteralNode(typeNode)) {
      return false;
    }
    for (const member of typeNode.members) {
      if (!isPropertySignature(member) || !member.type || !isLiteralTypeNode(member.type)) {
        return false;
      }
      const value = literalValueOf(member.type.literal as Expression);
      if (value === undefined) {
        return false;
      }
      values.push(value);
    }
    return true;
  }

  let initializer = variable.initializer;
  while (isAsExpression(initializer) || isParenthesizedExpression(initializer)) {
    initializer = initializer.expression;
  }
  if (!isObjectLiteralExpression(initializer)) {
    return false;
  }
  for (const property of initializer.properties) {
    if (!isPropertyAssignment(property)) {
      return false;
    }
    const value = literalValueOf(property.initializer);
    if (value === undefined) {
      return false;
    }
    values.push(value);
  }
  return true;
}

function collectArrayConstValues(reference: Node, targetName: string, values: Array<string | number>): boolean {
  const container = reference.parent;
  if (!container || !(isSourceFile(container) || isModuleBlock(container))) {
    return false;
  }
  for (const statement of container.statements) {
    if (!isVariableStatement(statement)) {
      continue;
    }
    const variable = statement.declarationList.declarations.find(declarator => isIdentifier(declarator.name) && declarator.name.text === targetName);
    if (!variable) {
      continue;
    }
    let initializer = variable.initializer;
    if (!initializer) {
      return false;
    }
    while (isAsExpression(initializer) || isParenthesizedExpression(initializer)) {
      initializer = initializer.expression;
    }
    if (!isArrayLiteralExpression(initializer)) {
      return false;
    }
    for (const element of initializer.elements) {
      const value = literalValueOf(element);
      if (value === undefined) {
        return false;
      }
      values.push(value);
    }
    return true;
  }
  return false;
}

function literalValueOf(expression: Expression): string | number | undefined {
  if (isStringLiteral(expression)) {
    return expression.text;
  }
  if (isNumericLiteral(expression)) {
    return Number(expression.text);
  }
  return undefined;
}

function computePropertySignatureShape(declaration: Declaration): string | undefined {
  const merged = collectMergedDeclarations(declaration);
  const node = merged[0];
  if (merged.length !== 1 || !isInterfaceDeclaration(node)) {
    return undefined;
  }
  if (node.typeParameters || (node.heritageClauses && node.heritageClauses.length > 0)) {
    return undefined;
  }
  const properties: string[] = [];
  for (const member of node.members) {
    if (!isPropertySignature(member) || !member.type) {
      return undefined;
    }
    let name: string;
    if (isIdentifier(member.name) || isStringLiteral(member.name)) {
      name = member.name.text;
    } else {
      return undefined;
    }
    properties.push(`${name}${member.questionToken ? '?' : ''}:${member.type.getText().replace(/\s+/g, '')}`);
  }
  return JSON.stringify(properties.sort());
}
