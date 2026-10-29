import * as ts from '../ts';
import { Tsoa } from '@tsoa/runtime';

const hasInitializer = (node: ts.Node): node is ts.HasInitializer => 'initializer' in node;
const extractInitializer = (decl?: ts.Declaration) => (decl && hasInitializer(decl) && (decl.initializer as ts.Expression)) || undefined;
function* extractImportSpecifier(symbol?: ts.Symbol): ts.Op<ts.ImportSpecifier | undefined> {
  const declaration = symbol && (yield* ts.getDeclarations(symbol))[0];
  return (declaration && ts.isImportSpecifier(declaration) && declaration) || undefined;
}
const isIterable = (obj: any): obj is Iterable<any> => obj != null && typeof obj[Symbol.iterator] === 'function';

export type InitializerValue = string | number | boolean | undefined | null | InitializerValue[];
export type DefinedInitializerValue = string | number | boolean | null | DefinedInitializerValue[];
export function isNonUndefinedInitializerValue(value: InitializerValue): value is DefinedInitializerValue {
  if (Array.isArray(value)) {
    return value.every(isNonUndefinedInitializerValue);
  } else {
    return value !== undefined;
  }
}

export function* getInitializerValue(initializer?: ts.Expression | ts.ImportSpecifier, typeChecker?: ts.Checker, type?: Tsoa.Type): ts.Op<InitializerValue | DefinedInitializerValue> {
  if (!initializer || !typeChecker) {
    return;
  }

  switch (initializer.kind) {
    case ts.SyntaxKind.ArrayLiteralExpression: {
      const arrayLiteral = initializer as ts.ArrayLiteralExpression;
      const values = yield* ts.map(arrayLiteral.elements, element => getInitializerValue(ts.isSpreadElement(element) ? element.expression : element, typeChecker));
      return arrayLiteral.elements.reduce((acc, element, index) => {
        const value = values[index];
        if (!ts.isSpreadElement(element)) {
          acc.push(value);
        } else if (value && isIterable(value)) {
          return acc.concat(...value);
        } else {
          throw new Error(`${typeof value} is not iterable`);
        }
        return acc;
      }, [] as InitializerValue[]);
    }
    case ts.SyntaxKind.StringLiteral:
    case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
      return (initializer as ts.StringLiteral).text;
    case ts.SyntaxKind.TrueKeyword:
      return true;
    case ts.SyntaxKind.FalseKeyword:
      return false;
    case ts.SyntaxKind.PrefixUnaryExpression: {
      const prefixUnary = initializer as ts.PrefixUnaryExpression;
      switch (prefixUnary.operator) {
        case ts.SyntaxKind.PlusToken:
          return Number((prefixUnary.operand as ts.NumericLiteral).text);
        case ts.SyntaxKind.MinusToken:
          return Number(`-${(prefixUnary.operand as ts.NumericLiteral).text}`);
        default:
          throw new Error(`Unsupport prefix operator token: ${prefixUnary.operator}`);
      }
    }
    case ts.SyntaxKind.NumberKeyword:
    case ts.SyntaxKind.FirstLiteralToken:
      return Number((initializer as ts.NumericLiteral).text);
    case ts.SyntaxKind.NewExpression: {
      const newExpression = initializer as ts.NewExpression;
      const ident = newExpression.expression as ts.Identifier;

      if (ident.text === 'Date') {
        let date = new Date();
        if (newExpression.arguments) {
          const newArguments = newExpression.arguments.filter(args => args.kind !== undefined);
          const argsValue = yield* ts.map(newArguments, args => getInitializerValue(args, typeChecker));
          if (argsValue.length > 0) {
            date = new Date(argsValue as any);
          }
        }
        const dateString = date.toISOString();
        if (type && type.dataType === 'date') {
          return dateString.split('T')[0];
        }
        return dateString;
      }
      return;
    }
    case ts.SyntaxKind.NullKeyword:
      return null;
    case ts.SyntaxKind.ObjectLiteralExpression: {
      const objectLiteral = initializer as ts.ObjectLiteralExpression;
      const nestedObject: any = {};
      const values = yield* ts.map(objectLiteral.properties, (p: any) => getInitializerValue(ts.isSpreadAssignment(p) ? p.expression : p.initializer, typeChecker));
      objectLiteral.properties.forEach((p: any, index) => {
        if (ts.isSpreadAssignment(p)) {
          const spreadValue = values[index];
          if (spreadValue) {
            if (typeof spreadValue === 'object') {
              Object.assign(nestedObject, spreadValue);
            } else {
              throw new Error(`Spread types may only be created from object types.`);
            }
          }
        } else {
          nestedObject[p.name.text] = values[index];
        }
      });
      return nestedObject;
    }
    case ts.SyntaxKind.ImportSpecifier: {
      const importSpecifier = initializer as ts.ImportSpecifier;
      const importSymbol = yield* typeChecker.getSymbolAtLocation.gen(importSpecifier.name);
      if (!importSymbol) return;
      const aliasedSymbol = yield* typeChecker.getAliasedSymbol.gen(importSymbol);
      const declaration = (yield* ts.getDeclarations(aliasedSymbol))[0];
      return yield* getInitializerValue(extractInitializer(declaration), typeChecker);
    }
    default: {
      // A node printed by the checker cannot be looked up; such a value stays unknown.
      const symbol = ts.isSynthetic(initializer) ? undefined : yield* typeChecker.getSymbolAtLocation.gen(initializer);
      const valueDeclaration = symbol && (yield* ts.getValueDeclaration(symbol));
      return yield* getInitializerValue(extractInitializer(valueDeclaration) || (yield* extractImportSpecifier(symbol)), typeChecker);
    }
  }
}
