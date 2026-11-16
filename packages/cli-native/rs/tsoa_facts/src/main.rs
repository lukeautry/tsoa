// tsoa facts helper on tsrs: answers PROTOCOL.md queries about one program with one checker, on one thread.

#[global_allocator]
static GLOBAL: mimalloc_safe::MiMalloc = mimalloc_safe::MiMalloc;

use std::cell::RefCell;
use std::io::{Read, Write};
use std::sync::Arc;

use rustc_hash::FxHashMap;
use serde_json::{Map, Value, json};
use tsrs_ast::{Kind, Node, SourceFile, Symbol, SymbolFlags};
use tsrs_checker::{
    ElementFlags, Flags as BuilderFlags, InternalFlags, LiteralValue, ObjectFlags, SignatureKind,
    Type, TypeDataTag, TypeFlags,
};
use tsrs_compiler::{CheckerHandle, ProgramOptions};
use tsrs_core::tspath::{self, ComparePathsOptions};
use tsrs_core::{CompilerOptions, Context, P, Tristate};
use tsrs_core::collections::OrderedMap;
use tsrs_tsoptions::{CompilerOptionsValue, ParseConfigHost};
use tsrs_vfs::{FS, bundled, cachedvfs, osvfs};

type Res = Result<Value, String>;

/// The PROTOCOL.md revision this helper speaks; `open` reports it.
const PROTOCOL_REVISION: u32 = 8;

const TYPE_FLAG_NAMES: &[(TypeFlags, &str)] = &[
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
const OBJECT_FLAG_NAMES: &[(ObjectFlags, &str)] = &[
    (ObjectFlags::Class, "Class"),
    (ObjectFlags::Interface, "Interface"),
    (ObjectFlags::Reference, "Reference"),
    (ObjectFlags::Tuple, "Tuple"),
    (ObjectFlags::Anonymous, "Anonymous"),
    (ObjectFlags::Mapped, "Mapped"),
    (ObjectFlags::Instantiated, "Instantiated"),
    (ObjectFlags::ObjectLiteral, "ObjectLiteral"),
    (ObjectFlags::EvolvingArray, "EvolvingArray"),
    (ObjectFlags::ObjectLiteralPatternWithComputedProperties, "ObjectLiteralPatternWithComputedProperties"),
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

const SYMBOL_FLAG_NAMES: &[(SymbolFlags, &str)] = &[
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

const ELEMENT_FLAG_NAMES: &[(ElementFlags, &str)] = &[
    (ElementFlags::Required, "Required"),
    (ElementFlags::Optional, "Optional"),
    (ElementFlags::Rest, "Rest"),
    (ElementFlags::Variadic, "Variadic"),
];

fn flag_names<F: bitflags::Flags + Copy>(flags: F, table: &[(F, &str)]) -> Value {
    Value::Array(
        table.iter().filter(|(f, _)| flags.contains(*f)).map(|(_, n)| json!(n)).collect(),
    )
}

/// Interns checker values as protocol ids (1-based, stable for the session).
struct Ids<T: 'static> {
    list: Vec<P<T>>,
    index: FxHashMap<P<T>, u32>,
    /// Ids handed out since the last `take_touched`, for inline facts (PROTOCOL.md revision 4a).
    touched: Vec<u32>,
    /// Ids whose facts already went to Node, indexed by id - 1.
    sent: Vec<bool>,
}

impl<T> Ids<T> {
    fn new() -> Self {
        Ids { list: Vec::new(), index: FxHashMap::default(), touched: Vec::new(), sent: Vec::new() }
    }
    fn id(&mut self, v: P<T>) -> u32 {
        let id = *self.index.entry(v).or_insert_with(|| {
            self.list.push(v);
            self.sent.push(false);
            self.list.len() as u32
        });
        self.touched.push(id);
        id
    }
    fn mark_sent(&mut self, id: u32) {
        self.sent[id as usize - 1] = true;
    }
    /// The distinct touched ids whose facts were not sent yet, in first-touched order.
    fn take_unsent(&mut self) -> Vec<u32> {
        let mut out = Vec::new();
        for id in std::mem::take(&mut self.touched) {
            if !self.sent[id as usize - 1] && !out.contains(&id) {
                out.push(id);
            }
        }
        out
    }
    fn get(&self, id: &Value, what: &str) -> Result<P<T>, String> {
        let n = id.as_u64().ok_or_else(|| format!("{what}: expected an id"))? as usize;
        self.list.get(n.wrapping_sub(1)).copied().ok_or_else(|| format!("unknown {what} id {n}"))
    }
}

struct Session {
    checker: CheckerHandle,
    files: Ids<SourceFile>,
    types: Ids<Type>,
    symbols: Ids<Symbol>,
}

struct ConfigHost {
    fs: Arc<dyn FS>,
    cwd: String,
}

impl ParseConfigHost for ConfigHost {
    fn fs(&self) -> &dyn FS {
        &*self.fs
    }
    fn get_current_directory(&self) -> &str {
        &self.cwd
    }
}

fn field<'a>(q: &'a Value, name: &str) -> Result<&'a Value, String> {
    q.get(name).ok_or_else(|| format!("missing field {name}"))
}

