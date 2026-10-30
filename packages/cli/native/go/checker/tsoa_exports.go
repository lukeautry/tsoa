package checker

// Accessors tsoa's metadata generator adds to the checker package (native/build.mjs places this file here).
// They expose state the checker keeps but does not export; no existing file of the compiler is changed.

// Origin is the union a union type was written as, before it was flattened: for `A | undefined` where A is the
// alias of `X | null`, the flattened union is `X | null | undefined` and its origin is `A | undefined`.
func (t *Type) Origin() *Type {
	if t.Flags()&TypeFlagsUnion == 0 {
		return nil
	}
	return t.AsUnionType().origin
}
