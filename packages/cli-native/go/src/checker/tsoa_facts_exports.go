package checker

import "github.com/microsoft/TypeScript/tsc/internal/ast"

// Read-only accessors the tsoa facts helper adds to the checker package (build.sh copies this file here).
// No existing compiler file changes.

// TsoaOrigin is the union as written, before flattening, when the checker kept one.
func (t *Type) TsoaOrigin() *Type {
	if t.flags&TypeFlagsUnion == 0 {
		return nil
	}
	return t.AsUnionType().origin
}

// TsoaIntrinsicName is the intrinsic name of an intrinsic type ("string", "error", ...).
func (t *Type) TsoaIntrinsicName() (string, bool) {
	if t.kind != typeKindIntrinsic {
		return "", false
	}
	return t.AsIntrinsicType().intrinsicName, true
}

// TsoaSyntheticOrigin is a mapped or spread property's original property.
func (c *Checker) TsoaSyntheticOrigin(symbol *ast.Symbol) *ast.Symbol {
	links := c.mappedSymbolLinks.TryGet(symbol)
	if links == nil {
		return nil
	}
	return links.syntheticOrigin
}