fn field_str<'a>(q: &'a Value, name: &str) -> Result<&'a str, String> {
    field(q, name)?.as_str().ok_or_else(|| format!("field {name}: expected a string"))
}

fn config_value(v: &Value) -> CompilerOptionsValue {
    match v {
        Value::Null => CompilerOptionsValue::Null,
        Value::Bool(b) => CompilerOptionsValue::Bool(*b),
        Value::Number(n) => CompilerOptionsValue::Float(n.as_f64().unwrap_or(0.0)),
        Value::String(s) => CompilerOptionsValue::String(s.clone()),
        Value::Array(a) => CompilerOptionsValue::Array(a.iter().map(config_value).collect()),
        Value::Object(m) => {
            CompilerOptionsValue::Object(m.iter().map(|(k, v)| (k.clone(), config_value(v))).collect())
        }
    }
}

fn open(q: &Value) -> Result<(Session, Value), String> {
    let cwd = tspath::normalize_path(field_str(q, "cwd")?);
    let fs: Arc<dyn FS> = Arc::new(cachedvfs::from(bundled::wrap_fs(osvfs::fs())));
    let host = ConfigHost { fs: Arc::clone(&fs), cwd: cwd.clone() };
    let roots: Vec<String> = field(q, "rootFiles")?
        .as_array()
        .ok_or("rootFiles: expected an array")?
        .iter()
        .map(|v| v.as_str().map(|s| tspath::get_normalized_absolute_path(s, &cwd)))
        .collect::<Option<_>>()
        .ok_or("rootFiles: expected strings")?;
    let mut json = OrderedMap::default();
    json.insert("compilerOptions".to_string(), config_value(field(q, "compilerOptions")?));
    json.insert(
        "files".to_string(),
        CompilerOptionsValue::Array(roots.iter().map(|r| CompilerOptionsValue::String(r.clone())).collect()),
    );
    let parsed = tsrs_tsoptions::parse_json_config_file_content(
        CompilerOptionsValue::Object(json),
        &host,
        &cwd,
        None,
        &format!("{cwd}/tsconfig.json"),
        &[],
        None,
    );
    // 18002: no inputs (empty rootFiles), 18003: no inputs found.
    let failures: Vec<String> =
        parsed.errors.iter().filter(|d| d.code() != 18002 && d.code() != 18003).map(|d| d.localize()).collect();
    if !failures.is_empty() {
        return Err(failures.join("\n"));
    }
    let base = (*parsed.compiler_options().unwrap()).clone();
    // One checker on this thread: the pool's single checker is the one every query uses.
    let options = P::new(CompilerOptions { single_threaded: Tristate::True, checkers: Some(1), ..base });
    let compare = ComparePathsOptions {
        use_case_sensitive_file_names: fs.use_case_sensitive_file_names(),
        current_directory: cwd.clone(),
    };
    let config =
        P::new(tsrs_tsoptions::new_parsed_command_line(options, roots, Vec::new(), compare));
    let compiler_host = tsrs_compiler::new_compiler_host(
        &cwd,
        fs,
        &bundled::default_lib_path(),
        None,
        None,
        None,
    );
    let mut program_options = ProgramOptions::new(config, compiler_host);
    program_options.single_threaded = Tristate::True;
    let program = tsrs_compiler::new_program(program_options);
    for d in program.get_program_diagnostics() {
        eprintln!("tsoa-facts: program: {}", d.localize());
    }
    let checker = program.get_type_checker(&Context::background());
    let mut s = Session {
        checker,
        files: Ids::new(),
        types: Ids::new(),
        symbols: Ids::new(),
    };
    let files: Vec<Value> = program
        .get_source_files()
        .iter()
        .map(|f| {
            json!({
                "id": s.files.id(*f),
                "fileName": f.file_name(),
                "isDeclarationFile": f.is_declaration_file(),
                "isDefaultLibrary": program.is_source_file_default_library(f.path()),
            })
        })
        .collect();
    let undefined = s.checker.get_undefined_type();
    let result = json!({ "protocol": PROTOCOL_REVISION, "files": files, "undefinedType": s.types.id(undefined) });
    Ok((s, result))
}

