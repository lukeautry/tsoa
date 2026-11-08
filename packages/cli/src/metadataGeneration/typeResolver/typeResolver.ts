import type { Tsoa } from '@tsoa/runtime';
import * as ts from 'typescript';
import { GenerateMetadataError } from '../exceptions';
import type { MetadataGenerator } from '../metadataGenerator';
import { numberFormat } from './annotations';
import { legacyErrorName } from './declarations';
import { isArrayType, isErrorType, isTrueLiteral, isTupleType, tupleElementFlags } from './internals';
import { resolveAnonymousObject } from './members';
import { resolveNamedReference } from './models';
import { TypeNamer } from './naming';
import { ReferenceRegistry } from './registry';
import { childSite, followSite, rootSite, type Site } from './site';
import { isPromise, resolveSpecialType } from './specialTypes';
import { arrayElementNode, descriptiveSite, nullishKeyword, sameModel, typeArgumentNode, writtenType } from './written';

type LiteralValue = string | number | boolean | null;

/**
 * Turns checker types into tsoa metadata. The checker's (instantiated) type decides the schema;
 * the Site only contributes names, annotations and written member order.
 */
export class TypeResolver {
  public readonly namer: TypeNamer;
  public readonly registry: ReferenceRegistry;

  constructor(public readonly generator: MetadataGenerator) {
    this.namer = new TypeNamer(generator);
    this.registry = new ReferenceRegistry(generator);
  }

  private get checker(): ts.TypeChecker {
    return this.generator.typeChecker;
  }

  /** A checker type with no written form (an inferred return or parameter type). */
  public resolveType(type: ts.Type, declaration?: ts.Node): Tsoa.Type {
    return this.resolve(type, rootSite(undefined, declaration));
  }

  /** A type written in source. */
  public resolveTypeNode(node: ts.TypeNode, declaration?: ts.Node): Tsoa.Type {
    return this.resolve(this.checker.getTypeFromTypeNode(node), rootSite(node, declaration));
  }

  private pathText(site: Site): string {
    return site.path.map(({ segment }, i) => (segment.startsWith('[') || i === 0 ? segment : `.${segment}`)).join('');
  }

  /** The written node at `site`, else the nearest source declaration on the path, for error locations. */
  private sourceNode(site: Site): ts.Node | undefined {
    const inSource = (node: ts.Node | undefined) => node !== undefined && node.pos !== -1;
    if (inSource(site.node)) {
      return site.node;
    }
    if (inSource(site.declaration)) {
      return site.declaration;
    }
    return [...site.path].reverse().find(step => inSource(step.declaration))?.declaration;
  }

  /** Rejects library objects without a JSON form, preserving the legacy Error model. */
  public assertSupportedObject(type: ts.Type, site: Site): void {
    if (isBuiltInClass(this.generator, type) && type.getSymbol()?.getName() !== legacyErrorName) {
      const path = this.pathText(site);
      throw new GenerateMetadataError(
        `Unsupported type: ${this.checker.typeToString(type)}${path ? ` at '${path}'` : ''}. Built-in classes such as Set and Map have no JSON form and must be mapped to a supported type: an array, an object type or an interface.`,
        this.sourceNode(site),
      );
    }
  }

