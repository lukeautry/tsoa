import * as ts from 'typescript';
import { getInitializerValue } from './initializer-value';
import { MetadataGenerator } from './metadataGenerator';
import { Tsoa } from './tsoa';

export function getCustomAttributes(decorators: ts.Identifier[], metadataGenerator: MetadataGenerator): Tsoa.CustomAttribute[] {
  const customAttributes: Tsoa.CustomAttribute[] = decorators.map(customAttributeDecorator => {
    if (!ts.isCallExpression(customAttributeDecorator.parent)) {
      throw new Error('The parent of the @CustomAttribute is not a CallExpression. Are you using it in the right place?');
    }

    const [decoratorKeyArg, decoratorValueArg] = customAttributeDecorator.parent.arguments;

    if (!ts.isStringLiteral(decoratorKeyArg)) {
      throw new Error('The First argument of @CustomAttribute must be the attribute key as a string');
    }

    const attributeKey = decoratorKeyArg.text;

    if (!decoratorValueArg) {
      throw new Error(`Custom Attribute '${attributeKey}' must contain a value`);
    }

    if (attributeKey.indexOf('x-') !== 0) {
      throw new Error('Custom attributes must begin with "x-" to be valid. Please see the following link for more information: https://swagger.io/docs/specification/openapi-extensions/');
    }

    const attributeValue = getInitializerValue(decoratorValueArg, metadataGenerator.typeChecker);

    return { key: attributeKey, value: attributeValue };
  });

  return customAttributes;
}