fn kind_name(kind: Kind) -> String {
    format!("{kind:?}")
}

/// TS 6 kinds that tsrs, like tsgo, parses as another kind at the same span (PROTOCOL.md revision 1).
fn equivalent_kind(kind: &str) -> Option<&'static str> {
    match kind {
        "ExpressionWithTypeArguments" => Some("TypeReference"),
        _ => None,
    }
}

fn find_node(node: P<Node>, pos: u32, end: u32, kind: &str) -> Option<P<Node>> {
    if node.pos().source_offset() == Some(pos)
        && node.end().source_offset() == Some(end)
        && (kind_name(node.kind()) == kind || equivalent_kind(kind) == Some(kind_name(node.kind()).as_str()))
    {
        return Some(node);
    }
    let mut found = None;
    node.for_each_child(&mut |child| {
        let (Some(cp), Some(ce)) = (child.pos().source_offset(), child.end().source_offset())
        else {
            return false;
        };
        if cp <= pos && end <= ce {
            found = find_node(child, pos, end, kind);
        }
        found.is_some()
    });
    found
}

impl Session {
    fn node(&self, q: &Value) -> Result<P<Node>, String> {
        let r = field(q, "node")?;
        let file = self.files.get(field(r, "file")?, "file")?;
        let map = file.get_position_map();
        let utf16 = |name: &str| -> Result<u32, String> {
            field(r, name)?.as_u64().map(|n| n as u32).ok_or_else(|| format!("node.{name}: expected a number"))
        };
        let (pos16, end16) = (utf16("pos")?, utf16("end")?);
        let pos = map.utf16_to_utf8(pos16);
        let end = map.utf16_to_utf8(end16);
        let kind = field_str(r, "kind")?;
        find_node(file.as_node(), pos, end, kind)
            .ok_or_else(|| format!("no {kind} node at {pos16}..{end16} in {}", file.file_name()))
    }

    fn node_ref(&mut self, node: P<Node>) -> Value {
        let Some(file) = tsrs_ast::get_source_file_of_node(node) else {
            return Value::Null;
        };
        let map = file.get_position_map();
        let utf16 = |p: tsrs_core::text::TextPos| p.source_offset().map_or(-1, |o| map.utf8_to_utf16(o) as i64);
        json!({
            "file": self.files.id(file),
            "pos": utf16(node.pos()),
            "end": utf16(node.end()),
            "kind": kind_name(node.kind()),
        })
    }

    fn ty(&self, q: &Value, name: &str) -> Result<P<Type>, String> {
        self.types.get(field(q, name)?, "type")
    }

    fn sym(&self, q: &Value) -> Result<P<Symbol>, String> {
        self.symbols.get(field(q, "symbol")?, "symbol")
    }

