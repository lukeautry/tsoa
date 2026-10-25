/* eslint-disable @typescript-eslint/no-unsafe-call */
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import type * as ts from 'typescript';

// The unstable native API has different types across TypeScript 7 and tsrs.
// Keep its structural adaptation here; the resolver only sees the classic surface.
export function nativeCompiler(sync: any, ast: any, name: string) {
  const directory = mkdtempSync(join(tmpdir(), 'tsoa-compiler-'));
  let api: any;
  try {
    api = new sync.API({ cwd: process.cwd() });
  } catch (error) {
    rmSync(directory, { recursive: true, force: true });
    throw error;
  }
  let project: any;
  const surface: any = {
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
      return { ...api.parseConfigFile(file), errors: [] };
    },
    formatDiagnostics(diagnostics: any[]) {
      return diagnostics.map(d => `${name}: ${d.messageText ?? d.message}`).join('\n');
    },
    forEachChild: (node: any, visitor: any) => node.forEachChild(visitor),
    canHaveDecorators: () => true,
    getDecorators: (node: any) => node.modifiers?.filter((m: any) => m.kind === ast.SyntaxKind.Decorator),
    getModifiers: (node: any) => node.modifiers?.filter((m: any) => m.kind !== ast.SyntaxKind.Decorator),
    displayPartsToString: (parts: string) => parts,
    isPropertySignature: (node: any) => propertyKind(node, ast.SyntaxKind.PropertySignature),
    isPropertyDeclaration: (node: any) => propertyKind(node, ast.SyntaxKind.PropertyDeclaration),
    isMethodSignature: (node: any) => node.kind === ast.SyntaxKind.MethodSignature,
    isParameter: (node: any) => node.kind === ast.SyntaxKind.Parameter,
    printNode: (node: unknown) => (api.printer ?? project.emitter).printNode(node),
    createProgram(roots: string[], options: ts.CompilerOptions) {
      const compilerOptions: Record<string, any> = { ...options };
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
      if (compilerOptions.lib) compilerOptions.lib = compilerOptions.lib.map((lib: string) => lib.replace(/^lib\./, '').replace(/\.d\.ts$/, ''));
      if (compilerOptions.paths) {
        const base = options.pathsBasePath as string | undefined;
        compilerOptions.paths = Object.fromEntries(Object.entries(options.paths!).map(([key, paths]) => [key, paths.map(p => resolve(base ?? process.cwd(), p))]));
      }
      const config = join(directory, 'tsconfig.json');
      writeFileSync(config, JSON.stringify({ extends: originalConfig, compilerOptions, files: roots.map(file => resolve(file)), include: [], exclude: [] }));
      const snapshot = (api.createSnapshot ?? api.updateSnapshot).call(api, { openProject: config });
      project = snapshot.getProjects()[0];
      if (!project) throw new Error(`${name}: could not open the metadata project.`);
      const checker = classicChecker(project.checker, sync.TypeFlags, sync.SymbolFlags, name);
      return {
        getTypeChecker: () => checker,
        getSourceFiles: () => project.program.getSourceFileNames().map((file: string) => normalizeNode(project.program.getSourceFile(file))),
      };
    },
  };
  function propertyKind(node: any, kind: number) {
    if (node.kind !== kind) return false;
    if (node.postfixToken?.kind === ast.SyntaxKind.QuestionToken) throw new Error(`Optional properties are not supported with the ${name} compiler backend.`);
    return true;
  }
  return {
    surface: surface as typeof ts,
    close() {
      try {
        api.close();
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    },
  };
}

function normalizeNode(node: any): any {
  if (node.defaultType) Object.defineProperty(node, 'default', { get: () => node.defaultType });
  for (const key of ['type', 'text', 'initializer']) {
    if (node[key] === undefined || Object.prototype.hasOwnProperty.call(node, key)) continue;
    let prototype = Object.getPrototypeOf(node);
    while (prototype && !Object.prototype.hasOwnProperty.call(prototype, key)) prototype = Object.getPrototypeOf(prototype);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const getter = Object.getOwnPropertyDescriptor(prototype, key)!.get!;
    Object.defineProperty(node, key, { get: () => getter.call(node) });
  }
  node.forEachChild((child: any) => {
    normalizeNode(child);
  });
  return node;
}

function classicChecker(checker: any, flags: any, symbols: any, name: string) {
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
      getters = {
        symbol: () => value.getSymbol(),
        aliasSymbol: () => value.getAliasSymbol(),
        types: () => value.getTypes(),
        type: () => value.getTarget(),
        target: () => value.getTarget(),
        aliasTypeArguments: () => value.getAliasTypeArguments(),
        getFlags: () => () => value.flags,
        isUnion: () => () => value.isUnionType(),
        isIntersection: () => () => value.isIntersectionType(),
        isUnionOrIntersection: () => () => value.isUnionType() || value.isIntersectionType(),
        isLiteral: () => () => value.isLiteralType(),
        isStringLiteral: () => () => value.isStringLiteralType(),
        getProperties: () => () => checker.getPropertiesOfType(value),
        getProperty: () => (name: string) => checker.getPropertyOfType(value, name),
        getStringIndexType: () => () => checker.getIndexInfosOfType(value).find((info: any) => info.keyType.flags & flags.String)?.valueType,
        getNumberIndexType: () => () => checker.getIndexInfosOfType(value).find((info: any) => info.keyType.flags & flags.Number)?.valueType,
      };
    } else if (typeof value.getDocumentationComment === 'function') {
      getters = {
        declarations: () => value.declarations.map((handle: any) => handle.resolve()),
        valueDeclaration: () => value.valueDeclaration?.resolve(),
        getDeclarations: () => () => value.declarations.map((handle: any) => handle.resolve()),
        getName: () => () => value.name,
        getEscapedName: () => () => value.escapedName,
        getFlags: () => () => value.flags,
      };
    } else {
      return value;
    }
    const proxy = new Proxy(value, {
      get(target, key: string) {
        const result = getters[key] ? getters[key]() : Reflect.get(target, key);
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
        return (type: any) => target.getIndexInfosOfType(unwrap(type)).map((info: any) => ({ ...info, type: wrap(info.type ?? info.valueType), keyType: wrap(info.keyType) }));
      if (key === 'getSymbolAtLocation')
        return (node: any) => {
          if (node.pos !== -1) return wrap(target.getSymbolAtLocation(node));
          if (!referenceNames.has(node)) return undefined;
          const location = locations.get(node);
          const symbol = location && node.text ? target.resolveName(node.text, symbols.Type, location) : undefined;
          if (!symbol) throw new Error(`Synthetic type reference lookup is not supported with the ${name} compiler backend.`);
          return wrap(symbol);
        };
      const result = Reflect.get(target, key);
      return typeof result === 'function'
        ? (...args: any[]) => {
            const raw = result.apply(target, args.map(unwrap));
            const location = key === 'getTypeOfSymbolAtLocation' ? unwrap(args[0]).declarations?.[0]?.resolve() : args[0]?.pos >= 0 ? args[0] : args[0] && locations.get(unwrap(args[0]));
            if (raw && typeof raw === 'object' && location) locations.set(raw, location);
            if (key === 'typeToTypeNode' && raw) {
              const source = args[1] ?? location;
              const mark = (node: any) => {
                if (node.typeName) referenceNames.add(node.typeName);
                if (source) locations.set(node, source);
                node.forEachChild(mark);
              };
              mark(raw);
            }
            return wrap(raw);
          }
        : result;
    },
  });
  originals.set(proxy, checker);
  return proxy;
}
