import * as ts from 'typescript';
import { getInitializerValue } from './../metadataGeneration/resolveType';

export function getDecorators(node: ts.Node, isMatching: (identifier: ts.Identifier) => boolean) {
  const decorators = node.decorators;
  if (!decorators || !decorators.length) { return []; }


  let identifiers : ts.Identifier[] = [];
  // filter and transform decorators in a single loop
  decorators.forEach((d: ts.Decorator) => {
    let expression = d.expression as ts.CallExpression;
    let identifier = expression.expression as ts.Identifier;

    // filter out decorators without expression
    if(!identifier) {
      return;
    }

    // check if identifier matches
    if(isMatching(identifier)) {
      // and push to it to resulting array
      identifiers.push(identifier)
    }
  });

  return identifiers;
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
