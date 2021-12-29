import * as ts from 'typescript';
import { GenerateMetadataError } from '../metadataGeneration/exceptions';

export function getJSDocDescription(node: ts.Node) {
  const jsDocs = (node as any).jsDoc as ts.JSDoc[];
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
  const tags = getJSDocTags(node, tag => tag.tagName.text === tagName || tag.tagName.escapedText === tagName);
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
    tags = getJSDocTags(node.parent as any, tag => {
      if (ts.isJSDocParameterTag(tag)) {
        return false;
      } else if (tag.comment === undefined) {
        throw new GenerateMetadataError(`Orphan tag: @${String(tag.tagName.text || tag.tagName.escapedText)} should have a parameter name follows with.`);
      }

      return commentToString(tag.comment)?.startsWith(parameterName) || false;
    });
  } else {
    tags = getJSDocTags(node as any, tag => {
      return requireTagName ? tag.comment !== undefined : true;
    });
  }
  return tags.map(tag => {
    return tag.tagName.text;
  });
}

export function getJSDocTags(node: ts.Node, isMatching: (tag: ts.JSDocTag) => boolean) {
  const jsDocs = (node as any).jsDoc as ts.JSDoc[];
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
