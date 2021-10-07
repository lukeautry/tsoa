import * as ts from 'typescript';
import { Tsoa } from '@tsoa/runtime';

export const getInitializerValue = (initializer?: ts.Expression | ts.ImportSpecifier, typeChecker?: ts.TypeChecker, type?: Tsoa.Type) => {
  if (!initializer || !typeChecker) {
    return;
  }

  switch (initializer.kind) {
    case ts.SyntaxKind.ArrayLiteralExpression:
      const arrayLiteral = initializer as ts.ArrayLiteralExpression;
      return arrayLiteral.elements.map(element => getInitializerValue(element, typeChecker));
    case ts.SyntaxKind.StringLiteral:
      return (initializer as ts.StringLiteral).text;
    case ts.SyntaxKind.TrueKeyword:
      return true;
    case ts.SyntaxKind.FalseKeyword:
      return false;
    case ts.SyntaxKind.NumberKeyword:
    case ts.SyntaxKind.FirstLiteralToken:
      return Number((initializer as ts.NumericLiteral).text);
    case ts.SyntaxKind.NewExpression:
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
    case ts.SyntaxKind.NullKeyword:
      return null;
    case ts.SyntaxKind.ObjectLiteralExpression:
      const objectLiteral = initializer as ts.ObjectLiteralExpression;
      const nestedObject: any = {};
      objectLiteral.properties.forEach((p: any) => {
        nestedObject[p.name.text] = getInitializerValue(p.initializer, typeChecker);
      });
      return nestedObject;
    case ts.SyntaxKind.ImportSpecifier:
      const importSpecifier = initializer as ts.ImportSpecifier;
      const importSymbol = typeChecker.getSymbolAtLocation(importSpecifier.name);
      if (!importSymbol) return;
      const aliasedSymbol = typeChecker.getAliasedSymbol(importSymbol);
      const declarations = aliasedSymbol.getDeclarations();
      const declaration = declarations && declarations.length > 0 ? declarations[0] : undefined;
      return getInitializerValue(extractInitializer(declaration), typeChecker);
    default:
      const symbol = typeChecker.getSymbolAtLocation(initializer);
      return getInitializerValue(extractInitializer(symbol?.valueDeclaration) || extractImportSpecifier(symbol), typeChecker);
  }
};

const hasInitializer = (node: ts.Node): node is ts.HasInitializer => node.hasOwnProperty('initializer');
const extractInitializer = (decl?: ts.Declaration) => (decl && hasInitializer(decl) && (decl.initializer as ts.Expression)) || undefined;
const extractImportSpecifier = (symbol?: ts.Symbol) =>
  (symbol?.declarations && symbol.declarations.length > 0 && ts.isImportSpecifier(symbol.declarations[0]) && (symbol.declarations[0] as ts.ImportSpecifier)) || undefined;
