// Accessors the tsoa facts helper adds to the checker crate (build.mjs copies this file in and adds `mod tsoa_exports;`).
// They expose state the checker keeps but does not export. No existing checker function changes.

use tsrs_ast::Symbol;
use tsrs_core::P;

use crate::{Checker, Type, TypeFlags};

impl Type {
    /// The union as written, before flattening (`UnionType.origin`).
    pub fn union_origin(&self) -> Option<P<Type>> {
        if !self.flags().intersects(TypeFlags::Union) {
            return None;
        }
        self.as_union_type().origin()
    }
}

impl Checker {
    /// For a property of a mapped or spread type, the original property (`MappedSymbolLinks.syntheticOrigin`).
    pub fn synthetic_origin_of(&self, symbol: P<Symbol>) -> Option<P<Symbol>> {
        self.mapped_symbol_links.try_get(symbol)?.synthetic_origin.get()
    }
}
