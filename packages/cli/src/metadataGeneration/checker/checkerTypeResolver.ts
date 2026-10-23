import type { Tsoa } from '@tsoa/runtime';
import * as ts from 'typescript';
import { getJSDocTagNames } from '../../utils/jsDocUtils';
import { GenerateMetadataError } from '../exceptions';
import type { MetadataGenerator } from '../metadataGenerator';
import { PrimitiveTransformer } from '../transformer/primitiveTransformer';
import { isArrayType, isErrorType, isTupleType, tupleElementFlags } from './internals';
import { resolveAnonymousObject, resolveModel } from './members';
import { resolveNamedReference } from './models';
import { LegacyNamer } from './naming';
import { ReferenceRegistry } from './registry';
import { childSite, followSite, rootSite, type Site } from './site';
import { resolveSpecialType } from './specialTypes';
import { arrayElementNode, descriptiveSite, nullishKeyword, sameModel, typeArgumentNode, writtenType } from './written';

type LiteralValue = string | number | boolean | null;

/**
 * Turns checker types into tsoa metadata. The checker's (instantiated) type decides the schema;
 * the Site only contributes names, annotations and written member order. See the design doc
 * "Core rule: semantics from types, hints from syntax".
 */
export class CheckerTypeResolver {
  public readonly namer: LegacyNamer;
  public readonly registry: ReferenceRegistry;

  constructor(public readonly generator: MetadataGenerator) {
    this.namer = new LegacyNamer(generator);
    this.registry = new ReferenceRegistry(generator);
  }

  private get checker(): ts.TypeChecker {
    return this.generator.typeChecker;
  }

  /** Entry point used by MetadataGenerator.resolveType. */
  public resolveNode(typeNode: ts.TypeNode, parentNode?: ts.Node, type?: ts.Type): Tsoa.Type {
    return this.resolve(type ?? this.typeOfNode(typeNode, parentNode), rootSite(typeNode, parentNode));
  }

  /** The single classification dispatch. Order matters; see the design doc "Type classification". */
  public resolve(type: ts.Type, site: Site): Tsoa.Type {
    const followed = descriptiveSite(this.checker, followSite(site));
    if (isErrorType(type)) {
      const name = followed.node && followed.node.pos !== -1 ? followed.node.getText() : this.checker.typeToString(type);
      throw new GenerateMetadataError(`Could not find declarations for type '${name}'.`, followed.node);
    }

    const special = resolveSpecialType(type, followed, this.generator);
    if (special === 'promise') {
      return this.resolve(this.checker.getTypeArguments(type as ts.TypeReference)[0], childSite(followed, typeArgumentNode(followed.node, 0)));
    }
    if (special) {
      return special;
    }

    const named = this.resolveNamed(type, followed);
    if (named) {
      return named;
    }

    if (followed.node && ts.isUnionTypeNode(followed.node)) {
      return this.resolveWrittenUnion(type.isUnion() ? type.types : [type], followed, followed.node);
    }
    if (followed.node && ts.isIntersectionTypeNode(followed.node)) {
      const written = this.resolveWrittenIntersection(followed, followed.node);
      if (written) {
        return written;
      }
    }
    if (followed.node && ts.isTypeOperatorNode(followed.node) && followed.node.operator === ts.SyntaxKind.KeyOfKeyword) {
      return this.resolveKeys(type, followed);
    }
    if (followed.node && ts.isTemplateLiteralTypeNode(followed.node) && type.isUnion() && type.types.every(t => t.isStringLiteral())) {
      return { dataType: 'enum', enums: type.types.map(t => t.value) };
    }
    return this.resolveStructure(type, followed);
  }

  /** Named models: aliases, interfaces, classes and enums. */
  private resolveNamed(type: ts.Type, site: Site): Tsoa.ReferenceType | undefined {
    return resolveNamedReference(this, type, site, resolveModel);
  }

  /** Object types that are not named models. */
  private resolveObject(type: ts.Type, site: Site): Tsoa.Type {
    return resolveAnonymousObject(this, type, site);
  }

