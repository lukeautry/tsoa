// Command tsoa-facts answers type and symbol questions about one program over the tsoa facts protocol
// (spike/PROTOCOL.md): length-prefixed JSON on stdin and stdout, one checker, one goroutine.
package main

import (
	"bufio"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"runtime/debug"
	"strings"

	"github.com/microsoft/TypeScript/tsc/internal/ast"
	"github.com/microsoft/TypeScript/tsc/internal/bundled"
	"github.com/microsoft/TypeScript/tsc/internal/checker"
	"github.com/microsoft/TypeScript/tsc/internal/compiler"
	"github.com/microsoft/TypeScript/tsc/internal/core"
	"github.com/microsoft/TypeScript/tsc/internal/jsnum"
	"github.com/microsoft/TypeScript/tsc/internal/nodebuilder"
	"github.com/microsoft/TypeScript/tsc/internal/printer"
	"github.com/microsoft/TypeScript/tsc/internal/tsoptions"
	"github.com/microsoft/TypeScript/tsc/internal/tspath"
	"github.com/microsoft/TypeScript/tsc/internal/vfs/osvfs"
)

// protocolRevision is the PROTOCOL.md revision this helper speaks; `open` reports it.
const protocolRevision = 8

type nodeRef struct {
	File int    `json:"file"`
	Pos  int    `json:"pos"`
	End  int    `json:"end"`
	Kind string `json:"kind"`
}

// args is every query's input; each op reads the fields its row in the protocol table names.
type args struct {
	Op               string            `json:"op"`
	Queries          []json.RawMessage `json:"queries"`
	Cwd              string            `json:"cwd"`
	RootFiles        []string          `json:"rootFiles"`
	CompilerOptions  map[string]any    `json:"compilerOptions"`
	File             int               `json:"file"`
	Node             *nodeRef          `json:"node"`
	Type             int               `json:"type"`
	Types            []int             `json:"types"`
	Symbol           int               `json:"symbol"`
	Name             string            `json:"name"`
	Source           int               `json:"source"`
	Meaning          []string          `json:"meaning"`
	Target           int               `json:"target"`
}

type response struct {
	Ok     bool   `json:"ok"`
	Result any    `json:"result"`
	Error  string `json:"error,omitempty"`
	Facts  any    `json:"facts,omitempty"`
}

type session struct {
	program   *compiler.Program
	checker   *checker.Checker
	files     []*ast.SourceFile
	fileIds   map[*ast.SourceFile]int
	types     []*checker.Type
	typeIds   map[*checker.Type]int
	symbols   []*ast.Symbol
	symbolIds map[*ast.Symbol]int
	closed    bool

	// Revision 4a: ids handed out while a request runs, and the ids whose facts already went out.
	recording      bool
	touchedTypes   []int
	touchedSymbols []int
	sentTypes      map[int]bool
	sentSymbols    map[int]bool
}

func main() {
	debug.SetGCPercent(-1)
	debug.SetMemoryLimit(2 << 30)
	in := bufio.NewReader(os.Stdin)
	out := bufio.NewWriter(os.Stdout)
	s := &session{sentTypes: map[int]bool{}, sentSymbols: map[int]bool{}}
	for !s.closed {
		var header [4]byte
		if _, err := io.ReadFull(in, header[:]); err != nil {
			return
		}
		body := make([]byte, binary.LittleEndian.Uint32(header[:]))
		if _, err := io.ReadFull(in, body); err != nil {
			fmt.Fprintln(os.Stderr, "truncated request:", err)
			os.Exit(1)
		}
		encoded, err := json.Marshal(s.serve(body))
		if err != nil {
			encoded, _ = json.Marshal(response{Error: err.Error()})
		}
		binary.LittleEndian.PutUint32(header[:], uint32(len(encoded)))
		out.Write(header[:])
		out.Write(encoded)
		out.Flush()
	}
}

func (s *session) serve(body []byte) response {
	s.recording, s.touchedTypes, s.touchedSymbols = true, nil, nil
	r := s.serveRequest(body)
	r.Facts = s.takeFacts()
	return r
}

