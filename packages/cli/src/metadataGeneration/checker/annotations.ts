import type { Tsoa } from '@tsoa/runtime';
import * as ts from 'typescript';
import { getDecorators, getNodeFirstDecoratorValue } from '../../utils/decoratorUtils';
import { getJSDocComment, getJSDocComments } from '../../utils/jsDocUtils';
import { safeFromJson } from '../../utils/jsonUtils';
import { getExtensions, getExtensionsFromJSDocComments } from '../extension';
import type { MetadataGenerator } from '../metadataGenerator';
import { TypeResolver } from '../typeResolver';
import { symbolAt } from './declarations';

/** JSDoc description of the symbol named by `nameNode`. */
export function nodeDescription(checker: ts.TypeChecker, nameNode: ts.Node | undefined): string | undefined {
  const symbol = nameNode ? symbolAt(checker, nameNode) : undefined;
  const comments = symbol ? symbol.getDocumentationComment(checker) : [];
  return comments.length ? ts.displayPartsToString(comments) : undefined;
}

/** `@example` JSON, or the value of an `@Example(...)` decorator. */
export function nodeExample(checker: ts.TypeChecker, node: ts.Node): unknown {
  const exampleJSDoc = getJSDocComment(node, 'example');
  if (exampleJSDoc) {
    return safeFromJson(exampleJSDoc);
  }
  return getNodeFirstDecoratorValue(node, checker, dec => dec.text === 'Example');
}

/** `@Extension(...)` decorators followed by `@extension` JSDoc tags. */
export function nodeExtensions(generator: MetadataGenerator, node: ts.Node): Tsoa.Extension[] {
  const fromDecorators = getExtensions(
    getDecorators(node, identifier => identifier.text === 'Extension'),
    generator,
  );
  const comments = getJSDocComments(node, 'extension');
  return fromDecorators.concat(comments ? getExtensionsFromJSDocComments(comments) : []);
}

export const nodeFormat = (node: ts.Node) => getJSDocComment(node, 'format');

export const nodeTitle = (node: ts.Node) => getJSDocComment(node, 'title');

/** The parsed `@default` JSDoc value. */
export const nodeDefault = (node: ts.Node): unknown => TypeResolver.getDefault(node);
