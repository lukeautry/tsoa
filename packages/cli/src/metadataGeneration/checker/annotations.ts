import type { Tsoa } from '@tsoa/runtime';
import * as ts from 'typescript';
import { getDecorators, getNodeFirstDecoratorValue, isDecorator } from '../../utils/decoratorUtils';
import { getJSDocComment, getJSDocComments, getJSDocTagNames, isExistJSDocTag } from '../../utils/jsDocUtils';
import { getPropertyValidators } from '../../utils/validatorUtils';
import { safeFromJson } from '../../utils/jsonUtils';
import { getExtensions, getExtensionsFromJSDocComments } from '../extension';
import type { MetadataGenerator } from '../metadataGenerator';
import { TypeResolver } from '../typeResolver';
import { symbolAt } from './declarations';
import { parameterDocumentation } from './internals';

/** Everything tsoa reads from a declaration's JSDoc and decorators. */
export interface Annotations {
  description?: string;
  example?: unknown;
  /** From `@default` only; property initializers are read by the member resolver. */
  default?: unknown;
  format?: string;
  title?: string;
  deprecated: boolean;
  ignored: boolean;
  validators: Tsoa.Validators;
  extensions: Tsoa.Extension[];
  tagNames: string[];
}

export function readAnnotations(declaration: ts.Node, generator: MetadataGenerator): Annotations {
  const checker = generator.typeChecker;
  const nameNode = (declaration as { name?: ts.Node }).name;
  return {
    description: ts.isParameter(declaration) ? parameterDescription(checker, nameNode) : nodeDescription(checker, nameNode),
    example: nodeExample(checker, declaration),
    default: nodeDefault(declaration),
    format: nodeFormat(declaration),
    title: nodeTitle(declaration),
    deprecated: isExistJSDocTag(declaration, tag => tag.tagName.text === 'deprecated') || isDecorator(declaration, identifier => identifier.text === 'Deprecated'),
    ignored: getJSDocTagNames(declaration).some(tag => tag === 'ignore'),
    validators: getPropertyValidators(declaration) || {},
    extensions: nodeExtensions(generator, declaration),
    tagNames: getJSDocTagNames(declaration),
  };
}

function parameterDescription(checker: ts.TypeChecker, nameNode: ts.Node | undefined): string | undefined {
  const symbol = nameNode ? symbolAt(checker, nameNode) : undefined;
  const comments = symbol ? parameterDocumentation(symbol, checker) : [];
  return comments.length ? ts.displayPartsToString(comments) : undefined;
}

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