    fn type_id(&mut self, t: P<Type>) -> Value {
        json!(self.types.id(t))
    }

    fn type_ids(&mut self, ts: &[P<Type>]) -> Value {
        Value::Array(ts.iter().map(|t| self.type_id(*t)).collect())
    }

    fn opt_symbol(&mut self, s: Option<P<Symbol>>) -> Value {
        s.map_or(Value::Null, |s| json!(self.symbols.id(s)))
    }

    fn type_facts(&mut self, t: P<Type>) -> Value {
        let flags = t.flags();
        let mut o = Map::new();
        o.insert("id".into(), self.type_id(t));
        o.insert("flags".into(), flag_names(flags, TYPE_FLAG_NAMES));
        let object_flags = if flags.intersects(TypeFlags::Object) {
            flag_names(t.object_flags(), OBJECT_FLAG_NAMES)
        } else {
            json!([])
        };
        o.insert("objectFlags".into(), object_flags);
        if t.data_tag() == TypeDataTag::Intrinsic {
            o.insert("intrinsicName".into(), json!(t.as_intrinsic_type().intrinsic_name()));
        }
        if flags.intersects(TypeFlags::Freshable) {
            match t.as_literal_type().value() {
                // TypeScript 6's true and false are intrinsic types named "true" and "false"; tsrs keeps them as
                // boolean literal types.
                Some(LiteralValue::Boolean(b)) => {
                    o.insert("intrinsicName".into(), json!(if b { "true" } else { "false" }));
                }
                Some(LiteralValue::String(s)) => {
                    o.insert("value".into(), json!(s));
                }
                Some(LiteralValue::Number(n)) => {
                    o.insert("value".into(), json!(n.0));
                }
                Some(LiteralValue::BigInt(b)) => {
                    let digits = if b.base10_value.is_empty() { "0" } else { b.base10_value };
                    o.insert("value".into(), json!({ "negative": b.negative, "base10Value": digits }));
                }
                None => {}
            }
        }
        if let Some(s) = t.symbol() {
            o.insert("symbol".into(), json!(self.symbols.id(s)));
        }
        if let Some(alias) = t.alias() {
            if let Some(s) = alias.symbol() {
                o.insert("aliasSymbol".into(), json!(self.symbols.id(s)));
            }
            if !alias.type_arguments().is_empty() {
                let args = self.type_ids(alias.type_arguments());
                o.insert("aliasTypeArguments".into(), args);
            }
        }
        if flags.intersects(TypeFlags::Object) && t.object_flags().intersects(ObjectFlags::Reference) {
            let args = self.checker.get_type_arguments_exported(t);
            let args = self.type_ids(args);
            o.insert("typeArguments".into(), args);
            if let Some(target) = t.target() {
                o.insert("target".into(), self.type_id(target));
            }
        }
        if flags.intersects(TypeFlags::UnionOrIntersection) {
            let types = self.type_ids(t.types());
            o.insert("types".into(), types);
        }
        if let Some(origin) = t.union_origin() {
            o.insert("origin".into(), self.type_id(origin));
        }
        if tsrs_checker::is_tuple_type_target(t) {
            let per_element = t
                .as_tuple_type()
                .element_flags()
                .into_iter()
                .map(|f| flag_names(f, ELEMENT_FLAG_NAMES))
                .collect();
            o.insert("elementFlags".into(), Value::Array(per_element));
        }
        o.insert("isArray".into(), json!(self.checker.is_array_type_exported(t)));
        o.insert("isTuple".into(), json!(tsrs_checker::is_tuple_type_exported(t)));
        if flags.intersects(TypeFlags::Literal | TypeFlags::EnumLiteral) {
            let base = self.checker.get_base_type_of_literal_type_exported(t);
            o.insert("baseLiteral".into(), self.type_id(base));
        }
        Value::Object(o)
    }