// takeFacts computes the facts of every id handed out during the request whose facts were not sent yet.
// The snapshot is taken first and recording stops, so computing facts adds no ids to it.
func (s *session) takeFacts() any {
	s.recording = false
	typeFacts, symbolFacts := map[int]any{}, map[int]any{}
	for _, id := range s.touchedTypes {
		if !s.sentTypes[id] {
			s.sentTypes[id] = true
			typeFacts[id] = s.typeFacts(s.types[id-1])
		}
	}
	for _, id := range s.touchedSymbols {
		if !s.sentSymbols[id] {
			s.sentSymbols[id] = true
			symbolFacts[id] = s.symbolFacts(s.symbols[id-1])
		}
	}
	if len(typeFacts) == 0 && len(symbolFacts) == 0 {
		return nil
	}
	facts := map[string]any{}
	if len(typeFacts) > 0 {
		facts["types"] = typeFacts
	}
	if len(symbolFacts) > 0 {
		facts["symbols"] = symbolFacts
	}
	return facts
}

func (s *session) serveRequest(body []byte) response {
	var a args
	if err := json.Unmarshal(body, &a); err != nil {
		return response{Error: "invalid request: " + err.Error()}
	}
	if a.Op != "batch" {
		return s.query(&a)
	}
	results := make([]response, len(a.Queries))
	for i, raw := range a.Queries {
		var q args
		if err := json.Unmarshal(raw, &q); err != nil {
			results[i] = response{Error: "invalid query: " + err.Error()}
			continue
		}
		results[i] = s.query(&q)
	}
	return response{Ok: true, Result: results}
}

func (s *session) query(a *args) (r response) {
	defer func() {
		if p := recover(); p != nil {
			r = response{Error: fmt.Sprintf("%s: panic: %v\n%s", a.Op, p, debug.Stack())}
		}
	}()
	handler, ok := handlers[a.Op]
	if !ok {
		return response{Error: "unknown op " + a.Op}
	}
	if a.Op != "open" && a.Op != "close" && s.checker == nil {
		return response{Error: a.Op + ": no program is open"}
	}
	if a.Op == "type" || a.Op == "symbol" {
		defer func(prev bool) { s.recording = prev }(s.recording)
		s.recording = false
	}
	result, err := handler(s, a)
	if err != nil {
		return response{Error: a.Op + ": " + err.Error()}
	}
	return response{Ok: true, Result: result}
}

