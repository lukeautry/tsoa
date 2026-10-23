import { Static, Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import * as ts from 'typescript';
import { GenerateMetadataError } from './exceptions';

const originSchema = Type.Object({ flags: Type.Union([Type.Literal(ts.TypeFlags.Union), Type.Literal(ts.TypeFlags.Intersection)]), types: Type.Array(Type.Unknown(), { minItems: 1 }) });
type OriginEnvelope = Static<typeof originSchema>;

export type TypePresentation =
  | { kind: 'leaf' | 'alias'; exact: ts.Type; node: ts.TypeNode }
  | { kind: 'union' | 'intersection'; exact: ts.Type; node: ts.TypeNode; members: readonly TypePresentation[] }
  | { kind: 'array'; exact: ts.Type; node: ts.TypeNode; element: TypePresentation };

export class TypePresentationBuilder {
  private readonly printer = ts.createPrinter();
  private readonly source = ts.createSourceFile('', '', ts.ScriptTarget.Latest);

  constructor(private readonly checker: ts.TypeChecker) {}

  public read(exact: ts.Type, expandAlias = false): TypePresentation {
    const presentation = this.plan(exact, expandAlias, new Set());
    const oracle = this.node(exact, expandAlias);
    this.require(this.print(presentation.node) === this.print(oracle), 'Owned presentation differs from the compiler presentation.');
    return presentation;
  }

  private plan(exact: ts.Type, expandAlias: boolean, active: ReadonlySet<ts.Type>): TypePresentation {
    if (exact.aliasSymbol && !expandAlias) return { kind: 'alias', exact, node: this.node(exact) };
    this.require(!active.has(exact), 'Compiler presentation origin contains a cycle.');
    const next = new Set(active).add(exact);
    if (exact.isUnion() && !(exact.flags & (ts.TypeFlags.Boolean | ts.TypeFlags.EnumLiteral))) {
      const origin = this.origin(exact);
      const types = origin.kind === 'union' ? this.formatUnion(origin.members) : origin.members;
      const members = types.map(type => this.plan(type, false, next));
      const nodes = members.map(member => member.node);
      const node = nodes.length === 1 ? nodes[0] : origin.kind === 'union' ? ts.factory.createUnionTypeNode(nodes) : ts.factory.createIntersectionTypeNode(nodes);
      return { kind: origin.kind, exact, node, members };
    }
    if (exact.isIntersection()) {
      const members = exact.types.map(type => this.plan(type, false, next));
      return { kind: 'intersection', exact, members, node: ts.factory.createIntersectionTypeNode(members.map(member => member.node)) };
    }
    if (this.checker.isArrayType(exact)) {
      const elementType = this.checker.getIndexTypeOfType(exact, ts.IndexKind.Number);
      this.require(elementType, 'Array owner has no element type.');
      const element = this.plan(elementType, false, next);
      const array = ts.factory.createArrayTypeNode(element.node);
      const node = exact.getSymbol()?.getName() === 'ReadonlyArray' ? ts.factory.createTypeOperatorNode(ts.SyntaxKind.ReadonlyKeyword, array) : array;
      return { kind: 'array', exact, element, node };
    }
    return { kind: 'leaf', exact, node: this.node(exact, expandAlias) };
  }

  private origin(owner: ts.UnionType): { kind: 'union' | 'intersection'; members: readonly ts.Type[] } {
    const edge: unknown = 'origin' in owner ? owner.origin : undefined;
    if (edge === undefined) return { kind: 'union', members: owner.types };
    const envelope = this.parseOrigin(edge);
    const members = envelope.types.map(member => this.compilerMember(member, owner));
    this.require(new Set(members).size === members.length, 'Compiler origin repeats a member.');
    this.require(
      members.every(member => member !== owner),
      'Compiler origin contains its owner.',
    );
    if (envelope.flags === ts.TypeFlags.Union) {
      const covered = members.flatMap(member => this.flatten(member, 'union', new Set([owner])));
      this.require(new Set(covered).size === covered.length, 'Compiler origin groups overlap.');
      this.require(this.equalSet(covered, owner.types), 'Compiler origin does not cover its union owner.');
      return { kind: 'union', members };
    }
    let products: ts.Type[][] = [[]];
    for (const member of members) {
      const choices = this.flatten(member, 'union', new Set([owner]));
      products = products.flatMap(product => choices.map(choice => [...product, ...this.flatten(choice, 'intersection', new Set([owner]))]));
    }
    const actual = owner.types.map(member => this.flatten(member, 'intersection', new Set([owner])));
    this.require(
      products.length === actual.length && products.every(product => actual.filter(value => this.equalSet(product, value)).length === 1),
      'Compiler intersection origin does not cover its distributed union.',
    );
    return { kind: 'intersection', members };
  }

  private parseOrigin(value: unknown): OriginEnvelope {
    this.require(Value.Check(originSchema, value), 'Compiler origin must have a union or intersection kind and a nonempty array of opaque members.');
    return value;
  }

  private compilerMember(value: unknown, owner: ts.Type): ts.Type {
    this.require(typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.getPrototypeOf(owner), 'Compiler origin member has a foreign prototype.');
    this.require('flags' in value && Number.isInteger(value.flags), 'Compiler origin member has no type flags.');
    for (const method of ['getFlags', 'getSymbol', 'getProperties', 'getNumberIndexType', 'isUnion', 'isIntersection', 'isLiteral']) {
      this.require(method in value && typeof Reflect.get(value, method) === 'function', 'Compiler origin member lacks the Type method contract.');
    }
    return value as ts.Type;
  }

  private flatten(type: ts.Type, kind: 'union' | 'intersection', active: ReadonlySet<ts.Type>): ts.Type[] {
    this.require(!active.has(type), 'Compiler origin coverage contains a cycle.');
    if ((kind === 'union' && type.isUnion()) || (kind === 'intersection' && type.isIntersection())) {
      const next = new Set(active).add(type);
      return type.types.flatMap(member => this.flatten(member, kind, next));
    }
    return [type];
  }

  private formatUnion(members: readonly ts.Type[]): ts.Type[] {
    const result: ts.Type[] = [];
    const nullish: ts.Type[] = [];
    const regular = (type: ts.Type) => (type.isLiteral() ? type.regularType : type);
    for (let index = 0; index < members.length; index++) {
      const exact = members[index];
      if (exact.flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined)) {
        nullish.push(exact);
        continue;
      }
      const base = exact.flags & (ts.TypeFlags.BooleanLiteral | ts.TypeFlags.EnumLike) ? this.checker.getBaseTypeOfLiteralType(exact) : exact;
      if (base !== exact && base.isUnion() && base.types.every((member, offset) => members[index + offset] && regular(members[index + offset]) === regular(member))) {
        result.push(base);
        index += base.types.length - 1;
      } else result.push(exact);
    }
    return [...result, ...nullish.filter(type => type.flags & ts.TypeFlags.Null), ...nullish.filter(type => type.flags & ts.TypeFlags.Undefined)];
  }

  private equalSet(left: readonly ts.Type[], right: readonly ts.Type[]) {
    return left.length === right.length && left.every(type => right.includes(type));
  }

  private node(type: ts.Type, expandAlias = false) {
    const node = this.checker.typeToTypeNode(type, undefined, ts.NodeBuilderFlags.NoTruncation | ts.NodeBuilderFlags.UseFullyQualifiedType | (expandAlias ? ts.NodeBuilderFlags.InTypeAlias : 0));
    this.require(node, 'Compiler could not present the owned type.');
    return node;
  }

  private print(node: ts.TypeNode) {
    return this.printer.printNode(ts.EmitHint.Unspecified, node, this.source);
  }

  private require(condition: unknown, message: string): asserts condition {
    if (!condition) throw new GenerateMetadataError(`Unsupported TypeScript ${ts.version} presentation. ${message}`);
  }
}
