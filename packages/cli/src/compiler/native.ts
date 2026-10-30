import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import type * as ts from 'typescript';
import { graphChecker, type Description } from './graph';

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
  getUndefinedType(): NativeType;
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
    getSourceFile: ((file: string) => NativeNode) & { gen(file: string): Generator };
  };
}
interface NativeSnapshot {
  operation: { createdPrograms: Array<{ getProject(): NativeProject }> };
  getProject(configFileName: string): NativeProject | undefined;
}
interface NativeAPI {
  parseConfigFile(file: string): NativeConfigResult;
  printer?: { printNode(node: unknown): string };
  batch(...requests: Generator[]): unknown[];
  createSnapshot?(options: { createPrograms: Array<{ rootFiles: string[]; compilerOptions: ts.CompilerOptions }> }): NativeSnapshot;
  updateSnapshot?(options: { openProject: string }): NativeSnapshot;
  close(): void;
}
export interface NativeSync {
  API: new (options: { cwd: string; tsserverPath?: string }) => NativeAPI;
  ModuleKind: Record<number, string>;
  TypeFlags: { String: number; Number: number; BooleanLiteral: number; Union: number; Intersection: number; StringLiteral: number; NumberLiteral: number; BigIntLiteral: number };
  SymbolFlags: { Type: number; Namespace: number; Alias: number };
}
export interface NativeAST {
  isIdentifier(node: NativeNode): boolean;
  isQualifiedName(node: NativeNode): boolean;
  isPropertyAccessExpression(node: NativeNode): boolean;
  isTypeNode(node: NativeNode): boolean;
  SyntaxKind: { Decorator: number; PropertySignature: number; PropertyDeclaration: number; MethodSignature: number; Parameter: number; QuestionToken: number; Identifier: number };
  ScriptTarget: Record<number, string>;
}