var handlers = map[string]func(s *session, a *args) (any, error){
	"open":     (*session).open,
	"close":    func(s *session, a *args) (any, error) { s.closed = true; return nil, nil },
	"fileText": func(s *session, a *args) (any, error) { f, err := s.file(a.File); return text(f), err },
	"typeAtLocation": func(s *session, a *args) (any, error) {
		n, err := s.node(a.Node)
		return s.typeIdOr(err, func() *checker.Type { return s.checker.GetTypeAtLocation(n) })
	},
	"typeFromTypeNode": func(s *session, a *args) (any, error) {
		n, err := s.node(a.Node)
		return s.typeIdOr(err, func() *checker.Type { return s.checker.GetTypeFromTypeNode(n) })
	},
	"symbolAtLocation": func(s *session, a *args) (any, error) {
		n, err := s.node(a.Node)
		if err != nil {
			return nil, err
		}
		return s.symbolId(s.checker.GetSymbolAtLocation(n)), nil
	},
	"symbolOfDeclaration": func(s *session, a *args) (any, error) {
		n, err := s.node(a.Node)
		if err != nil {
			return nil, err
		}
		return s.symbolId(n.Symbol()), nil
	},
	"returnTypeOfDeclaration": func(s *session, a *args) (any, error) {
		n, err := s.node(a.Node)
		if err != nil {
			return nil, err
		}
		if !ast.IsFunctionLike(n) {
			return nil, nil
		}
		sig := s.checker.GetSignatureFromDeclaration(n)
		if sig == nil {
			return nil, nil
		}
		return s.typeId(s.checker.GetReturnTypeOfSignature(sig)), nil
	},
	"constantValue": func(s *session, a *args) (any, error) {
		n, err := s.node(a.Node)
		if err != nil {
			return nil, err
		}
		switch v := s.checker.GetConstantValue(n).(type) {
		case string:
			return v, nil
		case jsnum.Number:
			return float64(v), nil
		}
		return nil, nil
	},
	"type": func(s *session, a *args) (any, error) {
		t, err := s.type_(a.Type)
		if err != nil {
			return nil, err
		}
		s.sentTypes[a.Type] = true
		return s.typeFacts(t), nil
	},
	"symbol": func(s *session, a *args) (any, error) {
		sym, err := s.symbol(a.Symbol)
		if err != nil {
			return nil, err
		}
		s.sentSymbols[a.Symbol] = true
		return s.symbolFacts(sym), nil
	},
	"typeOfSymbol": func(s *session, a *args) (any, error) {
		sym, err := s.symbol(a.Symbol)
		return s.typeIdOr(err, func() *checker.Type { return s.checker.GetTypeOfSymbol(sym) })
	},
	"resolveName": func(s *session, a *args) (any, error) {
		location, err := s.node(a.Node)
		if err != nil {
			return nil, err
		}
		var meaning ast.SymbolFlags
		for _, name := range a.Meaning {
			found := false
			for _, f := range symbolFlagNames {
				if f.name == name {
					meaning |= ast.SymbolFlags(f.bit)
					found = true
				}
			}
			if !found {
				return nil, fmt.Errorf("unknown SymbolFlags name %q", name)
			}
		}
		return s.symbolId(s.checker.ResolveName(a.Name, location, meaning, false)), nil
	},
	"exportOf": func(s *session, a *args) (any, error) {
		sym, err := s.symbol(a.Symbol)
		if err != nil {
			return nil, err
		}
		return s.symbolId(sym.Exports()[a.Name]), nil
	},
	"properties": func(s *session, a *args) (any, error) {
		t, err := s.type_(a.Type)
		if err != nil {
			return nil, err
		}
		ids := []int{}
		for _, p := range s.checker.GetPropertiesOfType(t) {
			ids = append(ids, s.symbolId(p).(int))
		}
		return ids, nil
	},
	"property": func(s *session, a *args) (any, error) {
		t, err := s.type_(a.Type)
		if err != nil {
			return nil, err
		}
		return s.symbolId(s.checker.GetPropertyOfType(t, a.Name)), nil
	},
	"indexInfos": func(s *session, a *args) (any, error) {
		t, err := s.type_(a.Type)
		if err != nil {
			return nil, err
		}
		return s.indexInfos(t), nil
	},
	"members": func(s *session, a *args) (any, error) {
		t, err := s.type_(a.Type)
		if err != nil {
			return nil, err
		}
		properties := [][2]any{}
		for _, p := range s.checker.GetPropertiesOfType(t) {
			properties = append(properties, [2]any{s.symbolId(p), s.typeId(s.checker.GetTypeOfSymbol(p))})
		}
		return map[string]any{"properties": properties, "indexInfos": s.indexInfos(t)}, nil
	},
	"callSignatures": func(s *session, a *args) (any, error) {
		t, err := s.type_(a.Type)
		if err != nil {
			return nil, err
		}
		sigs := []map[string]any{}
		for _, sig := range s.checker.GetSignaturesOfType(t, checker.SignatureKindCall) {
			sigs = append(sigs, map[string]any{"returnType": s.typeId(s.checker.GetReturnTypeOfSignature(sig))})
		}
		return sigs, nil
	},
	"nonNullable": func(s *session, a *args) (any, error) {
		t, err := s.type_(a.Type)
		return s.typeIdOr(err, func() *checker.Type { return s.checker.GetNonNullableType(t) })
	},
	"union": func(s *session, a *args) (any, error) {
		types := make([]*checker.Type, len(a.Types))
		for i, id := range a.Types {
			t, err := s.type_(id)
			if err != nil {
				return nil, err
			}
			types[i] = t
		}
		return s.typeId(s.checker.GetUnionType(types)), nil
	},
	"assignable": func(s *session, a *args) (any, error) {
		source, err := s.type_(a.Source)
		if err != nil {
			return nil, err
		}
		target, err := s.type_(a.Target)
		if err != nil {
			return nil, err
		}
		return s.checker.IsTypeAssignableTo(source, target), nil
	},
	"typeToString": func(s *session, a *args) (any, error) {
		t, err := s.type_(a.Type)
		if err != nil {
			return nil, err
		}
		return s.checker.TypeToString(t), nil
	},
	"print":        (*session).print,
	"prefetchFile": (*session).prefetchFile,
}

