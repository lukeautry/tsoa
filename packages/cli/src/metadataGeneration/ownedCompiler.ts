import * as ts from 'typescript';
import { CompiledQuery, createCompilerQueries, OriginalLocation, QueryCapture, SemanticLiteral } from './compilerQueries';
import { GenerateMetadataError } from './exceptions';
import { Context, Occurrence, SourceRecipe } from './typeOccurrence';
import { TypePresentationBuilder } from './typePresentation';

export class OwnedCompiler {
  public readonly checker: ts.TypeChecker;
  public readonly presentation: TypePresentationBuilder;

  constructor(
    public readonly program: ts.Program,
    private readonly originalLocationAt: (location: OriginalLocation) => OriginalLocation | undefined = location => location,
  ) {
    this.checker = program.getTypeChecker();
    this.presentation = new TypePresentationBuilder(this.checker);
  }

  public originalLocation(node: ts.Node): OriginalLocation {
    const location = this.originalLocationAt({ fileName: node.getSourceFile().fileName, pos: node.pos, end: node.end, kind: node.kind });
    if (!location) throw new GenerateMetadataError('A generated compiler query cannot define a schema name.', node);
    return location;
  }

  public source(node: ts.TypeNode, context: Context, exact?: ts.Type): SourceRecipe {
    const mentionsBinding = (child: ts.Node): boolean => {
      if (ts.isIdentifier(child)) {
        const symbol = this.checker.getSymbolAtLocation(child);
        if (symbol && context.has(symbol)) return true;
      }
      return ts.forEachChild(child, mentionsBinding) || false;
    };
    return {
      kind: 'source',
      compiler: this,
      node,
      context,
      meaning: mentionsBinding(node) ? (exact ? { kind: 'exact', type: exact } : { kind: 'bound' }) : { kind: 'exact', type: this.checker.getTypeFromTypeNode(node) },
    };
  }