    fn symbol_facts(&mut self, s: P<Symbol>) -> Value {
        let raw = tsrs_ast::symbol_name(s);
        let mut o = Map::new();
        o.insert("id".into(), json!(self.symbols.id(s)));
        o.insert("name".into(), json!(tsrs_ast::escape_internal_symbol_name(raw)));
        o.insert("escapedName".into(), json!(tsrs_ast::escape_symbol_name(s.name())));
        o.insert("flags".into(), flag_names(s.flags(), SYMBOL_FLAG_NAMES));
        let decls = s.declarations().iter().map(|d| self.node_ref(*d)).collect();
        o.insert("declarations".into(), Value::Array(decls));
        if let Some(d) = s.value_declaration() {
            o.insert("valueDeclaration".into(), self.node_ref(d));
        }
        if let Some(p) = s.parent() {
            o.insert("parent".into(), json!(self.symbols.id(p)));
        }
        if s.flags().intersects(SymbolFlags::Alias) {
            let aliased = self.checker.get_aliased_symbol(s);
            o.insert("aliased".into(), json!(self.symbols.id(aliased)));
        }
        if let Some(origin) = self.checker.synthetic_origin_of(s) {
            o.insert("syntheticOrigin".into(), json!(self.symbols.id(origin)));
        }
        Value::Object(o)
    }