func (s *session) indexInfos(t *checker.Type) []map[string]any {
	infos := []map[string]any{}
	for _, info := range s.checker.GetIndexInfosOfType(t) {
		entry := map[string]any{"keyType": s.typeId(info.KeyType()), "type": s.typeId(info.ValueType()), "isReadonly": info.IsReadonly()}
		if d := info.Declaration(); d != nil {
			if ref := s.ref(d); ref != nil {
				entry["declaration"] = ref
			}
		}
		infos = append(infos, entry)
	}
	return infos
}

func text(f *ast.SourceFile) any {
	if f == nil {
		return nil
	}
	return f.Text()
}

func (s *session) open(a *args) (any, error) {
	if s.checker != nil {
		return nil, errors.New("a program is already open")
	}
	fs := bundled.WrapFS(osvfs.FS())
	cwd := tspath.RootedDirectoryPathFromAbsolute(a.Cwd)
	files := make([]any, len(a.RootFiles))
	for i, f := range a.RootFiles {
		files[i] = f
	}
	config := tsoptions.ParseJsonConfigFileContent(map[string]any{"compilerOptions": a.CompilerOptions, "files": files}, fs, cwd, nil, tspath.ToRootedFilePath("tsconfig.json", cwd), nil, nil)
	var diags []*ast.Diagnostic
	for _, d := range config.Errors {
		// "No inputs were found": the root files below replace the config's own file list.
		if d.Code() != 18002 && d.Code() != 18003 {
			diags = append(diags, d)
		}
	}
	if len(diags) > 0 {
		messages := make([]string, len(diags))
		for i, d := range diags {
			messages[i] = d.String()
		}
		return nil, errors.New(strings.Join(messages, "\n"))
	}
	roots := make([]tspath.RootedFilePath, len(a.RootFiles))
	for i, f := range a.RootFiles {
		roots[i] = tspath.ToRootedFilePath(f, cwd)
	}
	config = config.WithFileNames(roots)
	host := compiler.NewCompilerHost(fs, bundled.LibPath(), nil, nil, nil)
	s.program = compiler.NewProgram(compiler.ProgramOptions{ProgramConfig: compiler.ProgramConfig{Config: config}, ProgramHosts: compiler.ProgramHosts{Host: host}})
	s.checker, _ = checker.NewChecker(s.program, nil)
	s.fileIds = map[*ast.SourceFile]int{}
	s.typeIds = map[*checker.Type]int{}
	s.symbolIds = map[*ast.Symbol]int{}
	infos := []map[string]any{}
	for _, f := range s.program.GetSourceFiles() {
		s.files = append(s.files, f)
		id := len(s.files)
		s.fileIds[f] = id
		infos = append(infos, map[string]any{
			"id":                id,
			"fileName":          string(f.FileName()),
			"isDeclarationFile": f.IsDeclarationFile,
			"isDefaultLibrary":  s.program.IsSourceFileDefaultLibrary(f.PathKey()),
		})
	}
	return map[string]any{"protocol": protocolRevision, "files": infos, "undefinedType": s.typeId(s.checker.GetUndefinedType())}, nil
}

