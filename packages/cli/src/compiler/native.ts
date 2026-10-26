import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import type * as ts from 'typescript';

type NativeDiagnostic = { code: number; fileName?: string; text?: string; messageText?: string; message?: string };
type NativeConfigResult = { options: ts.CompilerOptions; fileNames: string[]; errors?: NativeDiagnostic[] };

interface NativeNode {
  kind: number;
  pos: number;
  text?: string;
  defaultType?: NativeNode;
  postfixToken?: NativeNode;
  typeName?: NativeNode;
  left?: NativeNode;
  right?: NativeNode;
  modifiers?: NativeNode[];
  forEachChild(visitor: (node: NativeNode) => void): void;
}
interface NativeType {
  flags: number;
  getSymbol(): NativeSymbol | undefined;
  getAliasSymbol(): NativeSymbol | undefined;
  getTypes(): NativeType[];
  getTarget(): NativeType | undefined;
  getAliasTypeArguments(): NativeType[];
  isUnionType(): boolean;
  isIntersectionType(): boolean;
  isLiteralType(): boolean;
  isStringLiteralType(): boolean;
}
interface NativeSymbol {
  name: string;
  escapedName: string;
  flags: number;
  declarations: Array<{ resolve(): NativeNode }>;
  valueDeclaration?: { resolve(): NativeNode };
  getDocumentationComment(): unknown;
}
interface NativeIndexInfo {
  keyType: NativeType;
  valueType: NativeType;
  type?: NativeType;
}
interface NativeChecker {
  getPropertiesOfType(type: NativeType): NativeSymbol[];
  getPropertyOfType(type: NativeType, name: string): NativeSymbol | undefined;
  getIndexInfosOfType(type: NativeType): NativeIndexInfo[];
  getSymbolAtLocation(node: NativeNode): NativeSymbol | undefined;
  resolveName(name: string, flags: number, location: NativeNode): NativeSymbol | undefined;
  getAliasedSymbol(symbol: NativeSymbol): NativeSymbol;
  getMemberInModuleExports(symbol: NativeSymbol, name: string): NativeSymbol | undefined;
}
interface NativeProject {
  checker: NativeChecker;
  emitter: { printNode(node: unknown): string };
  program: {
    getSourceFileNames(): string[];
    getSourceFile(file: string): NativeNode;
  };
}
interface NativeSnapshot {
  operation: { createdPrograms: Array<{ getProject(): NativeProject }> };
  getProjects(): NativeProject[];
}
interface NativeAPI {
  parseConfigFile(file: string): NativeConfigResult;
  printer?: { printNode(node: unknown): string };
  createSnapshot?(options: { createPrograms: Array<{ rootFiles: string[]; compilerOptions: ts.CompilerOptions }> }): NativeSnapshot;
  updateSnapshot?(options: { openProject: string }): NativeSnapshot;
  close(): void;
}
export interface NativeSync {
  API: new (options: { cwd: string }) => NativeAPI;
  ModuleKind: Record<number, string>;
  TypeFlags: { String: number; Number: number };
  SymbolFlags: { Type: number; Namespace: number; Alias: number };
}
export interface NativeAST {
  SyntaxKind: { Decorator: number; PropertySignature: number; PropertyDeclaration: number; MethodSignature: number; Parameter: number; QuestionToken: number };
  ScriptTarget: Record<number, string>;
}

