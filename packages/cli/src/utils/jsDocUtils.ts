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
      // JSDoc is only read from source files, so its nodes have source text.
      const target = part.name ? part.name.getText() : '';
      return `{@${tag} ${[target, text].filter(Boolean).join(' ')}}`;
    })
    .join('');
}

/**
 * The documentation of a symbol: the comments of its declarations, or the `@param` tags naming a parameter, one per line.
 * Links keep their `{@link …}` form. Declarations without JSDoc fall back to the documentation the compiler finds, such as inherited documentation.
 */
const documentation: ts.MemoCache<ts.Symbol, string | undefined> = new WeakMap();

// A member without its own comment can inherit one from the classes and interfaces its container extends or implements.
const mayInheritDocumentation = (declaration: ts.Node) => {
  const container = declaration.parent;
  return !!container && (ts.isClassDeclaration(container) || ts.isClassExpression(container) || ts.isInterfaceDeclaration(container)) && !!container.heritageClauses?.length;
};

export function getSymbolDocumentation(symbol: ts.Symbol, checker: ts.Checker): ts.Op<string | undefined> {
  return ts.memo(documentation, symbol, () => symbolDocumentation(symbol, checker));
}

function* symbolDocumentation(symbol: ts.Symbol, checker: ts.Checker): ts.Op<string | undefined> {
  const comments: string[] = [];
  const declarations = yield* ts.getDeclarations(symbol);
  for (const declaration of declarations) {
    for (const commentHolder of ts.getJSDocCommentsAndTags(declaration)) {
      if (ts.isJSDoc(commentHolder) || ts.isJSDocParameterTag(commentHolder)) {
        const comment = renderJSDocComment(commentHolder.comment);
        if (comment && !comments.includes(comment)) {
          comments.push(comment);
        }
      }
    }
  }
  if (comments.length) {
    return comments.join('\n');
  }
  return declarations.some(mayInheritDocumentation) ? (yield* symbol.getDocumentationComment.gen(checker)) || undefined : undefined;
}