  /** The single classification dispatch. Order matters. */
  public resolve(type: ts.Type, site: Site): Tsoa.Type {
    const followed = descriptiveSite(this.checker, followSite(site));
    if (!isErrorType(type) && isPromise(type, followed)) {
      return this.resolve(this.checker.getTypeArguments(type as ts.TypeReference)[0], childSite(followed, typeArgumentNode(followed.node, 0)));
    }
    // Special types are recognized by their written name, so they map even when their
    // declarations are not in the program (e.g. `Buffer` without @types/node).
    const special = resolveSpecialType(type, followed);
    if (special) {
      return special;
    }
    if (isErrorType(type)) {
      const name = followed.node && followed.node.pos !== -1 ? followed.node.getText() : this.checker.typeToString(type);
      throw new GenerateMetadataError(`Could not find declarations for type '${name}'.`, followed.node);
    }

    const named = resolveNamedReference(this, type, followed);
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
    return templateLiteralEnum(type, followed) ?? this.resolveStructure(type, followed);
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
      return numberFormat(this.generator.defaultNumberType, site.declaration);
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
      return { dataType: 'array', elementType: this.resolve(this.checker.getTypeArguments(type)[0], childSite(site, arrayElementNode(site.node), undefined, { segment: '[]' })) };
    }
    if (flags & ts.TypeFlags.Object) {
      this.assertSupportedObject(type, site);
      return resolveAnonymousObject(this, type, site);
    }
    throw new GenerateMetadataError(`Unknown type: ${this.checker.typeToString(type)}`, site.node);
  }

  /**
   * A union written in source: members keep their written order (and their own sites, so aliases
   * like `UUID | null` stay named). Written literals survive primitive widening, and written
   * null/undefined members are added back when non-strict programs erase them.
   */
  private resolveWrittenUnion(members: readonly ts.Type[], site: Site, node: ts.UnionTypeNode): Tsoa.Type {
    const remaining = [...members];
    const resolved: Tsoa.Type[] = [];
    // A written alternative is kept when its types are in the union, even if an earlier
    // alternative already covered them: `Id | Other` with two annotated aliases of `string`
    // collapses to one checker type but keeps both alternatives and their validators.
    const take = (parts: readonly ts.Type[]) => {
      if (!parts.every(part => members.includes(part) || ((part.flags & ts.TypeFlags.Literal) !== 0 && members.includes(this.checker.getBaseTypeOfLiteralType(part))))) {
        return false;
      }
      // A literal covers only part of its widened type, so only exact matches consume candidates.
      parts.forEach(part => remaining.includes(part) && remaining.splice(remaining.indexOf(part), 1));
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
      const instance = sameModel(this.checker, members, memberSite) ?? this.sameArray(members, memberSite);
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
   * The checker array a written array alternative (`T[] | number`) stands for, when its element
   * mentions type parameters and so has no written type of its own: the only candidate array, or the
   * one whose element is the written element's type.
   */
  private sameArray(remaining: readonly ts.Type[], site: Site): ts.Type | undefined {
    const element = arrayElementNode(site.node);
    if (!element || (site.node && !ts.isArrayTypeNode(site.node) && !ts.isTypeOperatorNode(site.node))) {
      return undefined;
    }
    const arrays = remaining.filter(member => isArrayType(this.checker, member));
    if (arrays.length <= 1) {
      return arrays[0];
    }
    const elementType = writtenType(this.checker, childSite(site, element));
    const matching = elementType ? arrays.filter(array => this.checker.getTypeArguments(array)[0] === elementType) : [];
    return matching.length === 1 ? matching[0] : undefined;
  }

  /**
   * An intersection written in source, member by member, when every member's type is known.
   * The checker flattens (`(A & B) & C`) and distributes (`(A | B) & C`) intersections; we keep
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
   * A union with no written form, in checker order, with true|false collapsed to boolean and every
   * member of an enum collapsed to the enum (the checker flattens `Color | undefined` into the
   * enum's members). Members of a mapped type over a union stay on the mapped site, so they remain
   * inline objects.
   */
  private resolveCheckerUnion(types: readonly ts.Type[], site: Site): Tsoa.Type {
    const memberSite = site.node && ts.isMappedTypeNode(site.node) ? site : childSite(site, undefined);
    const nullish = (t: ts.Type) => (t.flags & ts.TypeFlags.Null ? 1 : t.flags & ts.TypeFlags.Undefined ? 2 : 0);
    // Like printed unions, list null, then undefined, last.
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
      const enumType = member.flags & ts.TypeFlags.EnumLiteral ? this.checker.getBaseTypeOfLiteralType(member) : undefined;
      if (enumType && enumType !== member && enumType.isUnion() && enumType.types.every(enumMember => types.includes(enumMember))) {
        if (!members.includes(enumType)) {
          members.push(enumType);
        }
        continue;
      }
      members.push(member);
    }
    const resolved = members.map((member): Tsoa.Type => (member === 'boolean' ? { dataType: 'boolean' } : this.resolve(member, memberSite)));
    return resolved.length === 1 ? resolved[0] : { dataType: 'union', types: resolved };
  }

  /** Property keys (`keyof X`): literal keys as enums; `string | number` for indexable keys. */
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
    const flags = tupleElementFlags(type);
    const node = site.node && ts.isTypeOperatorNode(site.node) && site.node.operator === ts.SyntaxKind.ReadonlyKeyword ? site.node.type : site.node;
    const written = node && ts.isTupleTypeNode(node) ? node.elements : undefined;
    // Spreads of tuple aliases (`[...Pair, X]`) expand in the checker; written elements only line up without them.
    const spreadsTuple = written?.some(element => ts.isRestTypeNode(element) && !ts.isArrayTypeNode(element.type));
    const elements = written && !spreadsTuple && written.length === flags.length ? written : undefined;
    const types: Tsoa.Type[] = [];
    let restType: Tsoa.Type | undefined;
    this.checker.getTypeArguments(type).forEach((elementType, i) => {
      const element = elements?.[i];
      const elementNode = element && ts.isNamedTupleMember(element) ? element.type : element;
      if (flags[i] & ts.ElementFlags.Variable) {
        const restNode = elementNode && ts.isRestTypeNode(elementNode) ? arrayElementNode(elementNode.type) : undefined;
        restType = this.resolve(elementType, childSite(site, restNode, element, { segment: `[${i}]` }));
      } else {
        types.push(this.resolve(elementType, childSite(site, elementNode, element, { segment: `[${i}]` })));
      }
    });
    return { dataType: 'tuple', types, ...(restType ? { restType } : {}) };
  }

  private get strictNullChecks(): boolean {
    return this.generator.compilerOptions.strictNullChecks === true;
  }
}

