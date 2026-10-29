import { isAbsolute, normalize, relative } from 'path';
import { isSynthetic, type Node, type TypeNode } from '../ts';

export class GenerateMetadataError extends Error {
  constructor(message?: string, node?: Node | TypeNode, onlyCurrent = false) {
    super(message);
    if (node) {
      this.message = `${message!}\n${prettyLocationOfNode(node)}\n${prettyTroubleCause(node, onlyCurrent)}`;
    }
  }
}

export class GenerateMetaDataWarning {
  constructor(
    private message: string,
    private node: Node | TypeNode,
    private onlyCurrent = false,
  ) {}

  toString() {
    return `Warning: ${this.message}\n${prettyLocationOfNode(this.node)}\n${prettyTroubleCause(this.node, this.onlyCurrent)}`;
  }
}

// Nodes printed by the checker have no position; they are located by the closest node written in source.
function sourceNode(node: Node | undefined): Node | undefined {
  while (node && isSynthetic(node)) {
    node = node.parent;
  }
  return node;
}

export function prettyLocationOfNode(printedOrSourceNode: Node | TypeNode) {
  const node = sourceNode(printedOrSourceNode);
  const sourceFile = node?.getSourceFile();
  if (node && sourceFile) {
    const token = node.getFirstToken() || node.parent.getFirstToken();
    const start = token ? `:${sourceFile.getLineAndCharacterOfPosition(token.getStart()).line + 1}` : '';
    const end = token ? `:${sourceFile.getLineAndCharacterOfPosition(token.getEnd()).line + 1}` : '';
    // The compiler reports absolute paths; files below the working directory are shown relative to it.
    const fromCwd = relative(process.cwd(), sourceFile.fileName);
    const fileName = fromCwd && !fromCwd.startsWith('..') && !isAbsolute(fromCwd) ? fromCwd : sourceFile.fileName;
    const normalizedPath = normalize(`${fileName}${start}${end}`);
    return `At: ${normalizedPath}.`;
  } else {
    return `At unknown position...`;
  }
}

export function prettyTroubleCause(node: Node | TypeNode, onlyCurrent = false) {
  // Errors are often built before it is known whether they are thrown, so printed nodes are not printed here.
  const cause = onlyCurrent || !node.parent ? node : node.parent;
  const name = !isSynthetic(cause) && cause.parent ? cause.getText() : (cause as { name?: { text?: string } }).name?.text || '<unknown name>';
  return `This was caused by '${name}'`;
}
