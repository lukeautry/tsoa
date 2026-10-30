import type { Tsoa } from '@tsoa/runtime';
import * as ts from '../../compiler/index';
import { getDecorators, getNodeFirstDecoratorValue, isDecorator } from '../../utils/decoratorUtils';
import { getJSDocComment, getJSDocComments, getJSDocTagNames, isExistJSDocTag } from '../../utils/jsDocUtils';
import { getPropertyValidators } from '../../utils/validatorUtils';
import { safeFromJson } from '../../utils/jsonUtils';
import { getExtensions, getExtensionsFromJSDocComments } from '../extension';
import type { MetadataGenerator } from '../metadataGenerator';
import { GenerateMetadataError } from '../exceptions';
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
export function nodeDefault(node: ts.Node): unknown {
  const defaultStr = getJSDocComment(node, 'default');
  if (typeof defaultStr == 'string' && defaultStr !== 'undefined') {
    let textStartCharacter: `"` | "'" | '`' | undefined = undefined;
    const inString = () => textStartCharacter !== undefined;

    let formattedStr = '';
    for (let i = 0; i < defaultStr.length; ++i) {
      const actCharacter = defaultStr[i];
      if (inString()) {
        if (actCharacter === textStartCharacter) {
          formattedStr += '"';
          textStartCharacter = undefined;
        } else if (actCharacter === '"') {
          formattedStr += '\\"';
        } else if (actCharacter === '\\') {
          ++i;
          if (i < defaultStr.length) {
            const nextCharacter = defaultStr[i];
            if (['n', 't', 'r', 'b', 'f', '\\', '"'].includes(nextCharacter)) {
              formattedStr += '\\' + nextCharacter;
            } else if (!['v', '0'].includes(nextCharacter)) {
              //\v, \0 characters are not compatible with JSON
              formattedStr += nextCharacter;
            }
          } else {
            formattedStr += actCharacter; // this is a bug, but let the JSON parser decide how to handle it
          }
        } else {
          formattedStr += actCharacter;
        }
      } else {
        if ([`"`, "'", '`'].includes(actCharacter)) {
          textStartCharacter = actCharacter as `"` | "'" | '`';
          formattedStr += '"';
        } else if (actCharacter === '/' && i + 1 < defaultStr.length && defaultStr[i + 1] === '/') {
          i += 2;
          while (i < defaultStr.length && defaultStr[i] !== '\n') {
            ++i;
          }
        } else {
          formattedStr += actCharacter;
        }
      }
    }
    try {
      const parsed = JSON.parse(formattedStr);
      return parsed;
    } catch (err) {
      throw new GenerateMetadataError(`JSON could not parse default str: "${defaultStr}", preformatted: "${formattedStr}"\nmessage: "${((err as any)?.message as string) || '-'}"`);
    }
  }
  return undefined;
}
