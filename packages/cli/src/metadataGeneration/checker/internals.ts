/**
 * The only place the checker resolver touches TypeScript compiler internals. Each helper says why.
 */
import * as ts from 'typescript';

/**
 * Mapped-type properties without declarations keep their origin in `links.syntheticOrigin`;
 * without it their JSDoc is lost (the same lookup IntelliSense does).
 */
export function syntheticOrigin(symbol: ts.Symbol): ts.Symbol | undefined {
  const origin = (symbol as { links?: { syntheticOrigin?: ts.Symbol } }).links?.syntheticOrigin;
  return origin && origin.name === symbol.name ? origin : undefined;
}

/**
 * TypeScript does not read JSDoc for a parameter symbol flagged as a property (constructor
 * parameter properties). Legacy clears the flags before asking; we clear them only for the
 * duration of the call — leaving them cleared makes the checker type the property as an error.
 */
export function parameterDocumentation(symbol: ts.Symbol, checker: ts.TypeChecker): ts.SymbolDisplayPart[] {
  const flags = symbol.flags;
  symbol.flags = 0;
  try {
    return symbol.getDocumentationComment(checker);
  } finally {
    symbol.flags = flags;
  }
}

/** The checker's error type: what an unresolvable reference resolves to. */
export function isErrorType(type: ts.Type): boolean {
  return (type.flags & ts.TypeFlags.Any) !== 0 && (type as { intrinsicName?: string }).intrinsicName === 'error';
}

/** `checker.isArrayType` is public from TypeScript 6; older checkers get an equivalent symbol test. */
export function isArrayType(checker: ts.TypeChecker, type: ts.Type): type is ts.TypeReference {
  const publicCheck = (checker as { isArrayType?: (t: ts.Type) => boolean }).isArrayType;
  if (publicCheck) {
    return publicCheck.call(checker, type);
  }
  const name = type.getSymbol()?.getName();
  return (name === 'Array' || name === 'ReadonlyArray') && checker.getTypeArguments(type as ts.TypeReference).length === 1;
}

/** `checker.isTupleType` is public from TypeScript 6; older checkers get an equivalent flag test. */
export function isTupleType(checker: ts.TypeChecker, type: ts.Type): type is ts.TypeReference {
  const publicCheck = (checker as { isTupleType?: (t: ts.Type) => boolean }).isTupleType;
  if (publicCheck) {
    return publicCheck.call(checker, type);
  }
  return (type.flags & ts.TypeFlags.Object) !== 0 && (((type as ts.TypeReference).target as ts.ObjectType | undefined)?.objectFlags ?? 0) & ts.ObjectFlags.Tuple ? true : false;
}

/** Element flags of a tuple type (required, optional, rest, variadic). */
export function tupleElementFlags(type: ts.TypeReference): readonly ts.ElementFlags[] {
  return (type.target as ts.TupleType).elementFlags;
}