func (s *session) file(id int) (*ast.SourceFile, error) {
	if id < 1 || id > len(s.files) {
		return nil, fmt.Errorf("unknown file %d", id)
	}
	return s.files[id-1], nil
}

func (s *session) type_(id int) (*checker.Type, error) {
	if id < 1 || id > len(s.types) {
		return nil, fmt.Errorf("unknown type %d", id)
	}
	return s.types[id-1], nil
}

func (s *session) symbol(id int) (*ast.Symbol, error) {
	if id < 1 || id > len(s.symbols) {
		return nil, fmt.Errorf("unknown symbol %d", id)
	}
	return s.symbols[id-1], nil
}

func (s *session) typeId(t *checker.Type) any {
	if t == nil {
		return nil
	}
	if id, ok := s.typeIds[t]; ok {
		if s.recording {
			s.touchedTypes = append(s.touchedTypes, id)
		}
		return id
	}
	s.types = append(s.types, t)
	s.typeIds[t] = len(s.types)
	if s.recording {
		s.touchedTypes = append(s.touchedTypes, len(s.types))
	}
	return len(s.types)
}

func (s *session) typeIdOr(err error, get func() *checker.Type) (any, error) {
	if err != nil {
		return nil, err
	}
	return s.typeId(get()), nil
}

func (s *session) symbolId(sym *ast.Symbol) any {
	if sym == nil {
		return nil
	}
	if id, ok := s.symbolIds[sym]; ok {
		if s.recording {
			s.touchedSymbols = append(s.touchedSymbols, id)
		}
		return id
	}
	s.symbols = append(s.symbols, sym)
	s.symbolIds[sym] = len(s.symbols)
	if s.recording {
		s.touchedSymbols = append(s.touchedSymbols, len(s.symbols))
	}
	return len(s.symbols)
}

// node resolves a NodeRef: the first node in preorder with the ref's kind and UTF-16 full range.
func (s *session) node(ref *nodeRef) (*ast.Node, error) {
	if ref == nil {
		return nil, errors.New("missing node")
	}
	f, err := s.file(ref.File)
	if err != nil {
		return nil, err
	}
	pm := f.GetPositionMap()
	kind := ref.Kind
	for goName, ts6Name := range kindRenames {
		if ts6Name == kind {
			kind = goName
		}
	}
	pos, end, kind := pm.UTF16ToUTF8(ref.Pos), pm.UTF16ToUTF8(ref.End), "Kind"+kind
	var found *ast.Node
	var visit func(n *ast.Node) bool
	visit = func(n *ast.Node) bool {
		if n.Pos() > pos || n.End() < end {
			return false
		}
		if n.Pos() == pos && n.End() == end && (n.Kind.String() == kind || equivalentKinds[kind] == n.Kind.String()) {
			found = n
			return true
		}
		return n.ForEachChild(visit)
	}
	visit(f.AsNode())
	if found == nil {
		return nil, fmt.Errorf("no %s at %d..%d in %s", ref.Kind, ref.Pos, ref.End, f.FileName())
	}
	return found, nil
}

func (s *session) ref(n *ast.Node) any {
	if n == nil {
		return nil
	}
	f := ast.GetSourceFileOfNode(n)
	id, ok := s.fileIds[f]
	if !ok {
		return nil
	}
	pm := f.GetPositionMap()
	kind := strings.TrimPrefix(n.Kind.String(), "Kind")
	if ts6Name, ok := kindRenames[kind]; ok {
		kind = ts6Name
	}
	return nodeRef{File: id, Pos: pm.UTF8ToUTF16(n.Pos()), End: pm.UTF8ToUTF16(n.End()), Kind: kind}
}

// equivalentKinds lists TS 6 kinds that tsgo parses as another kind at the same span. tsgo parses an interface's
// `extends X` element as a TypeReference (parser.go parseTypeHeritageClauseElement), TS 6 as an
// ExpressionWithTypeArguments.
var equivalentKinds = map[string]string{"KindExpressionWithTypeArguments": "KindTypeReference"}