function literalValue(type: ts.Type): LiteralValue | undefined {
  if (type.isStringLiteral() || type.isNumberLiteral()) {
    return type.value;
  }
  if (type.flags & ts.TypeFlags.BooleanLiteral) {
    return isTrueLiteral(type);
  }
  return undefined;
}

/**
 * A class or interface declared only in TypeScript's own lib files (Set, Map, RegExp, typed arrays…).
 * Types tsoa maps specially (Date, Promise, arrays) never get here; lib aliases such as `Partial`
 * and `Record` produce anonymous types, and declarations from packages are models.
 */
function isBuiltInClass(generator: MetadataGenerator, type: ts.Type): boolean {
  const symbol = type.getSymbol();
  const declarations = symbol?.getDeclarations();
  const isClassOrInterface = symbol !== undefined && (symbol.flags & (ts.SymbolFlags.Class | ts.SymbolFlags.Interface)) !== 0;
  return isClassOrInterface && !!declarations?.length && declarations.every(declaration => generator.isDefaultLibrary(declaration.getSourceFile()));
}

/** Literal values as one enum, or one enum per primitive kind when mixed (as for `keyof`). */
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

// Output kept as tsoa has always written it. A later cleanup can drop these in one place.

/** A written template literal type with finitely many values is one enum, not a union of single-value enums. */
function templateLiteralEnum(type: ts.Type, site: Site): Tsoa.EnumType | undefined {
  if (!site.node || !ts.isTemplateLiteralTypeNode(site.node) || !type.isUnion() || !type.types.every(t => t.isStringLiteral())) {
    return undefined;
  }
  return { dataType: 'enum', enums: type.types.map(t => t.value) };
}
