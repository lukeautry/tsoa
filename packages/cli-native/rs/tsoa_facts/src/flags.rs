//! Flag and kind tables: tsrs's single-bit enum members and node kinds under TypeScript 6's names. Node maps the names
//! back to TypeScript 6 numbers, so a tsrs member with no TypeScript 6 counterpart has no entry.

use rustc_hash::FxHashMap;
use tsrs_ast::{Kind, Node, SymbolFlags};
use tsrs_checker::{ElementFlags, ObjectFlags, TypeFlags};
use tsrs_core::P;

pub(crate) const TYPE_FLAG_NAMES: &[(TypeFlags, &str)] = &[
    (TypeFlags::Any, "Any"),
    (TypeFlags::Unknown, "Unknown"),
    (TypeFlags::Undefined, "Undefined"),
    (TypeFlags::Null, "Null"),
    (TypeFlags::Void, "Void"),
    (TypeFlags::String, "String"),
    (TypeFlags::Number, "Number"),
    (TypeFlags::BigInt, "BigInt"),
    (TypeFlags::Boolean, "Boolean"),
    (TypeFlags::ESSymbol, "ESSymbol"),
    (TypeFlags::StringLiteral, "StringLiteral"),
    (TypeFlags::NumberLiteral, "NumberLiteral"),
    (TypeFlags::BigIntLiteral, "BigIntLiteral"),
    (TypeFlags::BooleanLiteral, "BooleanLiteral"),
    (TypeFlags::UniqueESSymbol, "UniqueESSymbol"),
    (TypeFlags::EnumLiteral, "EnumLiteral"),
    (TypeFlags::Enum, "Enum"),
    (TypeFlags::NonPrimitive, "NonPrimitive"),
    (TypeFlags::Never, "Never"),
    (TypeFlags::TypeParameter, "TypeParameter"),
    (TypeFlags::Object, "Object"),
    (TypeFlags::Index, "Index"),
    (TypeFlags::TemplateLiteral, "TemplateLiteral"),
    (TypeFlags::StringMapping, "StringMapping"),
    (TypeFlags::Substitution, "Substitution"),
    (TypeFlags::IndexedAccess, "IndexedAccess"),
    (TypeFlags::Conditional, "Conditional"),
    (TypeFlags::Union, "Union"),
    (TypeFlags::Intersection, "Intersection"),
];

// Bits 22..29 of ObjectFlags mean different things per type kind; this table is the object-type reading. Bits 30
// and 31 are tsrs-only memo bits and are never sent.
pub(crate) const OBJECT_FLAG_NAMES: &[(ObjectFlags, &str)] = &[
    (ObjectFlags::Class, "Class"),
    (ObjectFlags::Interface, "Interface"),
    (ObjectFlags::Reference, "Reference"),
    (ObjectFlags::Tuple, "Tuple"),
    (ObjectFlags::Anonymous, "Anonymous"),
    (ObjectFlags::Mapped, "Mapped"),
    (ObjectFlags::Instantiated, "Instantiated"),
    (ObjectFlags::ObjectLiteral, "ObjectLiteral"),
    (ObjectFlags::EvolvingArray, "EvolvingArray"),
    (
        ObjectFlags::ObjectLiteralPatternWithComputedProperties,
        "ObjectLiteralPatternWithComputedProperties",
    ),
    (ObjectFlags::ReverseMapped, "ReverseMapped"),
    (ObjectFlags::JsxAttributes, "JsxAttributes"),
    (ObjectFlags::JSLiteral, "JSLiteral"),
    (ObjectFlags::FreshLiteral, "FreshLiteral"),
    (ObjectFlags::ArrayLiteral, "ArrayLiteral"),
    (ObjectFlags::PrimitiveUnion, "PrimitiveUnion"),
    (ObjectFlags::ContainsWideningType, "ContainsWideningType"),
    (ObjectFlags::ContainsObjectOrArrayLiteral, "ContainsObjectOrArrayLiteral"),
    (ObjectFlags::NonInferrableType, "NonInferrableType"),
    (ObjectFlags::CouldContainTypeVariablesComputed, "CouldContainTypeVariablesComputed"),
    (ObjectFlags::CouldContainTypeVariables, "CouldContainTypeVariables"),
    (ObjectFlags::ContainsSpread, "ContainsSpread"),
    (ObjectFlags::ObjectRestType, "ObjectRestType"),
    (ObjectFlags::InstantiationExpressionType, "InstantiationExpressionType"),
    (ObjectFlags::SingleSignatureType, "SingleSignatureType"),
    (ObjectFlags::IsClassInstanceClone, "IsClassInstanceClone"),
    (ObjectFlags::IdenticalBaseTypeCalculated, "IdenticalBaseTypeCalculated"),
    (ObjectFlags::IdenticalBaseTypeExists, "IdenticalBaseTypeExists"),
];