// The unstable native API has different types across TypeScript 7 and tsrs.
// Keep its structural adaptation here; the resolver only sees the classic surface.
export function nativeCompiler(sync: NativeSync, ast: NativeAST, name: string, typescript70: boolean) {
  const directory = mkdtempSync(join(tmpdir(), 'tsoa-compiler-'));
  let api: NativeAPI;
  try {
    // TSOA_COMPILER_TSC: a TypeScript 7 compiler built with tsoa's API extensions (packages/cli/native-api), which
    // answers what the public API cannot.
    api = new sync.API({ cwd: process.cwd(), ...(extensionCompiler() ? { tsserverPath: extensionCompiler() } : {}) });
  } catch (error) {
    rmSync(directory, { recursive: true, force: true });
    throw error;
  }
  let project: NativeProject;
  const decorators = new WeakMap<object, NativeNode[] | undefined>();
  let programs = 0;
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
    getDecorators: (node: NativeNode) => {
      // Asked for each decorator a resolver looks for; a node's modifiers do not change.
      if (!decorators.has(node))
        decorators.set(
          node,
          node.modifiers?.filter((m: NativeNode) => m.kind === ast.SyntaxKind.Decorator),
        );
      return decorators.get(node);
    },
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
      // Each program gets its own tsconfig: native APIs cache a project per config path.
      const config = join(directory, `tsconfig.${programs++}.json`);
      writeFileSync(config, JSON.stringify({ extends: originalConfig, compilerOptions, files: roots.map(file => resolve(file)), include: [], exclude: [] }));
      if (!typescript70) {
        const parsed = api.parseConfigFile(config);
        const snapshot = api.createSnapshot!({ createPrograms: [{ rootFiles: parsed.fileNames, compilerOptions: parsed.options }] });
        project = snapshot.operation.createdPrograms[0]?.getProject();
      } else {
        const snapshot = api.updateSnapshot!({ openProject: config });
        project = snapshot.getProject(config)!;
      }
      if (!project) throw new Error(`${name}: could not open the metadata project.`);
      const own = project;
      let sourceFiles: NativeNode[] | undefined;
      const checker = classicChecker(own.checker, sync.TypeFlags, sync.SymbolFlags, name, ast.SyntaxKind.QuestionToken, ast.SyntaxKind.Identifier, api, ast);
      return {
        getTypeChecker: () => checker,
        // A program's files do not change; the resolver asks for them repeatedly.
        // The program's own files in one round trip. The generator looks for decorated classes, which declaration
        // files (lib.*.d.ts, @types, packages) cannot hold, so their syntax trees are not transferred.
        getSourceFiles: () =>
          (sourceFiles ??= (
            api.batch(
              ...own.program
                .getSourceFileNames()
                .filter((file: string) => !/\.d\.[cm]?ts$/.test(file))
                .map((file: string) => own.program.getSourceFile.gen(file)),
            ) as NativeNode[]
          ).map(file => normalizeNode(file, ast.SyntaxKind.QuestionToken))),
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

// Native nodes name two classic properties differently: `default` is `defaultType`, and an optional member's
// `questionToken` is its `postfixToken`. All native nodes share one class, so its prototype answers the classic
// names once for every node, instead of each tree being walked to add them.
const normalizedPrototypes = new WeakSet<object>();
function normalizeNode(node: NativeNode, questionToken: number): NativeNode {
  let prototype = Object.getPrototypeOf(node) as object | null;
  while (prototype && !Object.getOwnPropertyDescriptor(prototype, 'postfixToken')) prototype = Object.getPrototypeOf(prototype) as object | null;
  if (!prototype || normalizedPrototypes.has(prototype)) return node;
  normalizedPrototypes.add(prototype);
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'questionToken');
  const written = (node: NativeNode): NativeNode | undefined => descriptor?.get?.call(node) as NativeNode | undefined;
  Object.defineProperty(prototype, 'questionToken', {
    configurable: true,
    get(this: NativeNode) {
      return written(this) ?? (this.postfixToken?.kind === questionToken ? this.postfixToken : undefined);
    },
  });
  if (!Object.getOwnPropertyDescriptor(prototype, 'default')) {
    Object.defineProperty(prototype, 'default', {
      configurable: true,
      get(this: NativeNode) {
        return this.defaultType;
      },
    });
  }
  return node;
}

function extensionCompiler(): string | undefined {
  return process.env.TSOA_COMPILER_TSC || undefined;
}

// The parts of the native checker that requests to API extensions need.
interface NativeCheckerInternals {
  snapshotId: number;
  project: { id: string };
  client: { apiRequest(method: string, params: unknown): unknown };
  objectRegistry: { getOrCreateSymbol(response: unknown): NativeSymbol; getOrCreateType(response: unknown): NativeType };
}

function classicChecker(
  checker: NativeChecker,
  flags: NativeSync['TypeFlags'],
  symbols: NativeSync['SymbolFlags'],
  name: string,
  questionToken: number,
  identifier: number,
  api: NativeAPI,
  ast: NativeAST,
) {
  const locations = new WeakMap<object, any>();
  // The symbols the identifiers of printed nodes name, from the `tsoa/printedSymbols` extension.
  const printedSymbols = new WeakMap<object, NativeSymbol>();
  const extensions = extensionCompiler() !== undefined;
  let undefinedType: NativeType | undefined;
  const printed = new Map<string, unknown>();
  // Records where a result came from, as the generic path does.
  const located = <T>(result: T, location: unknown): T => {
    if (result && typeof result === 'object' && location && !locations.has(result)) locations.set(result, location);
    return result;
  };
  const prefetch = new Prefetch(checker as unknown as PrefetchChecker, api, ast, symbols.Alias);
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
        // Classic intrinsic types name themselves; native ones carry the boolean value, or say they are the error type.
        intrinsicName: () => {
          const native = type as NativeType & { value?: unknown; intrinsicName?: string; isBooleanLiteralType?(): boolean; isErrorType?(): boolean };
          if (native.isBooleanLiteralType?.()) return String(native.value);
          if (native.isErrorType?.()) return 'error';
          return native.intrinsicName;
        },
        getFlags: () => () => type.flags,
        isUnion: () => () => type.isUnionType(),
        isIntersection: () => () => type.isIntersectionType(),
        isUnionOrIntersection: () => () => type.isUnionType() || type.isIntersectionType(),
        isLiteral: () => () => type.isLiteralType(),
        isStringLiteral: () => () => type.isStringLiteralType(),
        getProperties: () => () => prefetch.propertiesOfType(type),
        getProperty: () => (name: string) => prefetch.propertyOfType(type, name),
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
        getDocumentationComment: () => () => prefetch.documentation(symbol),
      };
    } else {
      return value;
    }
    const proxy = new Proxy(value, {
      get(target, key: string) {
        let result: unknown = getters[key] ? getters[key]() : Reflect.get(target, key);
        // Classic type predicates (`isNumberLiteral`) are `isNumberLiteralType` on native types.
        if (result === undefined && key.startsWith('is')) result = Reflect.get(target, `${key}Type`);
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
          if (!referenceNames.has(node)) return node.pos !== -1 ? wrap(prefetch.symbolAtLocation(node)) : undefined;
          const printed = printedSymbols.get(node) ?? (node.right && printedSymbols.get(node.right));
          if (printed) return wrap(printed);
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
      // Prefetched answers keep the locations the generic path below records: printed names resolve from them.
      if (key === 'getTypeFromTypeNode') return (node: NativeNode) => wrap(located(prefetch.typeFromTypeNode(unwrap(node)), node.pos >= 0 ? node : locations.get(unwrap(node))));
      if (key === 'getAliasedSymbol') return (symbol: NativeSymbol) => wrap(located(prefetch.aliasedSymbol(unwrap(symbol)), locations.get(unwrap(symbol))));
      if (key === 'getTypeOfSymbol') return (symbol: NativeSymbol) => wrap(located(prefetch.typeOfSymbol(unwrap(symbol)), locations.get(unwrap(symbol))));
      if (key === 'getPropertiesOfType') return (type: NativeType) => wrap(prefetch.propertiesOfType(unwrap(type)));
      if (key === 'getPropertyOfType') return (type: NativeType, propertyName: string) => wrap(located(prefetch.propertyOfType(unwrap(type), propertyName), locations.get(unwrap(type))));
      if (key === 'getUndefinedType') return () => wrap((undefinedType ??= target.getUndefinedType()));
      const result: unknown = Reflect.get(target, key);
      return typeof result === 'function'
        ? (...args: any[]) => {
            const location =
              key === 'getTypeOfSymbolAtLocation' ? (unwrap(args[0]) as NativeSymbol).declarations?.[0]?.resolve() : args[0]?.pos >= 0 ? args[0] : args[0] && locations.get(unwrap(args[0]));
            if (key === 'typeToTypeNode' && !args[1]) args[1] = location;
            let printedSymbolResponses: unknown[] | undefined;
            let raw: any;
            // The resolver prints the same type at the same place many times; the printed node does not change.
            const printKey =
              key === 'typeToTypeNode' && extensions
                ? `${(unwrap(args[0]) as { id: string }).id}|${(unwrap(args[1]) as { id?: string } | undefined)?.id ?? ''}|${(args[2] as number | undefined) ?? ''}`
                : undefined;
            if (printKey && printed.has(printKey)) return wrap(printed.get(printKey));
            if (key === 'typeToTypeNode' && extensions) {
              // The extension prints the same node and names the symbol of each identifier, in walk order; both go in one round trip.
              const [type, enclosing, nodeFlags] = args.map(unwrap) as [{ id: string }, { id?: string } | undefined, number | undefined];
              const internals = target as unknown as NativeCheckerInternals;
              const printedSymbols = (function* (): Generator<unknown, unknown, unknown> {
                return yield { method: 'tsoa/printedSymbols', params: { snapshot: internals.snapshotId, project: internals.project.id, type: type.id, location: enclosing?.id, flags: nodeFlags } };
              })();
              [raw, printedSymbolResponses] = api.batch(
                (target as unknown as PrefetchChecker & { typeToTypeNode: GenMethod<unknown[], unknown> }).typeToTypeNode.gen(...args.map(unwrap)),
                printedSymbols,
              ) as [any, unknown[]];
            } else {
              raw = result.apply(target, args.map(unwrap));
            }
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
              if (printedSymbolResponses) {
                const internals = target as unknown as NativeCheckerInternals;
                const responses = printedSymbolResponses;
                let index = 0;
                const visit = (node: NativeNode) => {
                  if (node.kind === identifier) {
                    const response = responses[index++];
                    if (response) printedSymbols.set(node, internals.objectRegistry.getOrCreateSymbol(response));
                  }
                  node.forEachChild(visit);
                };
                visit(raw);
              }
            }
            if (printKey) printed.set(printKey, raw);
            return wrap(raw);
          }
        : result;
    },
  });
  originals.set(proxy, checker);
  if (extensions && process.env.TSOA_DESCRIBE !== '0') {
    // The extension describes the program's own types and symbols in one response; the graph answers from it.
    const internals = checker as unknown as NativeCheckerInternals;
    const description = internals.client.apiRequest('tsoa/describe', { snapshot: internals.snapshotId, project: internals.project.id }) as Description;
    return graphChecker(description, {
      checker: proxy,
      classicType: raw => wrap(internals.objectRegistry.getOrCreateType(raw)),
      classicSymbol: response => wrap(internals.objectRegistry.getOrCreateSymbol(response)),
      sourceFile: path => (internals as unknown as { project: { program: { getSourceFileByPath(path: string): unknown } } }).project.program.getSourceFileByPath(path),
      native: value => (value && typeof value === 'object' ? originals.get(value) : undefined),
      typeFlags: flags,
    });
  }
  return proxy;
}

