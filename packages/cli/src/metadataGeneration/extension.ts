import * as ts from 'typescript';
import { getInitializerValue, isNonUndefinedInitializerValue } from './initializer-value';
import { MetadataGenerator } from './metadataGenerator';
import { Tsoa } from '@tsoa/runtime';
import { safeFromJson } from '../utils/jsonUtils';

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

    assertValidExtensionKey(attributeKey);

    const attributeValue = getInitializerValue(decoratorValueArg, metadataGenerator.typeChecker);
    if (!isNonUndefinedInitializerValue(attributeValue)) {
      throw new Error(`Extension '${attributeKey}' cannot have an undefined initializer value`);
    }
    return { key: attributeKey, value: attributeValue };
  });

  return extensions;
}

export function getExtensionsFromJSDocComments(comments: string[]): Tsoa.Extension[] {
  const extensions: Tsoa.Extension[] = [];
  comments.forEach(comment => {
    const extensionData = safeFromJson(comment);
    if (extensionData) {
      const keys = Object.keys(extensionData);
      keys.forEach(key => {
        assertValidExtensionKey(key);
        extensions.push({ key: key, value: extensionData[key] });
      });
    }
  });

  return extensions;
}

function assertValidExtensionKey(key: string): asserts key is `x-${string}` {
  if (!key.startsWith('x-')) {
    throw new Error('Extensions must begin with "x-" to be valid. Please see the following link for more information: https://swagger.io/docs/specification/openapi-extensions/');
  }
}
