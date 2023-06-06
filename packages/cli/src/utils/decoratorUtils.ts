import * as ts from 'typescript';
import { getInitializerValue } from '../metadataGeneration/initializer-value';

function tsHasDecorators(tsNamespace: typeof ts): tsNamespace is typeof ts & {
  canHaveDecorators(node: ts.Node): node is any;
  getDecorators(node: ts.Node): readonly ts.Decorator[] | undefined;
} {
  return typeof tsNamespace.canHaveDecorators === 'function';
}

export function getDecorators(node: ts.Node, isMatching: (identifier: ts.Identifier) => boolean) {
  // beginning in ts4.8 node.decorator is undefined, use getDecorators instead.
  const decorators = tsHasDecorators(ts) && ts.canHaveDecorators(node) ? ts.getDecorators(node) : [];

  if (!decorators || !decorators.length) {
    return [];
  }

  return decorators
    .map((e: any) => {
      while (e.expression !== undefined) {
        e = e.expression;
      }

      return e as ts.Identifier;
    })
    .filter(isMatching);
}

export function getNodeFirstDecoratorName(node: ts.Node, isMatching: (identifier: ts.Identifier) => boolean) {
  const decorators = getDecorators(node, isMatching);
  if (!decorators || !decorators.length) {
    return;
  }

  return decorators[0].text;
}

export function getNodeFirstDecoratorValue(node: ts.Node, typeChecker: ts.TypeChecker, isMatching: (identifier: ts.Identifier) => boolean) {
  const decorators = getDecorators(node, isMatching);
  if (!decorators || !decorators.length) {
    return;
  }
  const values = getDecoratorValues(decorators[0], typeChecker);
  return values && values[0];
}

export function getDecoratorValues(decorator: ts.Identifier, typeChecker: ts.TypeChecker): any[] {
  const expression = decorator.parent as ts.CallExpression;
  const expArguments = expression.arguments;
  if (!expArguments || !expArguments.length) {
    return [];
  }
  return expArguments.map(a => getInitializerValue(a, typeChecker));
}

export function getSecurites(decorator: ts.Identifier, typeChecker: ts.TypeChecker) {
  const [first, second] = getDecoratorValues(decorator, typeChecker);
  if (isObject(first)) {
    return first;
  }
  return { [first]: second || [] };
}

export function isDecorator(node: ts.Node, isMatching: (identifier: ts.Identifier) => boolean) {
  const decorators = getDecorators(node, isMatching);
  if (!decorators || !decorators.length) {
    return false;
  }
  return true;
}

function isObject(v: any) {
  return typeof v === 'object' && v !== null;
}

export function getPath(decorator: ts.Identifier, typeChecker: ts.TypeChecker): string {
  const [path] = getDecoratorValues(decorator, typeChecker);

  if (path === undefined) {
    return '';
  }

  return path;
}

export function getProduces(node: ts.Node, typeChecker: ts.TypeChecker): string[] {
  const producesDecorators = getDecorators(node, identifier => identifier.text === 'Produces');

  if (!producesDecorators || !producesDecorators.length) {
    return [];
  }

  return producesDecorators.map(decorator => getDecoratorValues(decorator, typeChecker)[0]);
}
