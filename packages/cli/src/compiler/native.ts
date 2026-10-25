/* eslint-disable @typescript-eslint/no-unsafe-call */
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import type * as ts from 'typescript';

// The unstable native API has different types across TypeScript 7 and tsrs.
// Keep its structural adaptation here; the resolver only sees the classic surface.
export function nativeCompiler(sync: any, ast: any, name: string) {
  const directory = mkdtempSync(join(tmpdir(), 'tsoa-compiler-'));
  const api = new sync.API({ cwd: process.cwd() });
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
    isPropertySignature: (node: any) => node.kind === ast.SyntaxKind.PropertySignature,
    isMethodSignature: (node: any) => node.kind === ast.SyntaxKind.MethodSignature,
    isParameter: (node: any) => node.kind === ast.SyntaxKind.Parameter,
    createPrinter: () => ({ printNode: (_hint: unknown, node: unknown) => (api.printer ?? project.emitter).printNode(node) }),
    createSourceFile: () => undefined,
    EmitHint: {},
    createProgram(roots: string[], options: ts.CompilerOptions) {
      const compilerOptions: Record<string, any> = { ...options };
      delete compilerOptions.configFilePath;
      delete compilerOptions.pathsBasePath;
      // Native parseConfigFile returns numeric options, but a tsconfig takes names.
      const enums: Record<string, Record<number, string>> = {
        target: ast.ScriptTarget,
        module: sync.ModuleKind,
        moduleResolution: { 1: 'classic', 2: 'node10', 3: 'node16', 99: 'nodenext', 100: 'bundler' },
        jsx: { 1: 'preserve', 2: 'react', 3: 'react-native', 4: 'react-jsx', 5: 'react-jsxdev' },
        newLine: { 0: 'crlf', 1: 'lf' },
        moduleDetection: { 1: 'legacy', 2: 'auto', 3: 'force' },
      };
      for (const [key, values] of Object.entries(enums)) {
        if (typeof compilerOptions[key] === 'number') compilerOptions[key] = values[compilerOptions[key]]?.toLowerCase();
      }
      if (compilerOptions.lib) compilerOptions.lib = compilerOptions.lib.map((lib: string) => lib.replace(/^lib\./, '').replace(/\.d\.ts$/, ''));
      if (compilerOptions.paths) {
        const base = options.pathsBasePath as string | undefined;
        compilerOptions.paths = Object.fromEntries(Object.entries(options.paths!).map(([key, paths]) => [key, paths.map(p => resolve(base ?? process.cwd(), p))]));
      }
      const config = join(directory, 'tsconfig.json');
      writeFileSync(config, JSON.stringify({ compilerOptions, files: roots.map(file => resolve(file)) }));
      const snapshot = (api.createSnapshot ?? api.updateSnapshot).call(api, { openProject: config });
      project = snapshot.getProjects()[0];
      if (!project) throw new Error(`${name}: could not open the metadata project.`);
      const checker = classicChecker(project.checker, sync.TypeFlags);
      return {
        getTypeChecker: () => checker,
        getSourceFiles: () => project.program.getSourceFileNames().map((file: string) => project.program.getSourceFile(file)),
      };
    },
  };
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

function classicChecker(checker: any, flags: any) {
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
      if (key === 'getIndexInfosOfType') return (type: any) => target.getIndexInfosOfType(unwrap(type)).map((info: any) => ({ ...info, type: wrap(info.type ?? info.valueType), keyType: wrap(info.keyType) }));
      if (key === 'getSymbolAtLocation') return (node: any) => node.pos === -1 ? undefined : wrap(target.getSymbolAtLocation(node));
      const result = Reflect.get(target, key);
      return typeof result === 'function' ? (...args: any[]) => wrap(result.apply(target, args.map(unwrap))) : result;
    },
  });
  originals.set(proxy, checker);
  return proxy;
}
