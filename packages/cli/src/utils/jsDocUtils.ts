import * as ts from '../ts';
import { GenerateMetadataError } from '../metadataGeneration/exceptions';

export function getJSDocDescription(node: ts.Node) {
  const jsDocs = node.jsDoc as readonly ts.JSDoc[] | undefined;
  if (!jsDocs || !jsDocs.length) {
    return undefined;
  }

  return commentToString(jsDocs[0].comment) || undefined;
}

export function getJSDocComment(node: ts.Node, tagName: string) {
  const comments = getJSDocComments(node, tagName);
  if (comments && comments.length !== 0) {
    return comments[0];
  }

  return;
}

export function getJSDocComments(node: ts.Node, tagName: string) {
  const tags = getJSDocTags(node, tag => tag.tagName.text === tagName || tag.tagName.text === tagName);
  if (tags.length === 0) {
    return;
  }
  const comments: string[] = [];
  tags.forEach(tag => {
    const comment = commentToString(tag.comment);
    if (comment) comments.push(comment);
  });
  return comments;
}

export function getJSDocTagNames(node: ts.Node, requireTagName = false) {
  let tags: ts.JSDocTag[];
  if (node.kind === ts.SyntaxKind.Parameter) {
    const parameterName = ((node as any).name as ts.Identifier).text;
    tags = getJSDocTags(node.parent, tag => {
      if (ts.isJSDocParameterTag(tag)) {
        return false;
      } else if (tag.comment === undefined && !ts.isJSDocReturnTag(tag)) {
        throw new GenerateMetadataError(`Orphan tag: @${String(tag.tagName.text || tag.tagName.text)} should have a parameter name follows with.`);
      }

      return commentToString(tag.comment)?.startsWith(parameterName) || false;
    });
  } else {
    tags = getJSDocTags(node, tag => {
      return requireTagName ? tag.comment !== undefined : true;
    });
  }
  return tags.map(tag => {
    return tag.tagName.text;
  });
}

export function getJSDocTags(node: ts.Node, isMatching: (tag: ts.JSDocTag) => boolean) {
  const jsDocs = node.jsDoc as readonly ts.JSDoc[] | undefined;
  if (!jsDocs || jsDocs.length === 0) {
    return [];
  }

  const jsDoc = jsDocs[0];
  if (!jsDoc.tags) {
    return [];
  }

  return jsDoc.tags.filter(isMatching);
}

export function isExistJSDocTag(node: ts.Node, isMatching: (tag: ts.JSDocTag) => boolean) {
  const tags = getJSDocTags(node, isMatching);
  if (tags.length === 0) {
    return false;
  }
  return true;
}

export function commentToString(comment?: string | ts.NodeArray<ts.JSDocText | ts.JSDocLink | ts.JSDocComment>): string | undefined {
  if (typeof comment === 'string') {
    return comment;
  } else if (comment) {
    return comment.map(node => node.text).join(' ');
  }

  return undefined;
}

function renderJSDocComment(comment: string | ts.NodeArray<ts.JSDocComment> | undefined): string {
  if (comment === undefined || typeof comment === 'string') {
    return comment ?? '';
  }
  return comment
    .map(part => {
      if (ts.isJSDocText(part)) {
        return part.text;
      }
      const tag = ts.isJSDocLinkCode(part) ? 'linkcode' : ts.isJSDocLinkPlain(part) ? 'linkplain' : 'link';
      const text = part.text.replace(/^[\s|]+/, '');
      const target = part.name ? ts.nodeText(part.name) : '';
      return `{@${tag} ${[target, text].filter(Boolean).join(' ')}}`;
    })
    .join('');
}

/**
 * The documentation of a symbol: the comments of its declarations, or the `@param` tags naming a parameter, one per line.
 * Links keep their `{@link …}` form. Declarations without JSDoc fall back to the documentation the compiler finds, such as inherited documentation.
 */
export function getSymbolDocumentation(symbol: ts.Symbol, checker: ts.Checker): string | undefined {
  const comments: string[] = [];
  for (const declaration of ts.getDeclarations(symbol)) {
    for (const commentHolder of ts.getJSDocCommentsAndTags(declaration)) {
      if (ts.isJSDoc(commentHolder) || ts.isJSDocParameterTag(commentHolder)) {
        const comment = renderJSDocComment(commentHolder.comment);
        if (comment && !comments.includes(comment)) {
          comments.push(comment);
        }
      }
    }
  }
  return comments.length ? comments.join('\n') : symbol.getDocumentationComment(checker) || undefined;
}
