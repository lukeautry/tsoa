import * as ts from 'typescript';

export function getJSDocDescription(node: ts.Node) {
  const jsDocs = (node as any).jsDoc as ts.JSDoc[];
  if (!jsDocs || !jsDocs.length) { return ''; }

  return jsDocs[0].comment || '';
}

export function getJSDocTag(node: ts.Node, tagName: string) {
  const tags = getJSDocTags(node, tagName);
  if (!tags || !tags.length) {
    return;
  }
  return tags[0].comment;
}

export function isExistJSDocTag(node: ts.Node, tagName: string) {
  const tags = getJSDocTags(node, tagName);
  if (!tags || !tags.length) {
    return false;
  }
  return true;
}

function getJSDocTags(node: ts.Node, tagName: string) {
  const jsDocs = (node as any).jsDoc as ts.JSDoc[];
  if (!jsDocs || !jsDocs.length) { return; }

  const jsDoc = jsDocs[0];
  if (!jsDoc.tags) { return; };

  return jsDoc.tags.filter(t => t.tagName.text === tagName);
}