    /// Facts for every id handed out since the last call that Node has not received (PROTOCOL.md revision 4a).
    fn inline_facts(&mut self) -> Option<Value> {
        let type_ids = self.types.take_unsent();
        let symbol_ids = self.symbols.take_unsent();
        let mut types = Map::new();
        for id in type_ids {
            let t = self.types.list[id as usize - 1];
            if let Ok(facts) = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| self.type_facts(t))) {
                self.types.mark_sent(id);
                types.insert(id.to_string(), facts);
            }
        }
        let mut symbols = Map::new();
        for id in symbol_ids {
            let s = self.symbols.list[id as usize - 1];
            if let Ok(facts) = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| self.symbol_facts(s))) {
                self.symbols.mark_sent(id);
                symbols.insert(id.to_string(), facts);
            }
        }
        // Computing facts hands out ids too. They are not expanded.
        self.types.touched.clear();
        self.symbols.touched.clear();
        let mut out = Map::new();
        if !types.is_empty() {
            out.insert("types".into(), Value::Object(types));
        }
        if !symbols.is_empty() {
            out.insert("symbols".into(), Value::Object(symbols));
        }
        (!out.is_empty()).then(|| Value::Object(out))
    }

    /// PROTOCOL.md revision 4b.
    fn prefetch_file(&mut self, file: P<SourceFile>) -> Value {
        struct Entries {
            seen: std::collections::HashSet<(u32, u32, String)>,
            list: Vec<Value>,
        }
        impl Entries {
            fn push(&mut self, pos: u32, end: u32, kind: &str, id: Option<u32>, map: &tsrs_ast::PositionMap) {
                if self.seen.insert((pos, end, kind.to_string())) {
                    self.list.push(json!([map.utf8_to_utf16(pos), map.utf8_to_utf16(end), kind, id]));
                }
            }
        }
        let new_entries = || Entries { seen: Default::default(), list: Vec::new() };
        let (mut symbol_at, mut type_from, mut declared) = (new_entries(), new_entries(), new_entries());
        let mut property_symbols: Vec<P<Symbol>> = Vec::new();
        let map = file.get_position_map();

        fn visit(
            s: &mut Session,
            node: P<Node>,
            map: &tsrs_ast::PositionMap,
            symbol_at: &mut Entries,
            type_from: &mut Entries,
            declared: &mut Entries,
            property_symbols: &mut Vec<P<Symbol>>,
        ) {
            if let (Some(pos), Some(end)) = (node.pos().source_offset(), node.end().source_offset()) {
                let kind = kind_name(node.kind());
                if node.kind() == Kind::Identifier {
                    let sym = s.checker.get_symbol_at_location_exported(node);
                    if let Some(sym) = sym {
                        property_symbols.push(sym);
                    }
                    let id = sym.map(|x| s.symbols.id(x));
                    symbol_at.push(pos, end, &kind, id, map);
                }
                if tsrs_ast::is_type_node(node) {
                    let t = s.checker.get_type_from_type_node_exported(node);
                    let id = s.types.id(t);
                    type_from.push(pos, end, &kind, Some(id), map);
                }
                if let Some(sym) = node.symbol() {
                    property_symbols.push(sym);
                    let id = s.symbols.id(sym);
                    declared.push(pos, end, &kind, Some(id), map);
                }
            }
            node.for_each_child(&mut |child| {
                visit(s, child, map, symbol_at, type_from, declared, property_symbols);
                false
            });
        }
        visit(self, file.as_node(), &map, &mut symbol_at, &mut type_from, &mut declared, &mut property_symbols);

        let mut type_of_symbol = Vec::new();
        let mut done = std::collections::HashSet::new();
        for sym in property_symbols {
            if sym.flags().intersects(SymbolFlags::Property) && done.insert(sym) {
                let t = self.checker.get_type_of_symbol_exported(sym);
                type_of_symbol.push(json!([self.symbols.id(sym), self.types.id(t)]));
            }
        }
        json!({
            "symbolAt": symbol_at.list,
            "typeFrom": type_from.list,
            "declared": declared.list,
            "typeOfSymbol": type_of_symbol,
        })
    }

    fn index_infos(&mut self, t: P<Type>) -> Value {
        let infos = self.checker.get_index_infos_of_type_exported(t);
        Value::Array(
            infos
                .iter()
                .map(|i| {
                    let mut entry = json!({
                        "keyType": self.types.id(i.key_type()),
                        "type": self.types.id(i.value_type()),
                        "isReadonly": i.is_readonly(),
                    });
                    if let Some(d) = i.declaration() {
                        let r = self.node_ref(d);
                        if !r.is_null() {
                            entry["declaration"] = r;
                        }
                    }
                    entry
                })
                .collect(),
        )
    }

    fn print(&mut self, t: P<Type>) -> Value {
        let id_to_symbol = P::new(RefCell::new(FxHashMap::default()));
        // The printer must share the node builder's emit context: the builder records emit flags there (SingleLine
        // on type literals), as TypeScript 6 records them on the nodes.
        let emit_context = tsrs_printer::new_emit_context();
        let builder = tsrs_checker::new_node_builder_ex(&self.checker, emit_context, Some(id_to_symbol));
        let Some(node) = builder.type_to_type_node(
            &mut self.checker,
            t,
            None,
            BuilderFlags::NoTruncation,
            InternalFlags::None,
            None,
        ) else {
            return Value::Null;
        };
        let mut printer = tsrs_printer::new_printer(
            tsrs_printer::PrinterOptions { remove_comments: true, ..Default::default() },
            tsrs_printer::PrintHandlers::default(),
            Some(emit_context),
        );
        let text = printer.emit(node, None);
        let mut symbols = Vec::new();
        fn visit(node: P<Node>, out: &mut Vec<Option<P<Symbol>>>, map: &FxHashMap<P<Node>, P<Symbol>>) {
            if node.kind() == Kind::Identifier {
                out.push(map.get(&node).copied());
            }
            node.for_each_child(&mut |child| {
                visit(child, out, map);
                false
            });
        }
        visit(node, &mut symbols, &id_to_symbol.borrow());
        let identifiers = symbols.into_iter().map(|s| self.opt_symbol(s)).collect();
        json!({ "text": text, "identifiers": Value::Array(identifiers) })
    }

    fn query(&mut self, op: &str, q: &Value) -> Res {
        Ok(match op {
            "fileText" => json!(self.files.get(field(q, "file")?, "file")?.text()),
            "typeAtLocation" => {
                let node = self.node(q)?;
                let t = self.checker.get_type_at_location(node);
                self.type_id(t)
            }
            "typeFromTypeNode" => {
                let node = self.node(q)?;
                let t = self.checker.get_type_from_type_node_exported(node);
                self.type_id(t)
            }
            "symbolAtLocation" => {
                let node = self.node(q)?;
                let s = self.checker.get_symbol_at_location_exported(node);
                self.opt_symbol(s)
            }
            "symbolOfDeclaration" => {
                let node = self.node(q)?;
                self.opt_symbol(node.symbol())
            }
            "returnTypeOfDeclaration" => {
                let node = self.node(q)?;
                if !tsrs_ast::is_function_like(node) {
                    return Ok(Value::Null);
                }
                let sig = self.checker.get_signature_from_declaration_exported(node);
                let t = self.checker.get_return_type_of_signature_exported(sig);
                self.type_id(t)
            }
            "constantValue" => {
                let node = self.node(q)?;
                match self.checker.get_constant_value(node) {
                    Some(LiteralValue::String(s)) => json!(s),
                    Some(LiteralValue::Number(n)) => json!(n.0),
                    _ => Value::Null,
                }
            }
            "type" => {
                let t = self.ty(q, "type")?;
                let facts = self.type_facts(t);
                let id = self.types.id(t);
                self.types.mark_sent(id);
                facts
            }
            "symbol" => {
                let s = self.sym(q)?;
                let facts = self.symbol_facts(s);
                let id = self.symbols.id(s);
                self.symbols.mark_sent(id);
                facts
            }
            "prefetchFile" => {
                let file = self.files.get(field(q, "file")?, "file")?;
                self.prefetch_file(file)
            }
            "typeOfSymbol" => {
                let s = self.sym(q)?;
                let t = self.checker.get_type_of_symbol_exported(s);
                self.type_id(t)
            }
            "resolveName" => {
                let location = self.node(q)?;
                let name = field_str(q, "name")?;
                let mut meaning = SymbolFlags::empty();
                for flag in field(q, "meaning")?.as_array().ok_or("meaning: expected a list")? {
                    let flag = flag.as_str().ok_or("meaning: expected names")?;
                    let (bits, _) = SYMBOL_FLAG_NAMES
                        .iter()
                        .find(|(_, n)| *n == flag)
                        .ok_or_else(|| format!("unknown SymbolFlags name {flag:?}"))?;
                    meaning |= *bits;
                }
                let found = self.checker.resolve_name_exported(name, location, meaning, false);
                self.opt_symbol(found)
            }
            "exportOf" => {
                let s = self.sym(q)?;
                let name = field_str(q, "name")?;
                let member = s.exports().and_then(|table| table.lookup(name));
                self.opt_symbol(member)
            }
            "properties" => {
                let t = self.ty(q, "type")?;
                let props = self.checker.get_properties_of_type_exported(t);
                Value::Array(props.iter().map(|p| json!(self.symbols.id(*p))).collect())
            }
            "property" => {
                let t = self.ty(q, "type")?;
                let p = self.checker.get_property_of_type_exported(t, field_str(q, "name")?);
                self.opt_symbol(p)
            }
            "indexInfos" => {
                let t = self.ty(q, "type")?;
                self.index_infos(t)
            }
            "members" => {
                let t = self.ty(q, "type")?;
                let props = self.checker.get_properties_of_type_exported(t);
                let mut properties = Vec::with_capacity(props.len());
                for p in props {
                    let pt = self.checker.get_type_of_symbol_exported(*p);
                    properties.push(json!([self.symbols.id(*p), self.types.id(pt)]));
                }
                json!({ "properties": properties, "indexInfos": self.index_infos(t) })
            }
            "callSignatures" => {
                let t = self.ty(q, "type")?;
                let sigs = self.checker.get_signatures_of_type_exported(t, SignatureKind::Call);
                let mut out = Vec::with_capacity(sigs.len());
                for sig in sigs {
                    let r = self.checker.get_return_type_of_signature_exported(*sig);
                    out.push(json!({ "returnType": self.types.id(r) }));
                }
                Value::Array(out)
            }
            "nonNullable" => {
                let t = self.ty(q, "type")?;
                let n = self.checker.get_non_nullable_type(t);
                self.type_id(n)
            }
            "union" => {
                let types = field(q, "types")?
                    .as_array()
                    .ok_or("types: expected an array")?
                    .iter()
                    .map(|v| self.types.get(v, "type"))
                    .collect::<Result<Vec<_>, _>>()?;
                let u = self.checker.get_union_type_exported(&types);
                self.type_id(u)
            }
            "assignable" => {
                let source = self.ty(q, "source")?;
                let target = self.ty(q, "target")?;
                json!(self.checker.is_type_assignable_to_exported(source, target))
            }
            "typeToString" => {
                let t = self.ty(q, "type")?;
                json!(self.checker.type_to_string_exported(t))
            }
            "print" => {
                let t = self.ty(q, "type")?;
                self.print(t)
            }
            _ => return Err(format!("unknown op {op}")),
        })
    }
}