type GenMethod<A extends unknown[], R> = ((...args: A) => R) & { gen(...args: A): Generator };
interface PrefetchChecker {
  getSymbolAtLocation: GenMethod<[NativeNode | NativeNode[]], any>;
  getTypeFromTypeNode: GenMethod<[NativeNode], NativeType>;
  getAliasedSymbol: GenMethod<[NativeSymbol], NativeSymbol>;
  getTypeOfSymbol: GenMethod<[NativeSymbol], NativeType>;
  getPropertiesOfType: GenMethod<[NativeType], NativeSymbol[]>;
  getPropertyOfType(type: NativeType, name: string): NativeSymbol | undefined;
}
type DocumentedSymbol = NativeSymbol & { getDocumentationComment: GenMethod<[unknown], string> };

/**
 * Answers checker queries from results fetched in bulk. Each query of the native API is a round trip; the type
 * resolver asks thousands of small questions, mostly about the names and type nodes of a few source files and the
 * properties of the types it meets. So the first question about a source file fetches the symbols of all its
 * names, their aliased symbols and the types of all its type nodes in one round trip, and the properties of a type
 * come with their types and documentation.
 */
class Prefetch {
  private readonly files = new WeakSet<object>();
  private readonly symbolAt = new Map<string, NativeSymbol | undefined>();
  private readonly typeOfNode = new Map<string, NativeType>();
  private readonly aliased = new WeakMap<object, NativeSymbol>();
  private readonly typeOf = new WeakMap<object, NativeType>();
  private readonly docs = new WeakMap<object, string>();
  private readonly properties = new WeakMap<object, NativeSymbol[]>();

