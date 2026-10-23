import { Static, Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import * as path from 'path';
import * as ts from 'typescript';
import { GenerateMetadataError } from './exceptions';

export const sourceKeySchema = Type.Object({ file: Type.String(), start: Type.Integer({ minimum: 0 }), end: Type.Integer({ minimum: 0 }), kind: Type.Integer({ minimum: 0 }) });
export const projectionStepSchema = Type.Union([
  Type.Object({ kind: Type.Union([Type.Literal('return'), Type.Literal('instance'), Type.Literal('parameters'), Type.Literal('element'), Type.Literal('nonNullable')]) }),
  Type.Object({ kind: Type.Literal('property'), name: Type.String() }),
  Type.Object({ kind: Type.Literal('index'), index: Type.Integer({ minimum: 0 }) }),
]);
export const literalSchema = Type.Union([
  Type.Object({
    kind: Type.Literal('intrinsic'),
    name: Type.Union([
      Type.Literal('string'),
      Type.Literal('number'),
      Type.Literal('boolean'),
      Type.Literal('bigint'),
      Type.Literal('symbol'),
      Type.Literal('object'),
      Type.Literal('undefined'),
      Type.Literal('null'),
      Type.Literal('void'),
      Type.Literal('unknown'),
      Type.Literal('any'),
      Type.Literal('never'),
    ]),
  }),
  Type.Object({ kind: Type.Literal('literal'), value: Type.Union([Type.String(), Type.Number(), Type.Boolean(), Type.Null()]) }),
  Type.Object({ kind: Type.Literal('bigint'), value: Type.String({ pattern: '^-?(0|[1-9][0-9]*)$' }) }),
]);
const bindingSchema = Type.Object({ parameter: sourceKeySchema, capture: Type.Integer({ minimum: 0 }) });
export const queryCaptureSchema = Type.Union([
  Type.Object({ kind: Type.Literal('source'), id: Type.Integer({ minimum: 0 }), expression: sourceKeySchema, context: Type.Array(bindingSchema) }),
  Type.Object({
    kind: Type.Literal('computed'),
    id: Type.Integer({ minimum: 0 }),
    root: Type.Union([
      Type.Object({ kind: Type.Literal('value'), expression: sourceKeySchema }),
      Type.Object({ kind: Type.Literal('reference'), declaration: sourceKeySchema, arguments: Type.Array(Type.Integer({ minimum: 0 })) }),
      Type.Object({ kind: Type.Literal('literal'), site: sourceKeySchema, value: literalSchema }),
      Type.Object({ kind: Type.Literal('query'), query: Type.Integer({ minimum: 0 }) }),
    ]),
    projection: Type.Array(projectionStepSchema),
  }),
]);
export type SourceKey = Static<typeof sourceKeySchema>;
export type ProjectionStep = Static<typeof projectionStepSchema>;
export type QueryLiteral = Static<typeof literalSchema>;
export type SemanticLiteral = QueryLiteral;
export type QueryCapture = Static<typeof queryCaptureSchema>;
export const originalLocationSchema = Type.Object({ fileName: Type.String(), pos: Type.Integer({ minimum: 0 }), end: Type.Integer({ minimum: 0 }), kind: Type.Integer({ minimum: 0 }) });
export type OriginalLocation = Static<typeof originalLocationSchema>;
const preparedQuerySchema = Type.Object({ source: sourceKeySchema, site: Type.String(), name: Type.String(), bindings: Type.Array(bindingSchema) });
type PreparedQuery = Static<typeof preparedQuerySchema>;
export type CompiledQuery = { descriptor: QueryCapture; type: ts.Type; node: ts.Node; bindings: ReadonlyMap<ts.Symbol, CompiledQuery> };
type Scope = { container: ts.SourceFile | ts.ModuleBlock | ts.Block; source: ts.SourceFile; file: string; parent?: Scope };
type Binding = { parameter: ts.TypeParameterDeclaration; capture: QueryCapture; name: string; symbol: ts.Symbol };
type Request = { descriptor: QueryCapture; node: ts.Node; definition: Scope; site: Scope; bindings: Binding[]; name: string };
type Edit = { position: number; text: string };

export function createCompilerQueries(seedProgram: ts.Program, options: ts.CompilerOptions) {
  const seedChecker = seedProgram.getTypeChecker();
  const files = new Map(seedProgram.getSourceFiles().map(source => [path.resolve(source.fileName), source]));
  const requests = new Map<QueryCapture, Request>();
  const scopes = new WeakMap<ts.Node, Scope>();
  let prefix = 'TsoaClosedQuery_';
  for (let index = 1; [...files.values()].some(source => source.text.includes(prefix)); index++) prefix = `TsoaClosedQuery${index}_`;
  const fail = (message: string, node?: ts.Node): never => {
    throw new GenerateMetadataError(message, node);
  };
  const sourceKey = (node: ts.Node): SourceKey => ({ file: path.resolve(node.getSourceFile().fileName), start: node.getStart(), end: node.end, kind: node.kind });
  const ownedNode = (node: ts.Node): void => {
    if (files.get(path.resolve(node.getSourceFile().fileName)) !== node.getSourceFile()) fail('Query source belongs to another compiler Program.', node);
  };
  const request = (capture: QueryCapture): Request => requests.get(capture) || fail('Query capture belongs to another query builder.');
  const scopeOf = (node: ts.Node): Scope => {
    if (!ts.isSourceFile(node) && !ts.isModuleBlock(node) && !ts.isBlock(node)) return scopeOf(node.parent);
    const existing = scopes.get(node);
    if (existing) return existing;
    const source = node.getSourceFile();
    const scope: Scope = { container: node, source, file: path.resolve(source.fileName), parent: ts.isSourceFile(node) ? undefined : scopeOf(node.parent) };
    scopes.set(node, scope);
    return scope;
  };
  const contains = (outer: Scope, inner: Scope): boolean => {
    for (let scope: Scope | undefined = inner; scope; scope = scope.parent) if (scope === outer) return true;
    return false;
  };
  const siteFor = (definition: Scope, captures: readonly QueryCapture[]): Scope => {
    const local = [definition, ...captures.map(capture => request(capture).site)].filter(scope => ts.isBlock(scope.container));
    return local.length ? local.find(scope => local.every(other => contains(other, scope))) || fail('Private captures need a shared lexical scope or an outward source projection.') : definition;
  };
  const register = (descriptor: QueryCapture, node: ts.Node, bindings: Binding[], site?: Scope): QueryCapture => {
    ownedNode(node);
    const parsed = Value.Parse(queryCaptureSchema, descriptor);
    const definition = scopeOf(node);
    requests.set(parsed, {
      descriptor: parsed,
      node,
      definition,
      site:
        site ||
        siteFor(
          definition,
          bindings.map(binding => binding.capture),
        ),
      bindings,
      name: `${prefix}${parsed.id}`,
    });
    return parsed;
  };
  const bindingsFor = (bindings: ReadonlyMap<ts.Symbol, QueryCapture>): Binding[] =>
    [...bindings].map(([symbol, capture], index) => {
      request(capture);
      const parameter = symbol.declarations?.find(ts.isTypeParameterDeclaration) || fail('A captured parameter needs its original declaration.');
      ownedNode(parameter);
      if (seedChecker.getSymbolAtLocation(parameter.name) !== symbol) fail('A captured parameter belongs to another compiler Program.', parameter);
      return { parameter, capture, name: `${prefix}Argument${index}`, symbol };
    });
  const addSource = (node: ts.TypeNode, context: ReadonlyMap<ts.Symbol, QueryCapture> = new Map()): QueryCapture => {
    const bindings = bindingsFor(context);
    return register(
      { kind: 'source', id: requests.size, expression: sourceKey(node), context: bindings.map(binding => ({ parameter: sourceKey(binding.parameter.name), capture: binding.capture.id })) },
      node,
      bindings,
    );
  };
  const addValue = (node: ts.EntityName, projection: readonly ProjectionStep[] = []): QueryCapture =>
    register({ kind: 'computed', id: requests.size, root: { kind: 'value', expression: sourceKey(node) }, projection: [...projection] }, node, []);
  const addProjection = (owner: QueryCapture, projection: readonly ProjectionStep[]): QueryCapture => {
    const parent = request(owner);
    return register({ kind: 'computed', id: requests.size, root: { kind: 'query', query: owner.id }, projection: [...projection] }, parent.node, [], parent.site);
  };
  const addLiteral = (value: QueryLiteral, site: ts.Node): QueryCapture =>
    register({ kind: 'computed', id: requests.size, root: { kind: 'literal', site: sourceKey(site), value }, projection: [] }, site, []);
  const addReference = (name: ts.Identifier, arguments_: readonly QueryCapture[] = []): QueryCapture => {
    ownedNode(name);
    const declaration = name.parent;
    const parameters = ts.isClassDeclaration(declaration) || ts.isInterfaceDeclaration(declaration) || ts.isTypeAliasDeclaration(declaration) ? declaration.typeParameters : undefined;
    const bindings = arguments_.map((capture, index) => {
      request(capture);
      const parameter = parameters?.[index] || fail('A named computed argument needs its original type parameter.', name);
      const symbol = seedChecker.getSymbolAtLocation(parameter.name) || fail('A named type parameter has no source symbol.', parameter);
      return { parameter, capture, name: `${prefix}Argument${index}`, symbol };
    });
    return register(
      { kind: 'computed', id: requests.size, root: { kind: 'reference', declaration: sourceKey(name), arguments: arguments_.map(capture => capture.id) }, projection: [] },
      name,
      bindings,
    );
  };
  const compile = () => {
    const insertions = new Map<Scope, string[]>();
    const namespaceExports = new Map<string, string>();
    const insert = (scope: Scope, text: string): void => {
      const parts = insertions.get(scope) || [];
      parts.push(text);
      insertions.set(scope, parts);
    };
    const top = (scope: Scope): Scope => (scope.parent ? top(scope.parent) : scope);
    const modifier = (scope: Scope): string => (!ts.isBlock(scope.container) && (!ts.isSourceFile(scope.container) || ts.isExternalModule(scope.source)) ? 'export ' : '');
    const moduleSpecifier = (file: string): string =>
      file
        .replace(/\.d\.(mts|cts)$/, (_, extension: string) => (extension === 'mts' ? '.mjs' : '.cjs'))
        .replace(/\.d\.ts$/, '.js')
        .replace(/\.(mts|cts)$/, (_, extension: string) => (extension === 'mts' ? '.mjs' : '.cjs'))
        .replace(/\.tsx?$/, '.js')
        .replace(/\\/g, '/');
    const reference = (scope: Scope, name: string, from: Scope): string => {
      if (contains(scope, from)) return name;
      if (ts.isBlock(scope.container)) return fail('A local query needs an outward source projection.');
      const names: string[] = [];
      for (let cursor = scope; cursor.parent; cursor = cursor.parent) {
        if (!ts.isModuleBlock(cursor.container) || !ts.isIdentifier(cursor.container.parent.name)) return fail('A query namespace needs an identifier source path.');
        names.unshift(cursor.container.parent.name.text);
      }
      if (scope.file === from.file || !ts.isExternalModule(scope.source)) return [...names, name].join('.');
      if (!names.length) return `import(${JSON.stringify(moduleSpecifier(scope.file))}).${name}`;
      const key = `${scope.file}:${names[0]}`;
      let exported = namespaceExports.get(key);
      if (!exported) {
        exported = `${prefix}Namespace${namespaceExports.size}`;
        namespaceExports.set(key, exported);
        insert(top(scope), `export type { ${names[0]} as ${exported} };`);
      }
      return `import(${JSON.stringify(moduleSpecifier(scope.file))}).${[exported, ...names.slice(1), name].join('.')}`;
    };
    const byId = (id: number): Request => [...requests.values()].find(value => value.descriptor.id === id) || fail('A source projection lost its query owner.');
    const captureType = (capture: QueryCapture, site: Scope): string => {
      const parent = request(capture);
      return `${reference(parent.site, parent.name, site)}['result']`;
    };
    const project = (expression: string, steps: readonly ProjectionStep[]): string =>
      steps.reduce((value, step) => {
        switch (step.kind) {
          case 'return':
            return `ReturnType<${value}>`;
          case 'instance':
            return `InstanceType<${value}>`;
          case 'parameters':
            return `Parameters<${value}>`;
          case 'property':
            return `(${value})[${JSON.stringify(step.name)}]`;
          case 'index':
            return `(${value})[${step.index}]`;
          case 'element':
            return `(${value})[number]`;
          case 'nonNullable':
            return `NonNullable<${value}>`;
        }
      }, expression);
    const close = (query: Request, expression: ts.Node = query.node): string => {
      const replacements: Array<{ start: number; end: number; text: string }> = [];
      const visit = (node: ts.Node): void => {
        if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName) && !node.typeArguments?.length) {
          const symbol = seedChecker.getSymbolAtLocation(node.typeName);
          const binding = query.bindings.find(value => value.symbol === symbol);
          if (binding) {
            replacements.push({ start: node.getStart() - expression.getStart(), end: node.end - expression.getStart(), text: binding.name });
            return;
          }
          if (
            symbol &&
            symbol.flags & ts.SymbolFlags.TypeParameter &&
            !symbol.declarations?.some(declaration => declaration.getSourceFile() === expression.getSourceFile() && declaration.pos >= expression.pos && declaration.end <= expression.end)
          )
            fail(`Unclosed type parameter ${node.getText()}.`, node);
        }
        ts.forEachChild(node, visit);
      };
      visit(expression);
      let text = expression.getText();
      for (const replacement of replacements.sort((left, right) => right.start - left.start)) text = text.slice(0, replacement.start) + replacement.text + text.slice(replacement.end);
      return text;
    };
    for (const query of requests.values()) {
      const descriptor = query.descriptor;
      let expression: string;
      if (descriptor.kind === 'source') expression = close(query);
      else if (descriptor.root.kind === 'value') expression = project(`typeof ${query.node.getText()}`, descriptor.projection);
      else if (descriptor.root.kind === 'query') expression = project(captureType(byId(descriptor.root.query).descriptor, query.site), descriptor.projection);
      else if (descriptor.root.kind === 'reference') {
        const name = ts.isEnumMember(query.node.parent) ? `${query.node.parent.parent.name.text}.${query.node.getText()}` : query.node.getText();
        expression = `${name}${query.bindings.length ? `<${query.bindings.map(binding => binding.name).join(', ')}>` : ''}`;
      } else {
        const literal = descriptor.root.value;
        expression = literal.kind === 'intrinsic' ? literal.name : literal.kind === 'bigint' ? `${literal.value}n` : JSON.stringify(literal.value);
      }
      const parameters = query.bindings.map(binding => `${binding.name}${binding.parameter.constraint ? ` extends ${close(query, binding.parameter.constraint)}` : ''}`).join(', ');
      insert(query.definition, `${modifier(query.definition)}interface ${query.name}Envelope${parameters ? `<${parameters}>` : ''} { result: ${expression}; }`);
      const arguments_ = query.bindings.map(binding => captureType(binding.capture, query.site)).join(', ');
      insert(query.site, `${modifier(query.site)}type ${query.name} = ${reference(query.definition, `${query.name}Envelope`, query.site)}${arguments_ ? `<${arguments_}>` : ''};`);
    }
    const editsByFile = new Map<string, Edit[]>();
    for (const [scope, parts] of insertions) {
      const edits = editsByFile.get(scope.file) || [];
      edits.push({ position: ts.isSourceFile(scope.container) ? scope.container.end : scope.container.end - 1, text: `\n${parts.join('\n')}\n` });
      editsByFile.set(scope.file, edits);
    }
    const virtualSources = new Map<string, string>();
    for (const [file, edits] of editsByFile) {
      let text = files.get(file)?.text || fail('Query source text is missing.');
      for (const edit of edits.sort((left, right) => right.position - left.position)) text = text.slice(0, edit.position) + edit.text + text.slice(edit.position);
      virtualSources.set(file, text);
    }
    const host = ts.createCompilerHost(options, true);
    const nativeRead = host.readFile.bind(host);
    const nativeSource = host.getSourceFile.bind(host);
    host.readFile = file => virtualSources.get(path.resolve(file)) ?? nativeRead(file);
    host.getSourceFile = (file, languageOptions, onError, fresh) => {
      const native = nativeSource(file, languageOptions, onError, fresh);
      const text = virtualSources.get(path.resolve(file));
      if (text === undefined) return native;
      const parsedOptions =
        typeof languageOptions === 'number' && native?.impliedNodeFormat !== undefined ? { languageVersion: languageOptions, impliedNodeFormat: native.impliedNodeFormat } : languageOptions;
      return ts.createSourceFile(file, text, parsedOptions, true);
    };
    const program = ts.createProgram(seedProgram.getRootFileNames(), options, host);
    const checker = program.getTypeChecker();
    const originalNode = (key: SourceKey): ts.Node => {
      const shift = (position: number): number => position + (editsByFile.get(key.file) || []).filter(edit => edit.position <= position).reduce((total, edit) => total + edit.text.length, 0);
      const start = shift(key.start);
      const end = shift(key.end);
      let found: ts.Node | undefined;
      const visit = (node: ts.Node): void => {
        if (node.getStart() === start && node.end === end && Number(node.kind) === key.kind) found = node;
        if (!found) ts.forEachChild(node, visit);
      };
      const source = program.getSourceFile(key.file) || fail('A rebound query source file is missing.');
      visit(source);
      return found || fail('A query source occurrence could not be rebound.');
    };
    const reverse = (fileName: string, position: number): number | undefined => {
      let delta = 0;
      for (const edit of [...(editsByFile.get(path.resolve(fileName)) || [])].sort((left, right) => left.position - right.position)) {
        const start = edit.position + delta;
        if (position > start && position < start + edit.text.length) return undefined;
        if (position >= start + edit.text.length) delta += edit.text.length;
      }
      return position - delta;
    };
    const originalLocationAt = (location: OriginalLocation): OriginalLocation | undefined => {
      const pos = reverse(location.fileName, location.pos);
      const end = reverse(location.fileName, location.end);
      return pos === undefined || end === undefined ? undefined : { ...location, pos, end };
    };
    const originalLocation = (node: ts.Node): OriginalLocation | undefined => {
      const source = node.getSourceFile();
      if (program.getSourceFile(source.fileName) !== source || reverse(source.fileName, node.getStart()) === undefined) return undefined;
      return originalLocationAt({ fileName: source.fileName, pos: node.pos, end: node.end, kind: node.kind });
    };
    const prepared = new Map<QueryCapture, PreparedQuery>(
      [...requests].map(([capture, query]) => [
        capture,
        Value.Parse(preparedQuerySchema, {
          source: sourceKey(query.node),
          site: query.site.file,
          name: query.name,
          bindings: query.bindings.map(binding => ({ parameter: sourceKey(binding.parameter.name), capture: binding.capture.id })),
        }),
      ]),
    );
    const descriptors = new Map([...requests.keys()].map(capture => [capture.id, capture]));
    const compiled = new Map<QueryCapture, CompiledQuery>();
    const get = (capture: QueryCapture): CompiledQuery => {
      const existing = compiled.get(capture);
      if (existing) return existing;
      const query = prepared.get(capture) || fail('Query capture belongs to another query builder.');
      let declaration: ts.TypeAliasDeclaration | undefined;
      const visit = (node: ts.Node): void => {
        if (ts.isTypeAliasDeclaration(node) && node.name.text === query.name) declaration = node;
        else ts.forEachChild(node, visit);
      };
      const source = program.getSourceFile(query.site) || fail('A query instance file is missing.');
      visit(source);
      if (!declaration) return fail('A query instance declaration is missing.');
      const owner = checker.getTypeFromTypeNode(declaration.type);
      const property = checker.getPropertyOfType(owner, 'result') || fail('A compiler query has no result property.', declaration);
      const bindings = new Map<ts.Symbol, CompiledQuery>();
      const result: CompiledQuery = { descriptor: capture, type: checker.getTypeOfSymbolAtLocation(property, declaration), node: originalNode(query.source), bindings };
      compiled.set(capture, result);
      for (const binding of query.bindings) {
        const parameter = originalNode(binding.parameter);
        const symbol = checker.getSymbolAtLocation(parameter) || fail('A rebound captured parameter has no symbol.', parameter);
        bindings.set(symbol, get(descriptors.get(binding.capture) || fail('A captured query descriptor is missing.')));
      }
      return result;
    };
    return { program, checker, diagnostics: ts.getPreEmitDiagnostics(program), get, originalNode, originalLocation, originalLocationAt, virtualSources, sourceKey, prefix };
  };
  return { addSource, addValue, addProjection, addLiteral, addReference, compile, sourceKey };
}

export type CompilerQueries = ReturnType<typeof createCompilerQueries>;
export type CompiledQueries = ReturnType<CompilerQueries['compile']>;
