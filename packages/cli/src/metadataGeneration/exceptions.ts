import { normalize } from 'path';
import { Node, TypeNode } from 'typescript';

export class GenerateMetadataError extends Error {
  constructor(message?: string, node?: Node | TypeNode, onlyCurrent = false) {
    super(message);
    if (node) {
      this.message = `${message!}\n${prettyLocationOfNode(node)}\n${prettyTroubleCause(node, onlyCurrent)}`;
    }
  }
}

export function prettyLocationOfNode(node: Node | TypeNode) {
  const sourceFile = node.getSourceFile();
  const token = node.getFirstToken() || node.parent.getFirstToken();
  const start = token ? `:${sourceFile.getLineAndCharacterOfPosition(token.getStart()).line + 1}` : '';
  const end = token ? `:${sourceFile.getLineAndCharacterOfPosition(token.getEnd()).line + 1}` : '';
  const normalizedPath = normalize(`${sourceFile.fileName}${start}${end}`);
  return `At: ${normalizedPath}.`;
}

export function prettyTroubleCause(node: Node | TypeNode, onlyCurrent = false) {
  let name: string;
  if (onlyCurrent || !node.parent) {
    name = node.pos !== -1 ? node.getText() : (node as any).name.text;
  } else {
    name = node.parent.pos !== -1 ? node.parent.getText() : (node as any).parent.name.text;
  }
  return `This was caused by '${name}'`;
}