  private resolveStructure(type: ts.Type, site: Site): Tsoa.Type {
    const flags = type.flags;
    if (flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) {
      return { dataType: 'any' };
    }
    if (flags & ts.TypeFlags.String) {
      return { dataType: 'string' };
    }
    if (flags & ts.TypeFlags.Number) {
      return PrimitiveTransformer.numberType(this.generator.defaultNumberType, site.declaration ? getJSDocTagNames(site.declaration) : undefined);
    }
    if (flags & ts.TypeFlags.Boolean) {
      return { dataType: 'boolean' };
    }
    if (flags & ts.TypeFlags.Void) {
      return { dataType: 'void' };
    }
    if (flags & ts.TypeFlags.Undefined) {
      return { dataType: 'undefined' };
    }
    if (flags & ts.TypeFlags.Null) {
      return { dataType: 'enum', enums: [null] };
    }
    if (flags & ts.TypeFlags.NonPrimitive) {
      return { dataType: 'object' };
    }
    if (flags & ts.TypeFlags.Never) {
      throw new GenerateMetadataError(`Unknown type: NeverKeyword`, site.node);
    }
    if (flags & (ts.TypeFlags.BigInt | ts.TypeFlags.BigIntLiteral)) {
      throw new GenerateMetadataError(`Unknown type: BigIntKeyword`, site.node);
    }
    const literal = literalValue(type);
    if (literal !== undefined) {
      return { dataType: 'enum', enums: [literal] };
    }
    if (flags & (ts.TypeFlags.TemplateLiteral | ts.TypeFlags.StringMapping)) {
      return { dataType: 'string' };
    }
    if (type.isUnion()) {
      return this.resolveCheckerUnion(type.types, site);
    }
    if (type.isIntersection()) {
      const written = site.node && ts.isIntersectionTypeNode(site.node) && site.node.types.length === type.types.length ? site.node.types : undefined;
      return { dataType: 'intersection', types: type.types.map((member, i) => this.resolve(member, childSite(site, written?.[i]))) };
    }
    if (isTupleType(this.checker, type)) {
      return this.resolveTuple(type, site);
    }
    if (isArrayType(this.checker, type)) {
      return { dataType: 'array', elementType: this.resolve(this.checker.getTypeArguments(type)[0], childSite(site, arrayElementNode(site.node))) };
    }
    if (flags & ts.TypeFlags.Object) {
      return this.resolveObject(type, site);
    }
    throw new GenerateMetadataError(`Unknown type: ${this.checker.typeToString(type)}`, site.node);
  }

  /**
   * A union written in source: members keep their written order (and their own sites, so aliases
   * like `UUID | null` stay named). In non-strict programs the checker drops null/undefined, so
   * written null/undefined members are added back — the one place syntax adds to a schema.
   */
  private resolveWrittenUnion(members: readonly ts.Type[], site: Site, node: ts.UnionTypeNode): Tsoa.Type {
    const remaining = [...members];
    const resolved: Tsoa.Type[] = [];
    const take = (parts: readonly ts.Type[]) => {
      if (!parts.every(part => remaining.includes(part))) {
        return false;
      }
      parts.forEach(part => remaining.splice(remaining.indexOf(part), 1));
      return true;
    };

    for (const member of node.types) {
      const memberSite = followSite(childSite(site, member));
      const nullish = nullishKeyword(memberSite.node);
      if (nullish) {
        const nullishType = remaining.find(t => t.flags & (nullish === 'null' ? ts.TypeFlags.Null : ts.TypeFlags.Undefined));
        if (nullishType ? take([nullishType]) : !this.strictNullChecks) {
          resolved.push(nullish === 'null' ? { dataType: 'enum', enums: [null] } : { dataType: 'undefined' });
        }
        continue;
      }
      const memberType = writtenType(this.checker, memberSite);
      if (memberType && take(memberType.isUnion() ? memberType.types : [memberType])) {
        resolved.push(this.resolve(memberType, memberSite));
        continue;
      }
      if (memberType && memberType.flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined) && !this.strictNullChecks) {
        // An alias of null/undefined, erased from the checker's union in non-strict programs.
        resolved.push(this.resolve(memberType, memberSite));
        continue;
      }
      const instance = sameModel(this.checker, remaining, memberSite.node);
      if (instance && take([instance])) {
        resolved.push(this.resolve(instance, memberSite));
      }
    }

