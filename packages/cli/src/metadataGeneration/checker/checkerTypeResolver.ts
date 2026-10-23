import type { Tsoa } from '@tsoa/runtime';
import * as ts from 'typescript';
import { getJSDocTagNames } from '../../utils/jsDocUtils';
import { GenerateMetadataError } from '../exceptions';
import type { MetadataGenerator } from '../metadataGenerator';
import { PrimitiveTransformer } from '../transformer/primitiveTransformer';
import { isArrayType, isErrorType, isTupleType, tupleElementFlags } from './internals';
import { resolveNamedReference } from './models';
import { LegacyNamer } from './naming';
import { ReferenceRegistry } from './registry';
import { childSite, followSite, rootSite, type Site } from './site';
import { resolveSpecialType } from './specialTypes';

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
    const followed = followSite(site);
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
      return this.resolveWrittenUnion(type, followed, followed.node);
    }
    return this.resolveStructure(type, followed);
  }

  /** Named models: aliases, interfaces, classes and enums. */
  private resolveNamed(type: ts.Type, site: Site): Tsoa.ReferenceType | undefined {
    return resolveNamedReference(this, type, site, (_resolver, declaration) => {
      throw new GenerateMetadataError(`not implemented: interface and class models (${declaration.name?.text ?? 'anonymous'})`, declaration);
    });
  }

  /** Object types that are not named models. Implemented with the member resolver. */
  protected resolveObject(type: ts.Type, site: Site): Tsoa.Type {
    throw new GenerateMetadataError(`not implemented: object types (${this.checker.typeToString(type)})`, site.node);
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
  private resolveWrittenUnion(type: ts.Type, site: Site, node: ts.UnionTypeNode): Tsoa.Type {
    const remaining = type.isUnion() ? [...type.types] : [type];
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
      const memberType = memberSite.node && memberSite.node.pos !== -1 ? this.checker.getTypeFromTypeNode(memberSite.node) : undefined;
      if (memberType && take(memberType.isUnion() ? memberType.types : [memberType])) {
        resolved.push(this.resolve(memberType, memberSite));
      }
    }

    if (remaining.length) {
      const rest = this.resolveCheckerUnion(remaining, childSite(site, undefined));
      resolved.push(...(rest.dataType === 'union' ? rest.types : [rest]));
    }
    return resolved.length === 1 ? resolved[0] : { dataType: 'union', types: resolved };
  }

  /** A union with no written form: checker order, true|false collapsed, literal-only unions as enums. */
  private resolveCheckerUnion(types: readonly ts.Type[], site: Site): Tsoa.Type {
    const literals = types.map(literalValue);
    if (literals.every(value => value !== undefined) && types.every(t => !(t.flags & (ts.TypeFlags.BooleanLiteral | ts.TypeFlags.EnumLiteral)))) {
      return literalEnums(literals);
    }

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
    const resolved = members.map((member): Tsoa.Type => (member === 'boolean' ? { dataType: 'boolean' } : this.resolve(member, childSite(site, undefined))));
    return resolved.length === 1 ? resolved[0] : { dataType: 'union', types: resolved };
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

function nullishKeyword(node: ts.TypeNode | undefined): 'null' | 'undefined' | undefined {
  if (!node) {
    return undefined;
  }
  if (ts.isLiteralTypeNode(node) && node.literal.kind === ts.SyntaxKind.NullKeyword) {
    return 'null';
  }
  return node.kind === ts.SyntaxKind.UndefinedKeyword ? 'undefined' : undefined;
}

function typeArgumentNode(node: ts.TypeNode | undefined, index: number): ts.TypeNode | undefined {
  return node && ts.isTypeReferenceNode(node) ? node.typeArguments?.[index] : undefined;
}

/** The written element type of `T[]`, `readonly T[]`, `Array<T>` or `ReadonlyArray<T>`. */
function arrayElementNode(node: ts.TypeNode | undefined): ts.TypeNode | undefined {
  if (!node) {
    return undefined;
  }
  if (ts.isArrayTypeNode(node)) {
    return node.elementType;
  }
  if (ts.isTypeOperatorNode(node) && node.operator === ts.SyntaxKind.ReadonlyKeyword) {
    return arrayElementNode(node.type);
  }
  if (ts.isParenthesizedTypeNode(node)) {
    return arrayElementNode(node.type);
  }
  return typeArgumentNode(node, 0);
}
