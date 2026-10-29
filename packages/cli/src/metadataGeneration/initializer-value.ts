import * as ts from '../ts';
import { Tsoa } from '@tsoa/runtime';

const hasInitializer = (node: ts.Node): node is ts.HasInitializer => 'initializer' in node;
const extractInitializer = (decl?: ts.Declaration) => (decl && hasInitializer(decl) && (decl.initializer as ts.Expression)) || undefined;
const extractImportSpecifier = (symbol?: ts.Symbol) => {
  const declaration = symbol && ts.getDeclarations(symbol)[0];
  return (declaration && ts.isImportSpecifier(declaration) && declaration) || undefined;
};
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

export function getInitializerValue(initializer?: ts.Expression | ts.ImportSpecifier, typeChecker?: ts.Checker, type?: Tsoa.Type): InitializerValue | DefinedInitializerValue {
  if (!initializer || !typeChecker) {
    return;
  }

  switch (initializer.kind) {
    case ts.SyntaxKind.ArrayLiteralExpression: {
      const arrayLiteral = initializer as ts.ArrayLiteralExpression;
      return arrayLiteral.elements.reduce((acc, element) => {
        if (ts.isSpreadElement(element)) {
          const spreadValue = getInitializerValue(element.expression, typeChecker);
          if (spreadValue && isIterable(spreadValue)) {
            return acc.concat(...spreadValue);
          } else {
            throw new Error(`${typeof spreadValue} is not iterable`);
          }
        } else {
          acc.push(getInitializerValue(element, typeChecker));
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
          const argsValue = newArguments.map(args => getInitializerValue(args, typeChecker));
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
      objectLiteral.properties.forEach((p: any) => {
        if (ts.isSpreadAssignment(p)) {
          const spreadValue = getInitializerValue(p.expression, typeChecker);
          if (spreadValue) {
            if (typeof spreadValue === 'object') {
              Object.assign(nestedObject, spreadValue);
            } else {
              throw new Error(`Spread types may only be created from object types.`);
            }
          }
        } else {
          nestedObject[p.name.text] = getInitializerValue(p.initializer, typeChecker);
        }
      });
      return nestedObject;
    }
    case ts.SyntaxKind.ImportSpecifier: {
      const importSpecifier = initializer as ts.ImportSpecifier;
      const importSymbol = typeChecker.getSymbolAtLocation(importSpecifier.name);
      if (!importSymbol) return;
      const aliasedSymbol = typeChecker.getAliasedSymbol(importSymbol);
      const declaration = ts.getDeclarations(aliasedSymbol)[0];
      return getInitializerValue(extractInitializer(declaration), typeChecker);
    }
    default: {
      // A node printed by the checker cannot be looked up; such a value stays unknown.
      const symbol = ts.isSynthetic(initializer) ? undefined : typeChecker.getSymbolAtLocation(initializer);
      return getInitializerValue(extractInitializer(symbol && ts.getValueDeclaration(symbol)) || extractImportSpecifier(symbol), typeChecker);
    }
  }
}
