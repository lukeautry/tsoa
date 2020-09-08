import * as ts from 'typescript';
import { Tsoa } from '@tsoa/runtime';

export const getInitializerValue = (initializer?: ts.Expression, typeChecker?: ts.TypeChecker, type?: Tsoa.Type) => {
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
    case ts.SyntaxKind.ObjectLiteralExpression:
      const objectLiteral = initializer as ts.ObjectLiteralExpression;
      const nestedObject: any = {};
      objectLiteral.properties.forEach((p: any) => {
        nestedObject[p.name.text] = getInitializerValue(p.initializer, typeChecker);
      });
      return nestedObject;
    default:
      const symbol = typeChecker.getSymbolAtLocation(initializer);
      const extractedInitializer = symbol && symbol.valueDeclaration && hasInitializer(symbol.valueDeclaration) && (symbol.valueDeclaration.initializer as ts.Expression);
      return extractedInitializer ? getInitializerValue(extractedInitializer, typeChecker) : undefined;
  }
};

const hasInitializer = (node: ts.Node): node is ts.HasInitializer => node.hasOwnProperty('initializer');
