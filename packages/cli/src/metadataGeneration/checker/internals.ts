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
 * parameter properties). Legacy clears the flags before asking; so do we.
 */
export function parameterDocumentation(symbol: ts.Symbol, checker: ts.TypeChecker): ts.SymbolDisplayPart[] {
  symbol.flags = 0;
  return symbol.getDocumentationComment(checker);
}

/** The checker's error type: what an unresolvable reference resolves to. */
export function isErrorType(type: ts.Type): boolean {
  return (type.flags & ts.TypeFlags.Any) !== 0 && (type as { intrinsicName?: string }).intrinsicName === 'error';
}
