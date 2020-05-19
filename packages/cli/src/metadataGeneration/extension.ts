import * as ts from 'typescript';
import { getInitializerValue } from './initializer-value';
import { MetadataGenerator } from './metadataGenerator';
import { Tsoa } from '@tsoa/runtime';

export function getExtensions(decorators: ts.Identifier[], metadataGenerator: MetadataGenerator): Tsoa.Extension[] {
  const extensions: Tsoa.Extension[] = decorators.map(extensionDecorator => {
    if (!ts.isCallExpression(extensionDecorator.parent)) {
      throw new Error('The parent of the @Extension is not a CallExpression. Are you using it in the right place?');
    }

    const [decoratorKeyArg, decoratorValueArg] = extensionDecorator.parent.arguments;

    if (!ts.isStringLiteral(decoratorKeyArg)) {
      throw new Error('The first argument of @Extension must be a string');
    }

    const attributeKey = decoratorKeyArg.text;

    if (!decoratorValueArg) {
      throw new Error(`Extension '${attributeKey}' must contain a value`);
    }

    if (attributeKey.indexOf('x-') !== 0) {
      throw new Error('Extensions must begin with "x-" to be valid. Please see the following link for more information: https://swagger.io/docs/specification/openapi-extensions/');
    }

    const attributeValue = getInitializerValue(decoratorValueArg, metadataGenerator.typeChecker);

    return { key: attributeKey, value: attributeValue };
  });

  return extensions;
}