fn respond(result: Res) -> Value {
    match result {
        Ok(v) => json!({ "ok": true, "result": v }),
        Err(e) => json!({ "ok": false, "error": e }),
    }
}

fn panic_text(p: &(dyn std::any::Any + Send)) -> String {
    p.downcast_ref::<&str>()
        .map(ToString::to_string)
        .or_else(|| p.downcast_ref::<String>().cloned())
        .unwrap_or_else(|| "panic".to_string())
}

/// One query, with a checker panic reported as its own error rather than ending the process.
fn answer(session: &mut Option<Session>, q: &Value) -> Res {
    let op = field_str(q, "op")?;
    if op == "open" {
        if session.is_some() {
            return Err("open: a program is already open".into());
        }
        let (s, result) = std::panic::catch_unwind(|| open(q))
            .map_err(|p| format!("panic: {}", panic_text(&*p)))??;
        *session = Some(s);
        return Ok(result);
    }
    let s = session.as_mut().ok_or("no program: send open first")?;
    std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| s.query(op, q)))
        .map_err(|p| format!("panic: {}", panic_text(&*p)))?
}

fn read_message(input: &mut impl Read) -> Option<Vec<u8>> {
    let mut len = [0u8; 4];
    input.read_exact(&mut len).ok()?;
    let mut body = vec![0u8; u32::from_le_bytes(len) as usize];
    input.read_exact(&mut body).ok()?;
    Some(body)
}