    if (remaining.length) {
      const rest = this.resolveCheckerUnion(remaining, childSite(site, undefined));
      resolved.push(...(rest.dataType === 'union' ? rest.types : [rest]));
    }
    return resolved.length === 1 ? resolved[0] : { dataType: 'union', types: resolved };
  }

  /**
   * An intersection written in source, member by member, when every member's type is known.
   * The checker flattens (`(A & B) & C`) and distributes (`(A | B) & C`) intersections; legacy kept
   * the written members, and their intersection is the same type.
   */
  private resolveWrittenIntersection(site: Site, node: ts.IntersectionTypeNode): Tsoa.IntersectionType | undefined {
    const members = node.types.map(member => childSite(site, member));
    const types = members.map(member => writtenType(this.checker, member));
    if (types.some(type => type === undefined)) {
      return undefined;
    }
    return { dataType: 'intersection', types: members.map((member, i) => this.resolve(types[i]!, member)) };
  }

  /**
   * A union with no written form, in checker order, with true|false collapsed to boolean. Members of
   * a mapped type over a union stay on the mapped site, so they remain inline objects (legacy).
   */
  private resolveCheckerUnion(types: readonly ts.Type[], site: Site): Tsoa.Type {
    const memberSite = site.node && ts.isMappedTypeNode(site.node) ? site : childSite(site, undefined);
    const nullish = (t: ts.Type) => (t.flags & ts.TypeFlags.Null ? 1 : t.flags & ts.TypeFlags.Undefined ? 2 : 0);
    // Printed unions (what legacy walked) list null, then undefined, last.
    types = [...types].sort((a, b) => nullish(a) - nullish(b));
    const members: Array<ts.Type | 'boolean'> = [];
    const hasTrue = types.some(t => t.flags & ts.TypeFlags.BooleanLiteral && literalValue(t) === true);
    const hasFalse = types.some(t => t.flags & ts.TypeFlags.BooleanLiteral && literalValue(t) === false);
    for (const member of types) {
      if (hasTrue && hasFalse && member.flags & ts.TypeFlags.BooleanLiteral) {
        if (!members.includes('boolean')) {
          members.push('boolean');
        }
        continue;
      }
      members.push(member);
    }
    const resolved = members.map((member): Tsoa.Type => (member === 'boolean' ? { dataType: 'boolean' } : this.resolve(member, memberSite)));
    return resolved.length === 1 ? resolved[0] : { dataType: 'union', types: resolved };
  }

  /**
   * A union of some of a type's members (e.g. an optional property without the `undefined` strict
   * mode adds), keeping what the written node at `site` says about them.
   */
  public resolveMembers(members: readonly ts.Type[], site: Site): Tsoa.Type {
    if (members.length === 1) {
      return this.resolve(members[0], site);
    }
    const written = writtenType(this.checker, site);
    const writtenMembers = written ? (written.isUnion() ? written.types : [written]) : [];
    if (written && writtenMembers.length === members.length && writtenMembers.every(member => members.includes(member))) {
      return this.resolve(written, site);
    }
    const followed = descriptiveSite(this.checker, followSite(site));
    if (followed.node && ts.isUnionTypeNode(followed.node)) {
      return this.resolveWrittenUnion(members, followed, followed.node);
    }
    return this.resolveCheckerUnion(members, followed);
  }

  /** Property keys (`keyof X`): literal keys as enums; `string | number` for indexable keys (legacy). */
  private resolveKeys(type: ts.Type, site: Site): Tsoa.Type {
    const members = type.isUnion() ? type.types : [type];
    const literals = members.map(literalValue).filter((value): value is string | number => typeof value === 'string' || typeof value === 'number');
    if (literals.length) {
      return literalEnums(literals);
    }
    const has = (flag: ts.TypeFlags) => members.some(member => member.flags & flag);
    if (has(ts.TypeFlags.String) && has(ts.TypeFlags.Number)) {
      return { dataType: 'union', types: [{ dataType: 'string' }, { dataType: 'double' }] };
    }
    if (type.flags & ts.TypeFlags.Never) {
      throw new GenerateMetadataError(`TypeOperator 'keyof' on node produced a never type`, site.node);
    }
    if (type.flags & ts.TypeFlags.TemplateLiteral) {
      return { dataType: 'string' };
    }
    if (type.flags & ts.TypeFlags.Number) {
      return { dataType: 'double' };
    }
    throw new GenerateMetadataError(`Could not determine the keys on ${this.checker.typeToString(type)}`, site.node);
  }

  private resolveTuple(type: ts.TypeReference, site: Site): Tsoa.TupleType {
    const elements = site.node && ts.isTupleTypeNode(site.node) ? site.node.elements : undefined;
    const flags = tupleElementFlags(type);
    const types: Tsoa.Type[] = [];
    let restType: Tsoa.Type | undefined;
    this.checker.getTypeArguments(type).forEach((elementType, i) => {
      const element = elements?.[i];
      const elementNode = element && ts.isNamedTupleMember(element) ? element.type : element;
      if (flags[i] & ts.ElementFlags.Variable) {
        const restNode = elementNode && ts.isRestTypeNode(elementNode) ? arrayElementNode(elementNode.type) : undefined;
        restType = this.resolve(elementType, childSite(site, restNode, element));
      } else {
        types.push(this.resolve(elementType, childSite(site, elementNode, element)));
      }
    });
    return { dataType: 'tuple', types, ...(restType ? { restType } : {}) };
  }

  private get strictNullChecks(): boolean {
    return this.generator.compilerOptions.strictNullChecks === true;
  }

  private typeOfNode(typeNode: ts.TypeNode, parentNode?: ts.Node): ts.Type {
    if (typeNode.pos !== -1) {
      return this.checker.getTypeFromTypeNode(typeNode);
    }
    if (parentNode) {
      return this.checker.getTypeAtLocation(parentNode);
    }
    throw new GenerateMetadataError(`Can not succeeded to calculate referencer type.`, typeNode);
  }
}

function literalValue(type: ts.Type): LiteralValue | undefined {
  if (type.isStringLiteral() || type.isNumberLiteral()) {
    return type.value;
  }
  if (type.flags & ts.TypeFlags.BooleanLiteral) {
    return (type as { intrinsicName?: string }).intrinsicName === 'true';
  }
  return undefined;
}

/** Literal values as one enum, or one enum per primitive kind when mixed (as legacy `keyof` does). */
function literalEnums(values: LiteralValue[]): Tsoa.Type {
  const strings = values.filter(v => typeof v === 'string');
  const numbers = values.filter(v => typeof v === 'number');
  if (strings.length && numbers.length) {
    return {
      dataType: 'union',
      types: [
        { dataType: 'enum', enums: strings },
        { dataType: 'enum', enums: numbers },
      ],
    };
  }
  return { dataType: 'enum', enums: values };
}