  public query(source: SourceRecipe, parent?: ts.Node): { occurrence: SourceRecipe; parent?: ts.Node } {
    const builder = createCompilerQueries(this.program, this.program.getCompilerOptions());
    const captures = new Map<Occurrence, QueryCapture>();
    const inputs = new Map<QueryCapture, Occurrence>();
    const captureType = (type: ts.Type, site: ts.Node): QueryCapture => {
      const symbol = type.aliasSymbol || type.getSymbol();
      const declaration = symbol?.declarations?.find(
        node => ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node) || ts.isEnumMember(node),
      );
      if (declaration && declaration.name && (type.aliasSymbol || !this.checker.isArrayType(type)) && (ts.isIdentifier(declaration.name) || ts.isStringLiteral(declaration.name))) {
        const arguments_ = type.aliasSymbol ? type.aliasTypeArguments || [] : this.isReference(type) ? this.checker.getTypeArguments(type) : [];
        return builder.addReference(
          declaration.name,
          arguments_.map(argument => captureType(argument, site)),
        );
      }
      const literal = this.literal(type);
      if (literal) return builder.addLiteral(literal, site);
      if (type.isUnionOrIntersection())
        return builder.addComposition(
          type.isUnion() ? 'union' : 'intersection',
          type.types.map(member => captureType(member, site)),
          site,
        );
      if (this.isTuple(type)) {
        const elements = this.checker.getTypeArguments(type).map((element, index) => {
          const flags = type.target.elementFlags[index];
          const kind = flags & ts.ElementFlags.Variadic ? 'variadic' : flags & ts.ElementFlags.Rest ? 'rest' : flags & ts.ElementFlags.Optional ? 'optional' : 'required';
          return { kind, capture: captureType(element, site) } satisfies Parameters<typeof builder.addTuple>[0][number];
        });
        return builder.addTuple(elements, type.target.readonly, site);
      }
      if (this.checker.isArrayType(type)) {
        const element = this.checker.getIndexTypeOfType(type, ts.IndexKind.Number);
        if (!element) throw new GenerateMetadataError('A captured array has no element type.', site);
        return builder.addArray(captureType(element, site), type.getSymbol()?.getName() === 'ReadonlyArray', site);
      }
      if (type.flags & ts.TypeFlags.Object && !type.getCallSignatures().length && !type.getConstructSignatures().length) {
        const node = this.presentation.read(type).node;
        if (!ts.isTypeLiteralNode(node)) throw new GenerateMetadataError('A captured object has no property presentation.', site);
        const properties = this.checker.getPropertiesOfType(type).map(property => {
          const declaration = node.members.find(
            member =>
              ts.isPropertySignature(member) && (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name) || ts.isNumericLiteral(member.name)) && member.name.text === property.getName(),
          );
          if (!declaration || !ts.isPropertySignature(declaration)) throw new GenerateMetadataError('A captured object property has no presentation.', site);
          return {
            name: property.getName(),
            capture: captureType(this.checker.getTypeOfSymbol(property), site),
            optional: Boolean(property.flags & ts.SymbolFlags.Optional),
            readonly: Boolean(declaration.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ReadonlyKeyword)),
          };
        });
        const indexes = this.checker.getIndexInfosOfType(type).map(index => {
          if (!(index.keyType.flags & (ts.TypeFlags.String | ts.TypeFlags.Number))) throw new GenerateMetadataError('A captured object index needs a string or number key.', site);
          return { key: index.keyType.flags & ts.TypeFlags.String ? 'string' : 'number', capture: captureType(index.type, site), readonly: index.isReadonly } satisfies Parameters<
            typeof builder.addObject
          >[1][number];
        });
        return builder.addObject(properties, indexes, site);
      }
      throw new GenerateMetadataError('A computed capture needs a source declaration or an owned value projection.', site);
    };
    const capture = (occurrence: Occurrence): QueryCapture => {
      if (occurrence.compiler !== this) throw new GenerateMetadataError('A captured occurrence belongs to another compiler.');
      const existing = captures.get(occurrence);
      if (existing) return existing;
      let result: QueryCapture;
      if (occurrence.kind === 'computed') {
        const origin = occurrence.origin;
        result = origin
          ? origin.kind === 'value'
            ? builder.addValue(origin.node, origin.steps)
            : builder.addProjection(capture(origin.owner), origin.steps)
          : captureType(occurrence.presentation.exact, source.node);
      } else {
        result = builder.addSource(occurrence.node, new Map([...occurrence.context].map(([symbol, binding]) => [symbol, capture(binding.occurrence)])));
      }
      captures.set(occurrence, result);
      inputs.set(result, occurrence);
      return result;
    };
    const root = capture(source);
    const parentKey = parent && builder.sourceKey(parent);
    const result = builder.compile();
    const priorLocation = this.originalLocationAt;
    const mapLocation = result.originalLocationAt;
    const compiler = new OwnedCompiler(result.program, location => {
      const previous = mapLocation(location);
      return previous && priorLocation(previous);
    });
    const priorDiagnostics = new Set(ts.getPreEmitDiagnostics(this.program).map(diagnostic => this.diagnosticKey(diagnostic)));
    const introduced = result.diagnostics.find(diagnostic => {
      if (!diagnostic.file || diagnostic.start === undefined) return !priorDiagnostics.has(this.diagnosticKey(diagnostic));
      const original = mapLocation({ fileName: diagnostic.file.fileName, pos: diagnostic.start, end: diagnostic.start + (diagnostic.length || 0), kind: 0 });
      return !original || !priorDiagnostics.has(this.diagnosticKey(diagnostic, original.pos));
    });
    if (introduced) throw new GenerateMetadataError(`Compiler query failed: ${ts.flattenDiagnosticMessageText(introduced.messageText, '\n')}`, source.node);
    const rebound = new Map<QueryCapture, Occurrence>();
    const restore = (query: CompiledQuery): Occurrence => {
      const existing = rebound.get(query.descriptor);
      if (existing) return existing;
      const input = inputs.get(query.descriptor);
      if (!input) throw new GenerateMetadataError('A query capture lost its source occurrence.');
      const context = new Map<ts.Symbol, { occurrence: Occurrence; name: string }>();
      let occurrence: Occurrence;
      if (input.kind === 'computed') {
        occurrence = { kind: 'computed', compiler, context, presentation: compiler.presentation.read(query.type) };
      } else {
        if (!ts.isTypeNode(query.node)) throw new GenerateMetadataError('A rebound source query has no type annotation.', query.node);
        occurrence = { kind: 'source', compiler, context, node: query.node, meaning: { kind: 'exact', type: query.type } };
      }
      rebound.set(query.descriptor, occurrence);
      for (const [symbol, child] of input.kind === 'computed' ? [] : query.bindings) {
        const original = inputs.get(child.descriptor);
        const binding = [...input.context.values()].find(value => value.occurrence === original);
        if (!binding) throw new GenerateMetadataError('A rebound parameter lost its source name.', query.node);
        context.set(symbol, { occurrence: restore(child), name: binding.name });
      }
      if (input.kind === 'computed' && occurrence.kind === 'computed' && input.origin) {
        const origin = input.origin;
        if (origin.kind === 'value') {
          const node = result.originalNode(builder.sourceKey(origin.node));
          if (!ts.isIdentifier(node) && !ts.isQualifiedName(node)) throw new GenerateMetadataError('A rebound value query has no source name.', node);
          occurrence.origin = { ...origin, node };
        } else {
          const owner = captures.get(origin.owner);
          if (!owner) throw new GenerateMetadataError('A rebound projection lost its owner.');
          occurrence.origin = { ...origin, owner: restore(result.get(owner)) };
        }
      }
      return occurrence;
    };
    const occurrence = restore(result.get(root));
    if (occurrence.kind !== 'source') throw new GenerateMetadataError('A source query lost its source recipe.');
    return { occurrence, parent: parentKey && result.originalNode(parentKey) };
  }

  private diagnosticKey(diagnostic: ts.Diagnostic, position = diagnostic.start): string {
    return JSON.stringify([diagnostic.file?.fileName, position, diagnostic.code, ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')]);
  }

  private isReference(type: ts.Type): type is ts.TypeReference {
    return Boolean(type.flags & ts.TypeFlags.Object) && 'objectFlags' in type && typeof type.objectFlags === 'number' && Boolean(type.objectFlags & ts.ObjectFlags.Reference);
  }

  private isTuple(type: ts.Type): type is ts.TupleTypeReference {
    return this.isReference(type) && this.checker.isTupleType(type);
  }

  private literal(type: ts.Type): SemanticLiteral | undefined {
    if (type.isStringLiteral() || type.isNumberLiteral()) return { kind: 'literal', value: type.value };
    if (type.isLiteral() && typeof type.value === 'object') return { kind: 'bigint', value: `${type.value.negative ? '-' : ''}${type.value.base10Value}` };
    if (type.flags & ts.TypeFlags.BooleanLiteral) return { kind: 'literal', value: type === this.checker.getTrueType() };
    const intrinsics: ReadonlyArray<readonly [ts.TypeFlags, Extract<SemanticLiteral, { kind: 'intrinsic' }>['name']]> = [
      [ts.TypeFlags.String, 'string'],
      [ts.TypeFlags.Number, 'number'],
      [ts.TypeFlags.Boolean, 'boolean'],
      [ts.TypeFlags.BigInt, 'bigint'],
      [ts.TypeFlags.ESSymbol, 'symbol'],
      [ts.TypeFlags.NonPrimitive, 'object'],
      [ts.TypeFlags.Undefined, 'undefined'],
      [ts.TypeFlags.Null, 'null'],
      [ts.TypeFlags.Void, 'void'],
      [ts.TypeFlags.Unknown, 'unknown'],
      [ts.TypeFlags.Any, 'any'],
      [ts.TypeFlags.Never, 'never'],
    ];
    const intrinsic = intrinsics.find(([flag]) => type.flags & flag);
    return intrinsic && { kind: 'intrinsic', name: intrinsic[1] };
  }
}