fn write_message(output: &mut impl Write, v: &Value) {
    let body = serde_json::to_vec(v).unwrap();
    output.write_all(&(body.len() as u32).to_le_bytes()).unwrap();
    output.write_all(&body).unwrap();
    output.flush().unwrap();
}

fn serve() {
    let mut input = std::io::stdin().lock();
    let mut output = std::io::stdout().lock();
    let mut session: Option<Session> = None;
    while let Some(body) = read_message(&mut input) {
        let request: Value = match serde_json::from_slice(&body) {
            Ok(v) => v,
            Err(e) => {
                write_message(&mut output, &respond(Err(format!("bad request: {e}"))));
                continue;
            }
        };
        let response = match request.get("op").and_then(Value::as_str) {
            Some("batch") => match request.get("queries").and_then(Value::as_array) {
                Some(queries) => respond(Ok(Value::Array(
                    queries.iter().map(|q| respond(answer(&mut session, q))).collect(),
                ))),
                None => respond(Err("batch: missing queries".into())),
            },
            Some("close") => {
                write_message(&mut output, &respond(Ok(Value::Null)));
                break;
            }
            _ => respond(answer(&mut session, &request)),
        };
        let mut response = response;
        if let Some(s) = session.as_mut() {
            if let Some(facts) = s.inline_facts() {
                response["facts"] = facts;
            }
        }
        write_message(&mut output, &response);
    }
    // Checker values live in leak arenas; exit without dropping the session.
    std::mem::forget(session);
}

fn main() {
    #[cfg(target_os = "linux")]
    tsrs_core::allocator::init_mimalloc();
    // Checking recurses deeply; serve on a large stack as the tsrs CLI does.
    std::thread::Builder::new().name("tsoa-facts".into()).stack_size(512 << 20).spawn(serve).unwrap().join().unwrap();
}