// kindRenames maps tsgo SyntaxKind names to TS 6 names where the same kind is spelled differently.
var kindRenames = map[string]string{"EndOfFile": "EndOfFileToken", "JSDocUnknownTag": "JSDocTag"}

func (s *session) typeFacts(t *checker.Type) map[string]any {
	flags := t.Flags()
	facts := map[string]any{
		"id":          s.typeId(t),
		"flags":       flagNames(uint64(flags), typeFlagNames),
		"objectFlags": objectFlagNames(t),
		"isArray":     s.checker.IsArrayType(t),
		"isTuple":     t.IsTupleType(),
	}
	if name, ok := t.TsoaIntrinsicName(); ok {
		facts["intrinsicName"] = name
	}
	if flags&checker.TypeFlagsBooleanLiteral != 0 {
		facts["intrinsicName"] = fmt.Sprint(t.AsLiteralType().Value())
	} else if flags&(checker.TypeFlagsStringLiteral|checker.TypeFlagsNumberLiteral|checker.TypeFlagsBigIntLiteral) != 0 {
		switch v := t.AsLiteralType().Value().(type) {
		case string:
			facts["value"] = v
		case jsnum.Number:
			facts["value"] = float64(v)
		case jsnum.PseudoBigInt:
			facts["value"] = map[string]any{"negative": v.Negative, "base10Value": core.IfElse(v.Base10Value == "", "0", v.Base10Value)}
		}
	}
	if t.Symbol() != nil {
		facts["symbol"] = s.symbolId(t.Symbol())
	}
	if alias := t.Alias(); alias != nil {
		facts["aliasSymbol"] = s.symbolId(alias.Symbol())
		if args := alias.TypeArguments(); len(args) > 0 {
			facts["aliasTypeArguments"] = s.typeIds_(args)
		}
	}
	if flags&checker.TypeFlagsObject != 0 && t.ObjectFlags()&checker.ObjectFlagsReference != 0 {
		facts["typeArguments"] = s.typeIds_(s.checker.GetTypeArguments(t))
		facts["target"] = s.typeId(t.Target())
	}
	if flags&checker.TypeFlagsUnionOrIntersection != 0 {
		facts["types"] = s.typeIds_(t.Types())
	}
	if origin := t.TsoaOrigin(); origin != nil {
		facts["origin"] = s.typeId(origin)
	}
	if t.IsTupleType() && t.Target() == t {
		elementFlags := [][]string{}
		for _, f := range t.AsTupleType().ElementFlags() {
			elementFlags = append(elementFlags, flagNames(uint64(f), elementFlagNames))
		}
		facts["elementFlags"] = elementFlags
	}
	if flags&(checker.TypeFlagsLiteral|checker.TypeFlagsEnumLiteral) != 0 {
		facts["baseLiteral"] = s.typeId(s.checker.GetBaseTypeOfLiteralType(t))
	}
	return facts
}

func (s *session) typeIds_(types []*checker.Type) []any {
	ids := make([]any, len(types))
	for i, t := range types {
		ids[i] = s.typeId(t)
	}
	return ids
}

func (s *session) symbolFacts(sym *ast.Symbol) map[string]any {
	declarations := []any{}
	for _, d := range sym.Declarations() {
		if r := s.ref(d); r != nil {
			declarations = append(declarations, r)
		}
	}
	facts := map[string]any{
		"id":           s.symbolId(sym),
		"name":         ast.EscapeInternalSymbolName(ast.SymbolName(sym)),
		"escapedName":  ast.EscapeSymbolName(sym.Name()),
		"flags":        flagNames(uint64(sym.Flags()), symbolFlagNames),
		"declarations": declarations,
	}
	if r := s.ref(sym.ValueDeclaration()); r != nil {
		facts["valueDeclaration"] = r
	}
	if sym.Parent() != nil {
		facts["parent"] = s.symbolId(sym.Parent())
	}
	if sym.Flags()&ast.SymbolFlagsAlias != 0 {
		if aliased := s.checker.GetAliasedSymbol(sym); aliased != nil {
			facts["aliased"] = s.symbolId(aliased)
		}
	}
	if origin := s.checker.TsoaSyntheticOrigin(sym); origin != nil {
		facts["syntheticOrigin"] = s.symbolId(origin)
	}
	return facts
}

