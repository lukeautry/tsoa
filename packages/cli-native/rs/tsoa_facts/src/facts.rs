//! Type and symbol facts: the protocol ids of checker values, the TypeFacts and SymbolFacts built from them, and the
//! inline facts a response carries for the ids its op returned (PROTOCOL.md, inline facts).

use std::collections::BTreeMap;

use rustc_hash::FxHashMap;
use serde::{Deserialize, Serialize};
use tsrs_ast::{Node, Symbol, SymbolFlags};
use tsrs_checker::{LiteralValue, ObjectFlags, Type, TypeDataTag, TypeFlags};
use tsrs_core::P;

use crate::Session;
use crate::flags::{
    ELEMENT_FLAG_NAMES, OBJECT_FLAG_NAMES, SYMBOL_FLAG_NAMES, TYPE_FLAG_NAMES, flag_names,
    kind_name,
};

/// Interns checker values as protocol ids (1-based, stable for the session). `intern` only assigns; `hand_out` also
/// records the id as returned to Node, so the response carries its facts (PROTOCOL.md, inline facts).
pub(crate) struct Ids<T: 'static> {
    list: Vec<P<T>>,
    index: FxHashMap<P<T>, u32>,
    pub(crate) handed_out: Vec<u32>,
    /// Ids whose facts already went to Node, indexed by id - 1.
    sent: Vec<bool>,
}

impl<T> Ids<T> {
    pub(crate) fn new() -> Self {
        Ids {
            list: Vec::new(),
            index: FxHashMap::default(),
            handed_out: Vec::new(),
            sent: Vec::new(),
        }
    }
    pub(crate) fn intern(&mut self, v: P<T>) -> u32 {
        *self.index.entry(v).or_insert_with(|| {
            self.list.push(v);
            self.sent.push(false);
            self.list.len() as u32
        })
    }
    pub(crate) fn hand_out(&mut self, v: P<T>) -> u32 {
        let id = self.intern(v);
        self.handed_out.push(id);
        id
    }
    pub(crate) fn mark_sent(&mut self, id: u32) {
        self.sent[id as usize - 1] = true;
    }
    /// The distinct ids handed out since the last call whose facts Node does not have yet, in first-handed-out order.
    fn take_unsent(&mut self) -> Vec<u32> {
        let mut seen = rustc_hash::FxHashSet::default();
        std::mem::take(&mut self.handed_out)
            .into_iter()
            .filter(|&id| !self.sent[id as usize - 1] && seen.insert(id))
            .collect()
    }
    pub(crate) fn get(&self, id: u32, what: &str) -> Result<P<T>, String> {
        (id as usize)
            .checked_sub(1)
            .and_then(|i| self.list.get(i))
            .copied()
            .ok_or_else(|| format!("unknown {what} id {id}"))
    }
}

