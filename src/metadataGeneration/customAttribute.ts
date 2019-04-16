import * as ts from 'typescript';
import { getInitializerValue } from './initializer-value';
import { Tsoa } from './tsoa';

const getArgumentValue = (argument: ts.Expression) => {
  switch (argument.kind as ts.SyntaxKind) {
    case ts.SyntaxKind.StringLiteral: {
      const argumentValue = (argument as any).text;

      return argumentValue;
    }

    case ts.SyntaxKind.ObjectLiteralExpression: {
      const argumentValueProperties = (argument as any).properties;

      const argumentValue = {};

      for (const property of argumentValueProperties) {
        const name = property.name.text;
        const scopes = getInitializerValue(property.initializer);
        argumentValue[name] = scopes;
      }

      return argumentValue;
    }

    case ts.SyntaxKind.ArrayLiteralExpression: {
      const elements = (argument as any).elements;

      const argumentValue = elements.map((element) => getArgumentValue(element));

      return argumentValue;
    }

    default: {
      throw new Error('Custom Attribute values must be of type: string, object, or array');
    }
  }
};

export function getCustomAttributes(decorators: ts.Identifier[]): Tsoa.CustomAttribute[] {
  const customAttributes: Tsoa.CustomAttribute[] = decorators.map((customAttributeDecorator: ts.Identifier) => {
    const expression = customAttributeDecorator.parent as ts.CallExpression;

    const [decoratorKeyArg, decoratorValueArg] = expression.arguments;

    if (decoratorKeyArg.kind !== ts.SyntaxKind.StringLiteral) {
      throw new Error('First argument of Custom Attribute must be the attribute key as a string');
    }

    const attributeKey = getArgumentValue(decoratorKeyArg);

    if (!decoratorValueArg) {
      throw new Error(`Custom Attribute '${attributeKey}' must contain a value`);
    }

    const attributeValue = getArgumentValue(decoratorValueArg);

    return { key: attributeKey, value: attributeValue };
  });

  return customAttributes;
}