func (s *session) print(a *args) (any, error) {
	t, err := s.type_(a.Type)
	if err != nil {
		return nil, err
	}
	emitContext := printer.NewEmitContext()
	idToSymbol := map[*ast.IdentifierNode]*ast.Symbol{}
	builder := checker.NewNodeBuilderEx(s.checker, emitContext, idToSymbol)
	typeNode := builder.TypeToTypeNode(t, nil, nodebuilder.FlagsNoTruncation, nodebuilder.InternalFlagsNone, nil)
	if typeNode == nil {
		return nil, nil
	}
	p := printer.NewPrinter(printer.PrinterOptions{RemoveComments: true, NewLine: core.NewLineKindLF}, printer.PrintHandlers{}, emitContext)
	identifiers := []any{}
	var visit func(n *ast.Node) bool
	visit = func(n *ast.Node) bool {
		if ast.IsIdentifier(n) {
			identifiers = append(identifiers, s.symbolId(idToSymbol[n]))
		}
		n.ForEachChild(visit)
		return false
	}
	visit(typeNode)
	return map[string]any{"text": p.Emit(typeNode, nil), "identifiers": identifiers}, nil
}

// prefetchFile answers symbolAtLocation, typeFromTypeNode, symbolOfDeclaration and typeOfSymbol for every node
// of one file (revision 4b). The first node in preorder wins for each pos, end and kind, as in node().
func (s *session) prefetchFile(a *args) (any, error) {
	f, err := s.file(a.File)
	if err != nil {
		return nil, err
	}
	pm := f.GetPositionMap()
	type span struct {
		pos, end int
		kind     ast.Kind
	}
	seen := make(map[span]struct{}, 256)
	symbolAt, typeFrom, declared := []any{}, []any{}, []any{}
	var propertySymbols []*ast.Symbol
	propertySeen := map[*ast.Symbol]bool{}
	noteProperty := func(sym *ast.Symbol) {
		if sym != nil && sym.Flags()&ast.SymbolFlagsProperty != 0 && !propertySeen[sym] {
			propertySeen[sym] = true
			propertySymbols = append(propertySymbols, sym)
		}
	}
	var visit func(n *ast.Node) bool
	visit = func(n *ast.Node) bool {
		key := span{n.Pos(), n.End(), n.Kind}
		if _, dup := seen[key]; !dup {
			seen[key] = struct{}{}
			var kind string
			entry := func(id any) []any {
				if kind == "" {
					kind = strings.TrimPrefix(n.Kind.String(), "Kind")
					if ts6Name, ok := kindRenames[kind]; ok {
						kind = ts6Name
					}
				}
				return []any{pm.UTF8ToUTF16(key.pos), pm.UTF8ToUTF16(key.end), kind, id}
			}
			if ast.IsIdentifier(n) {
				sym := s.checker.GetSymbolAtLocation(n)
				symbolAt = append(symbolAt, entry(s.symbolId(sym)))
				noteProperty(sym)
			}
			if ast.IsTypeNode(n) {
				typeFrom = append(typeFrom, entry(s.typeId(s.checker.GetTypeFromTypeNode(n))))
			}
			if sym := n.Symbol(); sym != nil {
				declared = append(declared, entry(s.symbolId(sym)))
				noteProperty(sym)
			}
		}
		n.ForEachChild(visit)
		return false
	}
	visit(f.AsNode())
	typeOfSymbol := [][2]any{}
	for _, sym := range propertySymbols {
		typeOfSymbol = append(typeOfSymbol, [2]any{s.symbolId(sym), s.typeId(s.checker.GetTypeOfSymbol(sym))})
	}
	return map[string]any{"symbolAt": symbolAt, "typeFrom": typeFrom, "declared": declared, "typeOfSymbol": typeOfSymbol}, nil
}