#[derive(Serialize, Deserialize)]
pub(crate) struct NodeRef {
    pub(crate) file: u32,
    pub(crate) pos: i64,
    pub(crate) end: i64,
    pub(crate) kind: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TypeFacts {
    pub(crate) id: u32,
    flags: Vec<&'static str>,
    object_flags: Vec<&'static str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    intrinsic_name: Option<&'static str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    value: Option<LiteralFact>,
    #[serde(skip_serializing_if = "Option::is_none")]
    symbol: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    alias_symbol: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    alias_type_arguments: Option<Vec<u32>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    type_arguments: Option<Vec<u32>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    types: Option<Vec<u32>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    origin: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    target: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    element_flags: Option<Vec<Vec<&'static str>>>,
    is_array: bool,
    is_tuple: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    base_literal: Option<u32>,
}

#[derive(Serialize)]
#[serde(untagged)]
enum LiteralFact {
    String(&'static str),
    Number(f64),
    #[serde(rename_all = "camelCase")]
    BigInt {
        negative: bool,
        base10_value: &'static str,
    },
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SymbolFacts {
    pub(crate) id: u32,
    name: String,
    escaped_name: String,
    flags: Vec<&'static str>,
    declarations: Vec<NodeRef>,
    #[serde(skip_serializing_if = "Option::is_none")]
    value_declaration: Option<NodeRef>,
    #[serde(skip_serializing_if = "Option::is_none")]
    parent: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    aliased: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    synthetic_origin: Option<u32>,
}

#[derive(Default, Serialize)]
pub(crate) struct InlineFacts {
    #[serde(skip_serializing_if = "BTreeMap::is_empty")]
    pub(crate) types: BTreeMap<u32, TypeFacts>,
    #[serde(skip_serializing_if = "BTreeMap::is_empty")]
    pub(crate) symbols: BTreeMap<u32, SymbolFacts>,
}

impl Session {
    pub(crate) fn node_ref(&mut self, node: P<Node>) -> Option<NodeRef> {
        let file = tsrs_ast::get_source_file_of_node(node)?;
        let map = file.get_position_map();
        let utf16 = |p: tsrs_core::text::TextPos| {
            p.source_offset().map_or(-1, |o| map.utf8_to_utf16(o) as i64)
        };
        Some(NodeRef {
            file: self.files.intern(file),
            pos: utf16(node.pos()),
            end: utf16(node.end()),
            kind: kind_name(node).to_string(),
        })
    }

    pub(crate) fn intern_types(&mut self, ts: &[P<Type>]) -> Vec<u32> {
        ts.iter().map(|t| self.types.intern(*t)).collect()
    }

    pub(crate) fn type_facts(&mut self, t: P<Type>) -> TypeFacts {
        let flags = t.flags();
        let mut facts = TypeFacts {
            id: self.types.intern(t),
            flags: flag_names(flags, TYPE_FLAG_NAMES),
            object_flags: if flags.intersects(TypeFlags::Object) {
                flag_names(t.object_flags(), OBJECT_FLAG_NAMES)
            } else {
                Vec::new()
            },
            intrinsic_name: None,
            value: None,
            symbol: t.symbol().map(|s| self.symbols.intern(s)),
            alias_symbol: None,
            alias_type_arguments: None,
            type_arguments: None,
            types: None,
            origin: t.union_origin().map(|o| self.types.intern(o)),
            target: None,
            element_flags: None,
            is_array: self.checker.is_array_type_exported(t),
            is_tuple: tsrs_checker::is_tuple_type_exported(t),
            base_literal: None,
        };
        if t.data_tag() == TypeDataTag::Intrinsic {
            facts.intrinsic_name = Some(t.as_intrinsic_type().intrinsic_name());
        }
        if flags.intersects(TypeFlags::Freshable) {
            match t.as_literal_type().value() {
                // TypeScript 6's true and false are intrinsic types named "true" and "false"; tsrs keeps them as
                // boolean literal types.
                Some(LiteralValue::Boolean(b)) => {
                    facts.intrinsic_name = Some(if b { "true" } else { "false" });
                }
                Some(LiteralValue::String(s)) => facts.value = Some(LiteralFact::String(s)),
                Some(LiteralValue::Number(n)) => facts.value = Some(LiteralFact::Number(n.0)),
                Some(LiteralValue::BigInt(b)) => {
                    let digits = if b.base10_value.is_empty() { "0" } else { b.base10_value };
                    facts.value =
                        Some(LiteralFact::BigInt { negative: b.negative, base10_value: digits });
                }
                None => {}
            }
        }
        if let Some(alias) = t.alias() {
            facts.alias_symbol = alias.symbol().map(|s| self.symbols.intern(s));
            if !alias.type_arguments().is_empty() {
                facts.alias_type_arguments = Some(self.intern_types(alias.type_arguments()));
            }
        }
        if flags.intersects(TypeFlags::Object)
            && t.object_flags().intersects(ObjectFlags::Reference)
        {
            let args = self.checker.get_type_arguments_exported(t);
            facts.type_arguments = Some(self.intern_types(args));
            facts.target = t.target().map(|target| self.types.intern(target));
        }
        if flags.intersects(TypeFlags::UnionOrIntersection) {
            facts.types = Some(self.intern_types(t.types()));
        }
        if tsrs_checker::is_tuple_type_target(t) {
            let per_element = t.as_tuple_type().element_flags().into_iter();
            facts.element_flags =
                Some(per_element.map(|f| flag_names(f, ELEMENT_FLAG_NAMES)).collect());
        }
        if flags.intersects(TypeFlags::Literal | TypeFlags::EnumLiteral) {
            let base = self.checker.get_base_type_of_literal_type_exported(t);
            facts.base_literal = Some(self.types.intern(base));
        }
        facts
    }

    pub(crate) fn symbol_facts(&mut self, s: P<Symbol>) -> SymbolFacts {
        let raw = tsrs_ast::symbol_name(s);
        let aliased = if s.flags().intersects(SymbolFlags::Alias) {
            let aliased = self.checker.get_aliased_symbol(s);
            Some(self.symbols.intern(aliased))
        } else {
            None
        };
        SymbolFacts {
            id: self.symbols.intern(s),
            name: tsrs_ast::escape_internal_symbol_name(raw).to_string(),
            escaped_name: tsrs_ast::escape_symbol_name(s.name()).to_string(),
            flags: flag_names(s.flags(), SYMBOL_FLAG_NAMES),
            declarations: s.declarations().iter().filter_map(|d| self.node_ref(*d)).collect(),
            value_declaration: s.value_declaration().and_then(|d| self.node_ref(d)),
            parent: s.parent().map(|p| self.symbols.intern(p)),
            aliased,
            synthetic_origin: self.checker.synthetic_origin_of(s).map(|o| self.symbols.intern(o)),
        }
    }

    /// Adds the facts of the ids the last op handed out and Node does not have yet (PROTOCOL.md, inline facts).
    pub(crate) fn add_facts(&mut self, facts: &mut InlineFacts) {
        for id in self.types.take_unsent() {
            let t = self.types.list[id as usize - 1];
            facts.types.insert(id, self.type_facts(t));
            self.types.mark_sent(id);
        }
        for id in self.symbols.take_unsent() {
            let s = self.symbols.list[id as usize - 1];
            facts.symbols.insert(id, self.symbol_facts(s));
            self.symbols.mark_sent(id);
        }
    }
}
