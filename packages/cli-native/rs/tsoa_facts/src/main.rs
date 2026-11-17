// tsoa facts helper on tsrs: answers PROTOCOL.md queries about one program with one checker, on one thread, over
// stdio or the named pipe given as `--pipe <path>`.

#[global_allocator]
static GLOBAL: mimalloc_safe::MiMalloc = mimalloc_safe::MiMalloc;

use std::cell::RefCell;
use std::io::{Read, Write};
use std::sync::Arc;

use rustc_hash::FxHashMap;
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use tsrs_ast::{Kind, Node, SourceFile, Symbol, SymbolFlags};
use tsrs_checker::{Flags as BuilderFlags, InternalFlags, LiteralValue, SignatureKind, Type};
use tsrs_compiler::{CheckerHandle, ProgramOptions};
use tsrs_core::collections::OrderedMap;
use tsrs_core::tspath::{self, ComparePathsOptions};
use tsrs_core::{CompilerOptions, Context, P, Tristate};
use tsrs_tsoptions::{CompilerOptionsValue, ParseConfigHost};
use tsrs_vfs::{FS, bundled, cachedvfs, osvfs};

mod facts;
mod flags;

use facts::{Ids, InlineFacts, NodeRef};
use flags::{SYMBOL_FLAG_NAMES, kind_name, kind_names};

type Res = Result<Value, String>;

/// The PROTOCOL.md revision this helper speaks; `open` reports it.
const PROTOCOL_REVISION: u32 = 8;

