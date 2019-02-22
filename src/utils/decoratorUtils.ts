import * as ts from 'typescript';
import { getInitializerValue } from '../metadataGeneration/initializer-value';

export function getDecorators(node: ts.Node, isMatching: (identifier: ts.Identifier) => boolean) {
  const decorators = node.decorators;
  if (!decorators || !decorators.length) { return []; }

  return decorators
    .map((e: any) => {
      while (e.expression !== undefined) {
        e = e.expression;
      }

      return e as ts.Identifier;
    })
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
  return getInitializerValue(expArguments[0]);
}

export function isDecorator(node: ts.Node, isMatching: (identifier: ts.Identifier) => boolean) {
  const decorators = getDecorators(node, isMatching);
  if (!decorators || !decorators.length) {
    return false;
  }
  return true;
}
