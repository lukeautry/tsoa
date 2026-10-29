import * as ts from '../ts';
import { GenerateMetadataError } from '../metadataGeneration/exceptions';
import { getInitializerValue } from '../metadataGeneration/initializer-value';

export function getDecorators(node: ts.Node, isMatching: (identifier: ts.Identifier) => boolean) {
  const decorators = ts.getDecorators(node);

  if (!decorators.length) {
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

export function* getNodeFirstDecoratorValue(node: ts.Node, typeChecker: ts.Checker, isMatching: (identifier: ts.Identifier) => boolean): ts.Op<any> {
  const decorators = getDecorators(node, isMatching);
  if (!decorators || !decorators.length) {
    return;
  }
  const values = yield* getDecoratorValues(decorators[0], typeChecker);
  return values && values[0];
}

export function* getDecoratorValues(decorator: ts.Identifier, typeChecker: ts.Checker): ts.Op<any[]> {
  const expression = decorator.parent as ts.CallExpression;
  const expArguments = expression.arguments;
  if (!expArguments || !expArguments.length) {
    return [];
  }
  return yield* ts.map(expArguments, a => getInitializerValue(a, typeChecker));
}

export function* getSecurites(decorator: ts.Identifier, typeChecker: ts.Checker): ts.Op<Record<string, string[]>> {
  const [first, second] = yield* getDecoratorValues(decorator, typeChecker);
  const security = isObject(first) ? first : { [first]: second || [] };
  const [argument] = (decorator.parent as ts.CallExpression).arguments;
  const names = Object.keys(security);
  const kept = names.length
    ? Object.getPrototypeOf(security) === Object.prototype && names.every(name => name !== '__proto__' && Array.isArray(security[name]))
    : ts.isObjectLiteralExpression(argument) && !argument.properties.length;
  if (!kept) throw new GenerateMetadataError(`Invalid @Security: name each scheme (not '__proto__') and give it an array of scopes. Only a literal {} may be empty.`, decorator);
  return security;
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

export function* getPath(decorator: ts.Identifier, typeChecker: ts.Checker): ts.Op<string> {
  const [path] = yield* getDecoratorValues(decorator, typeChecker);

  if (path === undefined) {
    return '';
  }

  return path;
}

export function* getProduces(node: ts.Node, typeChecker: ts.Checker): ts.Op<string[]> {
  const producesDecorators = getDecorators(node, identifier => identifier.text === 'Produces');

  if (!producesDecorators || !producesDecorators.length) {
    return [];
  }

  const values = yield* ts.map(producesDecorators, decorator => getDecoratorValues(decorator, typeChecker));
  return values.map(([produces]) => produces);
}
