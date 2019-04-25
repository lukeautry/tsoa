import * as ts from 'typescript';
import { getInitializerValue } from './initializer-value';
import { Tsoa } from './tsoa';

export function getCustomAttributes(decorators: ts.Identifier[]): Tsoa.CustomAttribute[] {
  const customAttributes: Tsoa.CustomAttribute[] = decorators.map((customAttributeDecorator: ts.Identifier) => {
    const expression = customAttributeDecorator.parent as ts.CallExpression;

    const [decoratorKeyArg, decoratorValueArg] = expression.arguments;

    if (decoratorKeyArg.kind !== ts.SyntaxKind.StringLiteral) {
      throw new Error('First argument of Custom Attribute must be the attribute key as a string');
    }

    const attributeKey = getInitializerValue(decoratorKeyArg);

    if (!decoratorValueArg) {
      throw new Error(`Custom Attribute '${attributeKey}' must contain a value`);
    }

    const attributeValue = getInitializerValue(decoratorValueArg);

    return { key: attributeKey, value: attributeValue };
  });

  return customAttributes;
}