  constructor(
    private readonly checker: PrefetchChecker,
    private readonly api: NativeAPI,
    private readonly ast: NativeAST,
    private readonly aliasFlag: number,
  ) {}

  symbolAtLocation(node: NativeNode): NativeSymbol | undefined {
    const id = nodeId(node);
    if (!this.symbolAt.has(id)) this.prefetchFile(node);
    if (!this.symbolAt.has(id)) this.symbolAt.set(id, this.checker.getSymbolAtLocation(node));
    return this.symbolAt.get(id);
  }

  typeFromTypeNode(node: NativeNode): NativeType {
    if (node.pos === -1) return this.checker.getTypeFromTypeNode(node);
    const id = nodeId(node);
    if (!this.typeOfNode.has(id)) this.prefetchFile(node);
    if (!this.typeOfNode.has(id)) this.typeOfNode.set(id, this.checker.getTypeFromTypeNode(node));
    return this.typeOfNode.get(id)!;
  }

  aliasedSymbol(symbol: NativeSymbol): NativeSymbol {
    if (!this.aliased.has(symbol)) this.aliased.set(symbol, this.checker.getAliasedSymbol(symbol));
    return this.aliased.get(symbol)!;
  }

  typeOfSymbol(symbol: NativeSymbol): NativeType {
    if (!this.typeOf.has(symbol)) this.typeOf.set(symbol, this.checker.getTypeOfSymbol(symbol));
    return this.typeOf.get(symbol)!;
  }

