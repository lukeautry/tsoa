import * as ts from 'typescript';

export function getDecorators(node: ts.Node, isMatching: (identifier: ts.Identifier) => boolean) {
  const decorators = node.decorators;
  if (!decorators || !decorators.length) { return; }

  return decorators
    .map(d => d.expression as ts.CallExpression)
    .map(e => e.expression as ts.Identifier)
    .filter(isMatching);
}

export function getDecoratorName(node: ts.Node, isMatching: (identifier: ts.Identifier) => boolean) {
  const decorators = getDecorators(node, isMatching);
  if (!decorators || !decorators.length) { return; }

  return decorators[0].text;
}

export function getDecoratorTextValue(node: ts.Node, isMatching: (identifier: ts.Identifier) => boolean) {
  const decorators = getDecorators(node, isMatching);
  if (!decorators || !decorators.length) { return; }

  const expression = decorators[0].parent as ts.CallExpression;
  const expArguments = expression.arguments;
  if (!expArguments || !expArguments.length) { return; }
  return (expArguments[0] as ts.StringLiteral).text;
}

export function getDecoratorOptionValue(node: ts.Node, isMatching: (identifier: ts.Identifier) => boolean) {
  const decorators = getDecorators(node, isMatching);
  if (!decorators || !decorators.length) { return; }

  const expression = decorators[0].parent as ts.CallExpression;
  const expArguments = expression.arguments;
  if (!expArguments || !expArguments.length) { return; }
  return getInitializerValue(expArguments[0] as any);
}

export function isDecorator(node: ts.Node, isMatching: (identifier: ts.Identifier) => boolean) {
  const decorators = getDecorators(node, isMatching);
  if (!decorators || !decorators.length) {
    return false;
  }
  return true;
}

export function getInitializerValue(initializer: any) {
  switch (initializer.kind as ts.SyntaxKind) {
    case ts.SyntaxKind.ArrayLiteralExpression:
      return initializer.elements.map((e: any) => getInitializerValue(e));
    case ts.SyntaxKind.StringLiteral:
      return initializer.text;
    case ts.SyntaxKind.TrueKeyword:
      return true;
    case ts.SyntaxKind.FalseKeyword:
      return false;
    case ts.SyntaxKind.NumberKeyword:
    case ts.SyntaxKind.FirstLiteralToken:
      return parseInt(initializer.text, 10);
    case ts.SyntaxKind.ObjectLiteralExpression:
      const nestedObject: any = {};

      initializer.properties.forEach((p: any) => {
        nestedObject[p.name.text] = getInitializerValue(p.initializer);
      });

      return nestedObject;
    default:
      return undefined;
  }
}