pub(crate) const SYMBOL_FLAG_NAMES: &[(SymbolFlags, &str)] = &[
    (SymbolFlags::FunctionScopedVariable, "FunctionScopedVariable"),
    (SymbolFlags::BlockScopedVariable, "BlockScopedVariable"),
    (SymbolFlags::Property, "Property"),
    (SymbolFlags::EnumMember, "EnumMember"),
    (SymbolFlags::Function, "Function"),
    (SymbolFlags::Class, "Class"),
    (SymbolFlags::Interface, "Interface"),
    (SymbolFlags::ConstEnum, "ConstEnum"),
    (SymbolFlags::RegularEnum, "RegularEnum"),
    (SymbolFlags::ValueModule, "ValueModule"),
    (SymbolFlags::NamespaceModule, "NamespaceModule"),
    (SymbolFlags::TypeLiteral, "TypeLiteral"),
    (SymbolFlags::ObjectLiteral, "ObjectLiteral"),
    (SymbolFlags::Method, "Method"),
    (SymbolFlags::Constructor, "Constructor"),
    (SymbolFlags::GetAccessor, "GetAccessor"),
    (SymbolFlags::SetAccessor, "SetAccessor"),
    (SymbolFlags::Signature, "Signature"),
    (SymbolFlags::TypeParameter, "TypeParameter"),
    (SymbolFlags::TypeAlias, "TypeAlias"),
    (SymbolFlags::ExportValue, "ExportValue"),
    (SymbolFlags::Alias, "Alias"),
    (SymbolFlags::Prototype, "Prototype"),
    (SymbolFlags::ExportStar, "ExportStar"),
    (SymbolFlags::Optional, "Optional"),
    (SymbolFlags::Transient, "Transient"),
    (SymbolFlags::Assignment, "Assignment"),
    (SymbolFlags::ModuleExports, "ModuleExports"),
];

pub(crate) const ELEMENT_FLAG_NAMES: &[(ElementFlags, &str)] = &[
    (ElementFlags::Required, "Required"),
    (ElementFlags::Optional, "Optional"),
    (ElementFlags::Rest, "Rest"),
    (ElementFlags::Variadic, "Variadic"),
];

pub(crate) fn flag_names<F: bitflags::Flags + Copy>(
    flags: F,
    table: &[(F, &'static str)],
) -> Vec<&'static str> {
    table.iter().filter(|(f, _)| flags.contains(*f)).map(|(_, n)| *n).collect()
}

/// Each tsrs kind's TypeScript 6 name (its Rust name, except where TypeScript 6 spells the same kind differently), and
/// the reverse.
pub(crate) struct KindNames {
    names: Vec<&'static str>,
    pub(crate) kinds: FxHashMap<&'static str, Kind>,
}

pub(crate) fn kind_names() -> &'static KindNames {
    static NAMES: std::sync::OnceLock<KindNames> = std::sync::OnceLock::new();
    NAMES.get_or_init(|| {
        let names: Vec<&'static str> = (0..Kind::Count as i16)
            .map(|v| match Kind::from_i16(v) {
                Kind::EndOfFile => "EndOfFileToken",
                Kind::JSDocUnknownTag => "JSDocTag",
                kind => format!("{kind:?}").leak(),
            })
            .collect();
        let kinds = names.iter().enumerate().map(|(v, n)| (*n, Kind::from_i16(v as i16))).collect();
        KindNames { names, kinds }
    })
}

/// The node's TypeScript 6 SyntaxKind name. tsrs, like tsgo, parses an interface's `extends X` and a class's
/// `implements X` element as a TypeReference (parser_1.rs parse_type_heritage_clause_element) where TypeScript 6 has
/// an ExpressionWithTypeArguments; find_node accepts the TypeReference for an ExpressionWithTypeArguments ref.
pub(crate) fn kind_name(node: P<Node>) -> &'static str {
    if node.kind() == Kind::TypeReference
        && node.parent().is_some_and(|p| p.kind() == Kind::HeritageClause)
    {
        return "ExpressionWithTypeArguments";
    }
    kind_names().names[node.kind() as usize]
}