  documentation(symbol: NativeSymbol): string {
    if (!this.docs.has(symbol)) this.docs.set(symbol, (symbol as DocumentedSymbol).getDocumentationComment(this.checker));
    return this.docs.get(symbol)!;
  }

  /** A property of a type, from its fetched properties; a name they lack is asked for, as the checker may synthesize it. */
  propertyOfType(type: NativeType, name: string): NativeSymbol | undefined {
    return this.propertiesOfType(type).find(property => property.name === name) ?? this.checker.getPropertyOfType(type, name);
  }

  propertiesOfType(type: NativeType): NativeSymbol[] {
    let properties = this.properties.get(type);
    if (!properties) {
      properties = this.checker.getPropertiesOfType(type);
      this.properties.set(type, properties);
      const unknown = properties.filter(property => !this.typeOf.has(property) || !this.docs.has(property));
      if (unknown.length) {
        const results = this.batch([
          ...unknown.map(property => this.checker.getTypeOfSymbol.gen(property)),
          ...unknown.map(property => (property as DocumentedSymbol).getDocumentationComment.gen(this.checker)),
        ]);
        if (results)
          unknown.forEach((property, index) => {
            this.typeOf.set(property, results[index] as NativeType);
            this.docs.set(property, results[unknown.length + index] as string);
          });
      }
    }
    return properties;
  }

  private prefetchFile(node: NativeNode) {
    const file = (node as NativeNode & { getSourceFile?(): NativeNode & { isDeclarationFile?: boolean } }).getSourceFile?.();
    // Declaration files such as lib.*.d.ts are large and asked little about.
    if (!file || this.files.has(file) || file.isDeclarationFile) return;
    this.files.add(file);
    const names: NativeNode[] = [];
    const typeNodes: NativeNode[] = [];
    const visit = (child: NativeNode) => {
      if (this.ast.isIdentifier(child) || this.ast.isQualifiedName(child) || this.ast.isPropertyAccessExpression(child)) names.push(child);
      if (this.ast.isTypeNode(child)) typeNodes.push(child);
      child.forEachChild(visit);
    };
    file.forEachChild(visit);
    const found = (names.length ? this.checker.getSymbolAtLocation(names) : []) as Array<NativeSymbol | undefined>;
    names.forEach((name, index) => this.symbolAt.set(nodeId(name), found[index]));
    const aliases = [...new Set(found.filter((symbol): symbol is NativeSymbol => !!symbol && (symbol.flags & this.aliasFlag) !== 0 && !this.aliased.has(symbol)))];
    const results = this.batch([...aliases.map(symbol => this.checker.getAliasedSymbol.gen(symbol)), ...typeNodes.map(typeNode => this.checker.getTypeFromTypeNode.gen(typeNode))]);
    if (!results) return;
    aliases.forEach((symbol, index) => this.aliased.set(symbol, results[index] as NativeSymbol));
    typeNodes.forEach((typeNode, index) => this.typeOfNode.set(nodeId(typeNode), results[aliases.length + index] as NativeType));
  }

  // One round trip for many queries; a failed batch leaves its questions to be asked one at a time.
  private batch(requests: Generator[]): unknown[] | undefined {
    if (!requests.length) return [];
    try {
      return this.api.batch(...requests);
    } catch {
      return undefined;
    }
  }
}

function nodeId(node: NativeNode): string {
  return (node as NativeNode & { id: string }).id;
}