// The unstable native API has different types across TypeScript 7 and tsrs.
// Keep its structural adaptation here; the resolver only sees the classic surface.
export function nativeCompiler(sync: NativeSync, ast: NativeAST, name: string, typescript70: boolean) {
  const directory = mkdtempSync(join(tmpdir(), 'tsoa-compiler-'));
  let api: NativeAPI;
  try {
    api = new sync.API({ cwd: process.cwd() });
  } catch (error) {
    rmSync(directory, { recursive: true, force: true });
    throw error;
  }
  let project: NativeProject;
  const surface = {
    ...ast,
    ...sync,
    sys: { fileExists: existsSync, newLine: '\n' },
    findConfigFile(cwd: string) {
      for (let dir = resolve(cwd); ; dir = dirname(dir)) {
        const file = join(dir, 'tsconfig.json');
        if (existsSync(file)) return file;
        if (dirname(dir) === dir) return undefined;
      }
    },
    getParsedCommandLineOfConfigFile(file: string) {
      const parsed: NativeConfigResult = api.parseConfigFile(file);
      return { ...parsed, errors: parsed.errors ?? [] };
    },
    formatDiagnostics(diagnostics: NativeDiagnostic[]) {
      return diagnostics.map(d => `${d.fileName ?? name}: error TS${d.code}: ${d.text ?? d.messageText ?? d.message}`).join('\n');
    },
    forEachChild: (node: NativeNode, visitor: (node: NativeNode) => void) => node.forEachChild(visitor),
    canHaveDecorators: () => true,
    getDecorators: (node: NativeNode) => node.modifiers?.filter((m: NativeNode) => m.kind === ast.SyntaxKind.Decorator),
    getModifiers: (node: NativeNode) => node.modifiers?.filter((m: NativeNode) => m.kind !== ast.SyntaxKind.Decorator),
    displayPartsToString: (parts: string) => parts,
    isPropertySignature: (node: NativeNode) => node.kind === ast.SyntaxKind.PropertySignature,
    isPropertyDeclaration: (node: NativeNode) => node.kind === ast.SyntaxKind.PropertyDeclaration,
    isMethodSignature: (node: NativeNode) => node.kind === ast.SyntaxKind.MethodSignature,
    isParameter: (node: NativeNode) => node.kind === ast.SyntaxKind.Parameter,
    printNode: (node: unknown) => (api.printer ?? project.emitter).printNode(node),
    createProgram(roots: string[], options: ts.CompilerOptions) {
      const compilerOptions: Record<string, unknown> = { ...options };
      delete compilerOptions.configFilePath;
      delete compilerOptions.pathsBasePath;
      // Native parseConfigFile returns numeric options, but a tsconfig takes names.
      const originalConfig = options.configFilePath as string | undefined;
      const inherited = originalConfig ? api.parseConfigFile(originalConfig).options : {};
      const enums: Record<string, Record<number, string>> = { target: ast.ScriptTarget, module: sync.ModuleKind };
      for (const [key, value] of Object.entries(compilerOptions)) {
        if (typeof value !== 'number') continue;
        if (enums[key]?.[value]) compilerOptions[key] = enums[key][value].toLowerCase();
        else if (inherited[key] === value) delete compilerOptions[key];
        else throw new Error(`Numeric compiler option "${key}" is not supported with the ${name} compiler backend.`);
      }
      if (options.lib) compilerOptions.lib = options.lib.map((lib: string) => lib.replace(/^lib\./, '').replace(/\.d\.ts$/, ''));
      if (compilerOptions.paths) {
        const base = options.pathsBasePath as string | undefined;
        compilerOptions.paths = Object.fromEntries(Object.entries(options.paths!).map(([key, paths]) => [key, paths.map(p => resolve(base ?? process.cwd(), p))]));
      }
      if (options.typeRoots) compilerOptions.typeRoots = options.typeRoots.map((root: string) => resolve(root));
      const config = join(directory, 'tsconfig.json');
      writeFileSync(config, JSON.stringify({ extends: originalConfig, compilerOptions, files: roots.map(file => resolve(file)), include: [], exclude: [] }));
      if (!typescript70) {
        const parsed = api.parseConfigFile(config);
        const snapshot = api.createSnapshot!({ createPrograms: [{ rootFiles: parsed.fileNames, compilerOptions: parsed.options }] });
        project = snapshot.operation.createdPrograms[0]?.getProject();
      } else {
        const snapshot = api.updateSnapshot!({ openProject: config });
        project = snapshot.getProjects()[0];
      }
      if (!project) throw new Error(`${name}: could not open the metadata project.`);
      const checker = classicChecker(project.checker, sync.TypeFlags, sync.SymbolFlags, name, ast.SyntaxKind.QuestionToken);
      return {
        getTypeChecker: () => checker,
        getSourceFiles: () => project.program.getSourceFileNames().map((file: string) => normalizeNode(project.program.getSourceFile(file), ast.SyntaxKind.QuestionToken)),
      };
    },
  };
  return {
    surface: surface as unknown as typeof ts,
    close() {
      try {
        api.close();
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    },
  };
}

const normalizedNodes = new WeakSet<object>();
function normalizeNode(node: NativeNode, questionToken: number): NativeNode {
  if (normalizedNodes.has(node)) return node;
  normalizedNodes.add(node);
  if (node.defaultType) Object.defineProperty(node, 'default', { get: () => node.defaultType });
  if (node.postfixToken?.kind === questionToken) Object.defineProperty(node, 'questionToken', { get: () => node.postfixToken });
  node.forEachChild((child: NativeNode) => {
    normalizeNode(child, questionToken);
  });
  return node;
}

function classicChecker(checker: NativeChecker, flags: NativeSync['TypeFlags'], symbols: NativeSync['SymbolFlags'], name: string, questionToken: number) {
  const locations = new WeakMap<object, any>();
  const referenceNames = new WeakSet<object>();
  const adapted = new WeakMap<object, any>();
  const originals = new WeakMap<object, any>();
  const unwrap = (value: any) => (value && typeof value === 'object' ? (originals.get(value) ?? value) : value);
  const wrap = (value: any): any => {
    if (!value || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(wrap);
    if (adapted.has(value)) return adapted.get(value);
    let getters: Record<string, () => any>;
    if (typeof value.getAliasSymbol === 'function') {
      const type = value as NativeType;
      getters = {
        symbol: () => type.getSymbol(),
        aliasSymbol: () => type.getAliasSymbol(),
        types: () => type.getTypes(),
        type: () => type.getTarget(),
        target: () => type.getTarget(),
        aliasTypeArguments: () => type.getAliasTypeArguments(),
        getFlags: () => () => type.flags,
        isUnion: () => () => type.isUnionType(),
        isIntersection: () => () => type.isIntersectionType(),
        isUnionOrIntersection: () => () => type.isUnionType() || type.isIntersectionType(),
        isLiteral: () => () => type.isLiteralType(),
        isStringLiteral: () => () => type.isStringLiteralType(),
        getProperties: () => () => checker.getPropertiesOfType(type),
        getProperty: () => (name: string) => checker.getPropertyOfType(type, name),
        getStringIndexType: () => () => checker.getIndexInfosOfType(type).find((info: NativeIndexInfo) => info.keyType.flags & flags.String)?.valueType,
        getNumberIndexType: () => () => checker.getIndexInfosOfType(type).find((info: NativeIndexInfo) => info.keyType.flags & flags.Number)?.valueType,
      };
    } else if (typeof value.getDocumentationComment === 'function') {
      const symbol = value as NativeSymbol;
      getters = {
        declarations: () => symbol.declarations.map((handle: { resolve(): NativeNode }) => handle.resolve()),
        valueDeclaration: () => symbol.valueDeclaration?.resolve(),
        getDeclarations: () => () => symbol.declarations.map((handle: { resolve(): NativeNode }) => handle.resolve()),
        getName: () => () => symbol.name,
        getEscapedName: () => () => symbol.escapedName,
        getFlags: () => () => symbol.flags,
      };
    } else {
      return value;
    }
    const proxy = new Proxy(value, {
      get(target, key: string) {
        const result: unknown = getters[key] ? getters[key]() : Reflect.get(target, key);
        return typeof result === 'function' ? (...args: any[]) => wrap(result.apply(target, args.map(unwrap))) : wrap(result);
      },
    });
    adapted.set(value, proxy);
    originals.set(proxy, value);
    return proxy;
  };
  const proxy = new Proxy(checker, {
    get(target, key) {
      if (key === 'getIndexInfosOfType')
        return (type: any) => target.getIndexInfosOfType(unwrap(type)).map((info: NativeIndexInfo) => ({ ...info, type: wrap(info.type ?? info.valueType), keyType: wrap(info.keyType) }));
      if (key === 'getSymbolAtLocation')
        return (node: NativeNode) => {
          if (!referenceNames.has(node)) return node.pos !== -1 ? wrap(target.getSymbolAtLocation(node)) : undefined;
          const location = locations.get(node);
          // Printed names may be qualified (`TsoaTest.TestModel73`); resolve them left to right, as classic `getSymbolAtLocation` does.
          const entity = (name: NativeNode, meaning: number): NativeSymbol | undefined => {
            if (name.text !== undefined) return target.resolveName(name.text, meaning, location);
            const left = name.left && entity(name.left, symbols.Namespace | symbols.Alias);
            return left && name.right?.text !== undefined ? target.getMemberInModuleExports(left.flags & symbols.Alias ? target.getAliasedSymbol(left) : left, name.right.text) : undefined;
          };
          const symbol = location ? entity(node, symbols.Type) : undefined;
          if (!symbol) throw new Error(`Synthetic type reference lookup is not supported with the ${name} compiler backend.`);
          return wrap(symbol);
        };
      const result: unknown = Reflect.get(target, key);
      return typeof result === 'function'
        ? (...args: any[]) => {
            const location =
              key === 'getTypeOfSymbolAtLocation' ? (unwrap(args[0]) as NativeSymbol).declarations?.[0]?.resolve() : args[0]?.pos >= 0 ? args[0] : args[0] && locations.get(unwrap(args[0]));
            if (key === 'typeToTypeNode' && !args[1]) args[1] = location;
            const raw = result.apply(target, args.map(unwrap));
            if (raw && typeof raw === 'object' && location) locations.set(raw, location);
            if (key === 'typeToTypeNode' && raw) {
              const source = args[1] ?? location;
              const mark = (node: NativeNode) => {
                // Printed nodes have no server-side handles, even when they retain source positions.
                Object.defineProperty(node, 'pos', { value: -1 });
                if (node.typeName) referenceNames.add(node.typeName);
                if (source) locations.set(node, source);
                node.forEachChild(mark);
              };
              mark(raw);
              normalizeNode(raw, questionToken);
            }
            return wrap(raw);
          }
        : result;
    },
  });
  originals.set(proxy, checker);
  return proxy;
}