// Wire shapes, field for field as in packages/cli/src/metadataGeneration/native/protocol.ts.

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FileInfo {
    id: u32,
    file_name: &'static str,
    is_declaration_file: bool,
    is_default_library: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct OpenResult {
    protocol: u32,
    files: Vec<FileInfo>,
    undefined_type: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct IndexInfo {
    key_type: u32,
    #[serde(rename = "type")]
    ty: u32,
    is_readonly: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    declaration: Option<NodeRef>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Members {
    properties: Vec<(u32, u32)>,
    index_infos: Vec<IndexInfo>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CallSignature {
    return_type: u32,
}

/// One prefetchFile answer: UTF-16 pos and end, kind, id.
type Entry = (u32, u32, String, Option<u32>);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PrefetchResult {
    symbol_at: Vec<Entry>,
    type_from: Vec<Entry>,
    declared: Vec<Entry>,
    type_of_symbol: Vec<(u32, u32)>,
}

#[derive(Serialize)]
struct PrintResult {
    text: String,
    identifiers: Vec<Option<u32>>,
}

// Op inputs, one struct per input shape in the protocol's operation table. Every field is required.

#[derive(Deserialize)]
struct Query {
    op: String,
}

#[derive(Deserialize)]
struct Batch {
    queries: Vec<Value>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct OpenInput {
    cwd: String,
    root_files: Vec<String>,
    compiler_options: Value,
}

#[derive(Deserialize)]
struct FileInput {
    file: u32,
}

#[derive(Deserialize)]
struct NodeInput {
    node: NodeRef,
}

#[derive(Deserialize)]
struct TypeInput {
    #[serde(rename = "type")]
    ty: u32,
}

#[derive(Deserialize)]
struct SymbolInput {
    symbol: u32,
}

#[derive(Deserialize)]
struct ResolveNameInput {
    name: String,
    node: NodeRef,
    meaning: Vec<String>,
}

#[derive(Deserialize)]
struct ExportOfInput {
    symbol: u32,
    name: String,
}

#[derive(Deserialize)]
struct PropertyInput {
    #[serde(rename = "type")]
    ty: u32,
    name: String,
}

#[derive(Deserialize)]
struct UnionInput {
    types: Vec<u32>,
}

#[derive(Deserialize)]
struct AssignableInput {
    source: u32,
    target: u32,
}

/// Parses an op's input; a field the query leaves out fails with "missing <field>".
fn decode<In: DeserializeOwned>(q: &Value) -> Result<In, String> {
    In::deserialize(q).map_err(|e| {
        let e = e.to_string();
        match e.strip_prefix("missing field `").and_then(|f| f.strip_suffix('`')) {
            Some(field) => format!("missing {field}"),
            None => e,
        }
    })
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

fn config_value(v: &Value) -> CompilerOptionsValue {
    match v {
        Value::Null => CompilerOptionsValue::Null,
        Value::Bool(b) => CompilerOptionsValue::Bool(*b),
        Value::Number(n) => CompilerOptionsValue::Float(n.as_f64().unwrap_or(0.0)),
        Value::String(s) => CompilerOptionsValue::String(s.clone()),
        Value::Array(a) => CompilerOptionsValue::Array(a.iter().map(config_value).collect()),
        Value::Object(m) => CompilerOptionsValue::Object(
            m.iter().map(|(k, v)| (k.clone(), config_value(v))).collect(),
        ),
    }
}

fn open(q: OpenInput) -> Result<(Session, OpenResult), String> {
    let cwd = tspath::normalize_path(&q.cwd);
    let fs: Arc<dyn FS> = Arc::new(cachedvfs::from(bundled::wrap_fs(osvfs::fs())));
    let host = ConfigHost { fs: Arc::clone(&fs), cwd: cwd.clone() };
    let roots: Vec<String> =
        q.root_files.iter().map(|f| tspath::get_normalized_absolute_path(f, &cwd)).collect();
    let mut json = OrderedMap::default();
    json.insert("compilerOptions".to_string(), config_value(&q.compiler_options));
    json.insert(
        "files".to_string(),
        CompilerOptionsValue::Array(
            roots.iter().map(|r| CompilerOptionsValue::String(r.clone())).collect(),
        ),
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
    let failures: Vec<String> = parsed
        .errors
        .iter()
        .filter(|d| d.code() != 18002 && d.code() != 18003)
        .map(|d| d.localize())
        .collect();
    if !failures.is_empty() {
        return Err(failures.join("\n"));
    }
    let base = (*parsed.compiler_options().unwrap()).clone();
    // One checker on this thread: the pool's single checker is the one every query uses.
    let options =
        P::new(CompilerOptions { single_threaded: Tristate::True, checkers: Some(1), ..base });
    let compare = ComparePathsOptions {
        use_case_sensitive_file_names: fs.use_case_sensitive_file_names(),
        current_directory: cwd.clone(),
    };
    let config =
        P::new(tsrs_tsoptions::new_parsed_command_line(options, roots, Vec::new(), compare));
    let compiler_host =
        tsrs_compiler::new_compiler_host(&cwd, fs, &bundled::default_lib_path(), None, None, None);
    let mut program_options = ProgramOptions::new(config, compiler_host);
    program_options.single_threaded = Tristate::True;
    let program = tsrs_compiler::new_program(program_options);
    for d in program.get_program_diagnostics() {
        eprintln!("tsoa-facts: program: {}", d.localize());
    }
    let checker = program.get_type_checker(&Context::background());
    let mut s = Session { checker, files: Ids::new(), types: Ids::new(), symbols: Ids::new() };
    let files = program
        .get_source_files()
        .iter()
        .map(|f| FileInfo {
            id: s.files.intern(*f),
            file_name: f.file_name(),
            is_declaration_file: f.is_declaration_file(),
            is_default_library: program.is_source_file_default_library(f.path()),
        })
        .collect();
    let undefined = s.checker.get_undefined_type();
    let undefined_type = s.types.hand_out(undefined);
    Ok((s, OpenResult { protocol: PROTOCOL_REVISION, files, undefined_type }))
}

fn find_node(node: P<Node>, pos: u32, end: u32, kind: Kind) -> Option<P<Node>> {
    if node.pos().source_offset() == Some(pos)
        && node.end().source_offset() == Some(end)
        && (node.kind() == kind
            || kind == Kind::ExpressionWithTypeArguments && node.kind() == Kind::TypeReference)
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
    fn node(&self, r: &NodeRef) -> Result<P<Node>, String> {
        let file = self.files.get(r.file, "file")?;
        let map = file.get_position_map();
        let utf16 = |name: &str, n: i64| {
            u32::try_from(n).map_err(|_| format!("node.{name}: expected a position, got {n}"))
        };
        let (pos16, end16) = (utf16("pos", r.pos)?, utf16("end", r.end)?);
        let pos = map.utf16_to_utf8(pos16);
        let end = map.utf16_to_utf8(end16);
        kind_names()
            .kinds
            .get(r.kind.as_str())
            .and_then(|kind| find_node(file.as_node(), pos, end, *kind))
            .ok_or_else(|| {
                format!("no {} node at {pos16}..{end16} in {}", r.kind, file.file_name())
            })
    }

    /// PROTOCOL.md revision 4b.
    fn prefetch_file(&mut self, file: P<SourceFile>) -> PrefetchResult {
        struct Entries {
            seen: std::collections::HashSet<(u32, u32, String)>,
            list: Vec<Entry>,
        }
        impl Entries {
            fn push(
                &mut self,
                pos: u32,
                end: u32,
                kind: &str,
                id: Option<u32>,
                map: &tsrs_ast::PositionMap,
            ) {
                if self.seen.insert((pos, end, kind.to_string())) {
                    self.list.push((
                        map.utf8_to_utf16(pos),
                        map.utf8_to_utf16(end),
                        kind.to_string(),
                        id,
                    ));
                }
            }
        }
        let new_entries = || Entries { seen: Default::default(), list: Vec::new() };
        let (mut symbol_at, mut type_from, mut declared) =
            (new_entries(), new_entries(), new_entries());
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
            if let (Some(pos), Some(end)) = (node.pos().source_offset(), node.end().source_offset())
            {
                let kind = kind_name(node);
                if node.kind() == Kind::Identifier {
                    let sym = s.checker.get_symbol_at_location_exported(node);
                    if let Some(sym) = sym {
                        property_symbols.push(sym);
                    }
                    let id = sym.map(|x| s.symbols.hand_out(x));
                    symbol_at.push(pos, end, kind, id, map);
                }
                if tsrs_ast::is_type_node(node) {
                    let t = s.checker.get_type_from_type_node_exported(node);
                    let id = s.types.hand_out(t);
                    type_from.push(pos, end, kind, Some(id), map);
                }
                if let Some(sym) = node.symbol() {
                    property_symbols.push(sym);
                    let id = s.symbols.hand_out(sym);
                    declared.push(pos, end, kind, Some(id), map);
                }
            }
            node.for_each_child(&mut |child| {
                visit(s, child, map, symbol_at, type_from, declared, property_symbols);
                false
            });
        }
        visit(
            self,
            file.as_node(),
            &map,
            &mut symbol_at,
            &mut type_from,
            &mut declared,
            &mut property_symbols,
        );

        let mut type_of_symbol = Vec::new();
        let mut done = std::collections::HashSet::new();
        for sym in property_symbols {
            if sym.flags().intersects(SymbolFlags::Property) && done.insert(sym) {
                let t = self.checker.get_type_of_symbol_exported(sym);
                type_of_symbol.push((self.symbols.hand_out(sym), self.types.hand_out(t)));
            }
        }
        PrefetchResult {
            symbol_at: symbol_at.list,
            type_from: type_from.list,
            declared: declared.list,
            type_of_symbol,
        }
    }

    fn index_infos(&mut self, t: P<Type>) -> Vec<IndexInfo> {
        let infos = self.checker.get_index_infos_of_type_exported(t);
        infos
            .iter()
            .map(|i| IndexInfo {
                key_type: self.types.hand_out(i.key_type()),
                ty: self.types.hand_out(i.value_type()),
                is_readonly: i.is_readonly(),
                declaration: i.declaration().and_then(|d| self.node_ref(d)),
            })
            .collect()
    }

    fn print(&mut self, t: P<Type>) -> Option<PrintResult> {
        let id_to_symbol = P::new(RefCell::new(FxHashMap::default()));
        // The printer must share the node builder's emit context: the builder records emit flags there (SingleLine
        // on type literals), as TypeScript 6 records them on the nodes.
        let emit_context = tsrs_printer::new_emit_context();
        let builder =
            tsrs_checker::new_node_builder_ex(&self.checker, emit_context, Some(id_to_symbol));
        let node = builder.type_to_type_node(
            &mut self.checker,
            t,
            None,
            BuilderFlags::NoTruncation,
            InternalFlags::None,
            None,
        )?;
        let mut printer = tsrs_printer::new_printer(
            tsrs_printer::PrinterOptions { remove_comments: true, ..Default::default() },
            tsrs_printer::PrintHandlers::default(),
            Some(emit_context),
        );
        let text = printer.emit(node, None);
        let mut symbols = Vec::new();
        fn visit(
            node: P<Node>,
            out: &mut Vec<Option<P<Symbol>>>,
            map: &FxHashMap<P<Node>, P<Symbol>>,
        ) {
            if node.kind() == Kind::Identifier {
                out.push(map.get(&node).copied());
            }
            node.for_each_child(&mut |child| {
                visit(child, out, map);
                false
            });
        }
        visit(node, &mut symbols, &id_to_symbol.borrow());
        let identifiers =
            symbols.into_iter().map(|s| s.map(|s| self.symbols.hand_out(s))).collect();
        Some(PrintResult { text, identifiers })
    }

    fn ty(&self, id: u32) -> Result<P<Type>, String> {
        self.types.get(id, "type")
    }

    fn sym(&self, id: u32) -> Result<P<Symbol>, String> {
        self.symbols.get(id, "symbol")
    }

    fn node_of(&self, q: &Value) -> Result<P<Node>, String> {
        self.node(&decode::<NodeInput>(q)?.node)
    }

    fn type_of(&self, q: &Value) -> Result<P<Type>, String> {
        self.ty(decode::<TypeInput>(q)?.ty)
    }

    fn symbol_of(&self, q: &Value) -> Result<P<Symbol>, String> {
        self.sym(decode::<SymbolInput>(q)?.symbol)
    }

    fn query(&mut self, op: &str, q: &Value) -> Res {
        Ok(match op {
            "fileText" => json!(self.files.get(decode::<FileInput>(q)?.file, "file")?.text()),
            "prefetchFile" => {
                let file = self.files.get(decode::<FileInput>(q)?.file, "file")?;
                json!(self.prefetch_file(file))
            }
            "typeAtLocation" => {
                let node = self.node_of(q)?;
                let t = self.checker.get_type_at_location(node);
                json!(self.types.hand_out(t))
            }
            "typeFromTypeNode" => {
                let node = self.node_of(q)?;
                let t = self.checker.get_type_from_type_node_exported(node);
                json!(self.types.hand_out(t))
            }
            "symbolAtLocation" => {
                let node = self.node_of(q)?;
                let s = self.checker.get_symbol_at_location_exported(node);
                json!(s.map(|s| self.symbols.hand_out(s)))
            }
            "symbolOfDeclaration" => {
                let node = self.node_of(q)?;
                json!(node.symbol().map(|s| self.symbols.hand_out(s)))
            }
            "returnTypeOfDeclaration" => {
                let node = self.node_of(q)?;
                if !tsrs_ast::is_function_like(node) {
                    return Ok(Value::Null);
                }
                let sig = self.checker.get_signature_from_declaration_exported(node);
                let t = self.checker.get_return_type_of_signature_exported(sig);
                json!(self.types.hand_out(t))
            }
            "constantValue" => {
                let node = self.node_of(q)?;
                match self.checker.get_constant_value(node) {
                    Some(LiteralValue::String(s)) => json!(s),
                    Some(LiteralValue::Number(n)) => json!(n.0),
                    _ => Value::Null,
                }
            }
            "resolveName" => {
                let input: ResolveNameInput = decode(q)?;
                let location = self.node(&input.node)?;
                let mut meaning = SymbolFlags::empty();
                for flag in &input.meaning {
                    let (bits, _) = SYMBOL_FLAG_NAMES
                        .iter()
                        .find(|(_, n)| n == flag)
                        .ok_or_else(|| format!("unknown SymbolFlags name {flag:?}"))?;
                    meaning |= *bits;
                }
                let found =
                    self.checker.resolve_name_exported(&input.name, location, meaning, false);
                json!(found.map(|s| self.symbols.hand_out(s)))
            }
            "type" => {
                let t = self.type_of(q)?;
                let facts = self.type_facts(t);
                self.types.mark_sent(facts.id);
                json!(facts)
            }
            "symbol" => {
                let s = self.symbol_of(q)?;
                let facts = self.symbol_facts(s);
                self.symbols.mark_sent(facts.id);
                json!(facts)
            }
            "typeOfSymbol" => {
                let s = self.symbol_of(q)?;
                let t = self.checker.get_type_of_symbol_exported(s);
                json!(self.types.hand_out(t))
            }
            "exportOf" => {
                let input: ExportOfInput = decode(q)?;
                let s = self.sym(input.symbol)?;
                let member = s.exports().and_then(|table| table.lookup(&input.name));
                json!(member.map(|m| self.symbols.hand_out(m)))
            }
            "members" => {
                let t = self.type_of(q)?;
                let props = self.checker.get_properties_of_type_exported(t);
                let mut properties = Vec::with_capacity(props.len());
                for p in props {
                    let pt = self.checker.get_type_of_symbol_exported(*p);
                    properties.push((self.symbols.hand_out(*p), self.types.hand_out(pt)));
                }
                json!(Members { properties, index_infos: self.index_infos(t) })
            }
            "property" => {
                let input: PropertyInput = decode(q)?;
                let t = self.ty(input.ty)?;
                let p = self.checker.get_property_of_type_exported(t, &input.name);
                json!(p.map(|p| self.symbols.hand_out(p)))
            }
            "callSignatures" => {
                let t = self.type_of(q)?;
                let sigs = self.checker.get_signatures_of_type_exported(t, SignatureKind::Call);
                let mut out = Vec::with_capacity(sigs.len());
                for sig in sigs {
                    let r = self.checker.get_return_type_of_signature_exported(*sig);
                    out.push(CallSignature { return_type: self.types.hand_out(r) });
                }
                json!(out)
            }
            "nonNullable" => {
                let t = self.type_of(q)?;
                let n = self.checker.get_non_nullable_type(t);
                json!(self.types.hand_out(n))
            }
            "union" => {
                let input: UnionInput = decode(q)?;
                let types =
                    input.types.into_iter().map(|id| self.ty(id)).collect::<Result<Vec<_>, _>>()?;
                let u = self.checker.get_union_type_exported(&types);
                json!(self.types.hand_out(u))
            }
            "assignable" => {
                let input: AssignableInput = decode(q)?;
                let (source, target) = (self.ty(input.source)?, self.ty(input.target)?);
                json!(self.checker.is_type_assignable_to_exported(source, target))
            }
            "typeToString" => {
                let t = self.type_of(q)?;
                json!(self.checker.type_to_string_exported(t))
            }
            "print" => {
                let t = self.type_of(q)?;
                json!(self.print(t))
            }
            _ => return Err("unknown op".to_string()),
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

/// One query and the facts it adds. Errors read "<op>: <error>", and a checker panic in either the op or its facts is
/// the query's error rather than ending the process.
fn answer(session: &mut Option<Session>, q: &Value, facts: &mut InlineFacts) -> Res {
    let op = decode::<Query>(q)?.op;
    answer_op(session, &op, q, facts).map_err(|e| format!("{op}: {e}"))
}

fn answer_op(session: &mut Option<Session>, op: &str, q: &Value, facts: &mut InlineFacts) -> Res {
    let panicked = |p: Box<dyn std::any::Any + Send>| format!("panic: {}", panic_text(&*p));
    if op == "open" {
        if session.is_some() {
            return Err("a program is already open".into());
        }
        let (s, result) = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            let (mut s, result) = open(decode(q)?)?;
            s.add_facts(facts);
            Ok::<_, String>((s, json!(result)))
        }))
        .map_err(panicked)??;
        *session = Some(s);
        return Ok(result);
    }
    let s = session.as_mut().ok_or("no program is open")?;
    std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let result = s.query(op, q);
        s.add_facts(facts);
        result
    }))
    .unwrap_or_else(|p| {
        s.types.handed_out.clear();
        s.symbols.handed_out.clear();
        Err(panicked(p))
    })
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

fn serve(mut input: impl Read, mut output: impl Write) {
    let mut session: Option<Session> = None;
    while let Some(body) = read_message(&mut input) {
        let mut facts = InlineFacts::default();
        let request: Value = match serde_json::from_slice(&body) {
            Ok(v) => v,
            Err(e) => {
                write_message(&mut output, &respond(Err(format!("bad request: {e}"))));
                continue;
            }
        };
        let response = match request.get("op").and_then(Value::as_str) {
            Some("batch") => match decode::<Batch>(&request) {
                Ok(batch) => respond(Ok(Value::Array(
                    batch
                        .queries
                        .iter()
                        .map(|q| respond(answer(&mut session, q, &mut facts)))
                        .collect(),
                ))),
                Err(e) => respond(Err(format!("batch: {e}"))),
            },
            Some("close") => {
                write_message(&mut output, &respond(Ok(Value::Null)));
                break;
            }
            _ => respond(answer(&mut session, &request, &mut facts)),
        };
        let mut response = response;
        if !facts.types.is_empty() || !facts.symbols.is_empty() {
            response["facts"] = json!(facts);
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
    let args: Vec<String> = std::env::args().skip(1).collect();
    let stream = match args.as_slice() {
        [flag, path] if flag == "--pipe" => {
            match tsrs_api_transport::PipeListener::bind(std::path::Path::new(path))
                .and_then(|l| l.accept())
            {
                Ok(stream) => Some(stream),
                Err(e) => {
                    eprintln!("--pipe: {e}");
                    std::process::exit(1);
                }
            }
        }
        _ => None,
    };
    std::thread::Builder::new()
        .name("tsoa-facts".into())
        .stack_size(512 << 20)
        .spawn(move || match stream {
            Some(stream) => serve(stream.reader, stream.writer),
            None => serve(std::io::stdin().lock(), std::io::stdout().lock()),
        })
        .unwrap()
        .join()
        .unwrap();
}
