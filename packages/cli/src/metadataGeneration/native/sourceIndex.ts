/**
 * The program's source files, parsed by TypeScript 6, and the map between their nodes and the protocol's NodeRefs.
 * Node queries are answered per node, from `prefetchFile` when the file was prefetched, else by one request.
 */
import * as path from 'node:path';
import * as ts from 'typescript';
import { kindName } from './flags';
import { defineBoundSymbol, isDeclaration } from './internals';
import type { Answer, FileId, FileInfo, NodeRef, SymbolId } from './protocol';
import type { HelperSession, NodeOp } from './session';

export interface SourceIndex {
  /** The program's own files, in the helper's order. */
  ownFiles: () => ts.SourceFile[];
  isDefaultLibrary: (sourceFile: ts.SourceFile) => boolean;
  /** The node's NodeRef; throws for a node outside the program's files. */
  refOf: (node: ts.Node) => NodeRef;
  fromRef: (ref: NodeRef | undefined) => ts.Node | undefined;
  /** Asks `prefetchFile` once per file, seeding `nodeAnswer`. Declaration files are never prefetched. */
  ensurePrefetched: (file: FileId) => void;
  nodeAnswer: <O extends NodeOp>(op: O, node: ts.Node) => Answer<O>;
  /** Gives each declaration node its `symbol`, which TypeScript 6 code reads; called once, before any node is indexed. */
  bindDeclarationSymbols: (symbolOf: (id: SymbolId | null) => ts.Symbol | undefined) => void;
}

const nodeKey = (pos: number, end: number, kind: string) => `${pos}:${end}:${kind}`;

export function createSourceIndex(session: HelperSession, rootFiles: readonly string[], compilerOptions: ts.CompilerOptions): SourceIndex {
  const files = session.opened.files;
  const absoluteRoots = rootFiles.map(file => path.resolve(file));
  // Declaration files (lib.*.d.ts, @types, package typings) are parsed only when a fact points into them. tsoa walks
  // only the program's own files for controllers.
  const sourceFiles = new Map<FileId, ts.SourceFile>();
  const fileIds = new Map<ts.SourceFile, FileId>();
  const defaultLibraries = new Set<ts.SourceFile>();
  const infos = new Map(files.map(info => [info.id, info]));
  const parseFile = (info: FileInfo) => {
    const text = session.askHelper({ op: 'fileText', file: info.id });
    // TypeScript 6 names a root file as it was given (relative stays relative), other files by their resolved path.
    const given = rootFiles[absoluteRoots.indexOf(info.fileName)];
    const fileName = info.fileName.startsWith('bundled:///') ? path.join('/__tsoa_bundled__', info.fileName.slice('bundled:///'.length)) : (given ?? info.fileName);
    const sourceFile = ts.createSourceFile(fileName, text, compilerOptions.target ?? ts.ScriptTarget.ES2021, true);
    fileIds.set(sourceFile, info.id);
    if (info.isDefaultLibrary) defaultLibraries.add(sourceFile);
    sourceFiles.set(info.id, sourceFile);
    return sourceFile;
  };
  const fileOf = (id: FileId) => {
    const sourceFile = sourceFiles.get(id);
    if (sourceFile) return sourceFile;
    const info = infos.get(id);
    if (!info) throw new Error(`tsoa compiler helper: unknown file ${id}`);
    return parseFile(info);
  };
  for (const info of files) {
    if (!info.isDeclarationFile) parseFile(info);
  }

  let symbolOf: (id: SymbolId | null) => ts.Symbol | undefined = () => {
    throw new Error('tsoa compiler helper: declaration symbols are not bound yet');
  };

  // One walk per file indexes nodes by NodeRef key (the first in preorder wins) and gives declarations their symbol.
  const nodeIndexes = new Map<ts.SourceFile, Map<string, ts.Node>>();
  const indexFile = (sourceFile: ts.SourceFile) => {
    let index = nodeIndexes.get(sourceFile);
    if (index) return index;
    const nodes = new Map<string, ts.Node>();
    const visit = (node: ts.Node) => {
      const key = nodeKey(node.pos, node.end, kindName(node.kind));
      if (!nodes.has(key)) nodes.set(key, node);
      if (isDeclaration(node)) defineBoundSymbol(node, () => symbolOf(nodeAnswer('symbolOfDeclaration', node)));
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    index = nodes;
    nodeIndexes.set(sourceFile, index);
    return index;
  };
  const fromRef = (ref: NodeRef | undefined): ts.Node | undefined => {
    if (!ref) return undefined;
    const sourceFile = fileOf(ref.file);
    if (ref.kind === 'SourceFile') return sourceFile;
    const node = indexFile(sourceFile).get(nodeKey(ref.pos, ref.end, ref.kind));
    if (!node) throw new Error(`tsoa compiler helper: no TypeScript 6 node at ${sourceFile.fileName}:${ref.pos}-${ref.end} ${ref.kind}`);
    return node;
  };
  const refOf = (node: ts.Node): NodeRef => {
    const file = node.pos < 0 ? undefined : fileIds.get(node.getSourceFile());
    if (file === undefined) throw new Error(`tsoa compiler helper: node outside the program: ${kindName(node.kind)}`);
    return { file, pos: node.pos, end: node.end, kind: kindName(node.kind) };
  };

  // Per-file answers for every identifier, type node and declaration (protocol revision 4b).
  const byNode: Record<NodeOp, WeakMap<ts.Node, number | null>> = {
    symbolAtLocation: new WeakMap(),
    typeFromTypeNode: new WeakMap(),
    symbolOfDeclaration: new WeakMap(),
  };
  const prefetched = new Set<FileId>();
  const ensurePrefetched = (file: FileId) => {
    if (prefetched.has(file)) return;
    prefetched.add(file);
    const sourceFile = fileOf(file);
    if (sourceFile.isDeclarationFile) return;
    const answers = session.askHelper({ op: 'prefetchFile', file }, `tsoa compiler helper failed on ${infos.get(file)!.fileName}`);
    const index = indexFile(sourceFile);
    const seed = (op: NodeOp, entries: Array<[number, number, string, number | null]>) => {
      for (const [pos, end, kind, id] of entries) {
        const node = index.get(nodeKey(pos, end, kind));
        if (node) byNode[op].set(node, id);
      }
    };
    seed('symbolAtLocation', answers.symbolAt);
    seed('typeFromTypeNode', answers.typeFrom);
    seed('symbolOfDeclaration', answers.declared);
    session.learnTypesOfSymbols(answers.typeOfSymbol);
  };
  const nodeAnswer = <O extends NodeOp>(op: O, node: ts.Node): Answer<O> => {
    const answers = byNode[op];
    if (!answers.has(node)) {
      const ref = refOf(node);
      ensurePrefetched(ref.file);
      if (!answers.has(node)) answers.set(node, session.askHelper({ op, node: ref }));
    }
    return answers.get(node) as Answer<O>;
  };

  return {
    ownFiles: () => files.filter(info => !info.isDeclarationFile).map(info => fileOf(info.id)),
    isDefaultLibrary: sourceFile => defaultLibraries.has(sourceFile),
    refOf,
    fromRef,
    ensurePrefetched,
    nodeAnswer,
    bindDeclarationSymbols: bind => {
      symbolOf = bind;
    },
  };
}
