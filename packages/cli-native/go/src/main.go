// Command tsoa-facts answers type and symbol questions about one program over the tsoa facts protocol
// (packages/cli-native/PROTOCOL.md): length-prefixed JSON on stdin and stdout, or on the named pipe given as
// `--pipe <path>`, one checker, one goroutine.
package main

import (
	"bufio"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"reflect"
	"runtime/debug"
	"strings"

	"github.com/microsoft/TypeScript/tsc/internal/ast"
	"github.com/microsoft/TypeScript/tsc/internal/bundled"
	"github.com/microsoft/TypeScript/tsc/internal/checker"
	"github.com/microsoft/TypeScript/tsc/internal/compiler"
	"github.com/microsoft/TypeScript/tsc/internal/core"
	"github.com/microsoft/TypeScript/tsc/internal/ipc"
	"github.com/microsoft/TypeScript/tsc/internal/jsnum"
	"github.com/microsoft/TypeScript/tsc/internal/nodebuilder"
	"github.com/microsoft/TypeScript/tsc/internal/printer"
	"github.com/microsoft/TypeScript/tsc/internal/tsoptions"
	"github.com/microsoft/TypeScript/tsc/internal/tspath"
	"github.com/microsoft/TypeScript/tsc/internal/vfs/osvfs"
)

// protocolRevision is the PROTOCOL.md revision this helper speaks; `open` reports it.
const protocolRevision = 8

// Wire shapes, field for field as in packages/cli/src/metadataGeneration/native/protocol.ts.

type NodeRef struct {
	File int    `json:"file"`
	Pos  int    `json:"pos"`
	End  int    `json:"end"`
	Kind string `json:"kind"`
}

type FileInfo struct {
	ID                int    `json:"id"`
	FileName          string `json:"fileName"`
	IsDeclarationFile bool   `json:"isDeclarationFile"`
	IsDefaultLibrary  bool   `json:"isDefaultLibrary"`
}

type OpenResult struct {
	Protocol      int        `json:"protocol"`
	Files         []FileInfo `json:"files"`
	UndefinedType int        `json:"undefinedType"`
}

// TypeFacts omits absent fields with omitzero, so an empty list that is present (a tuple with no elements) still
// goes out as [].
type TypeFacts struct {
	ID                 int        `json:"id"`
	Flags              []string   `json:"flags"`
	ObjectFlags        []string   `json:"objectFlags"`
	IntrinsicName      string     `json:"intrinsicName,omitzero"`
	Value              any        `json:"value,omitzero"`
	Symbol             *int       `json:"symbol,omitzero"`
	AliasSymbol        *int       `json:"aliasSymbol,omitzero"`
	AliasTypeArguments []int      `json:"aliasTypeArguments,omitzero"`
	TypeArguments      []int      `json:"typeArguments,omitzero"`
	Types              []int      `json:"types,omitzero"`
	Origin             *int       `json:"origin,omitzero"`
	Target             *int       `json:"target,omitzero"`
	ElementFlags       [][]string `json:"elementFlags,omitzero"`
	IsArray            bool       `json:"isArray"`
	IsTuple            bool       `json:"isTuple"`
	BaseLiteral        *int       `json:"baseLiteral,omitzero"`
}

type BigIntValue struct {
	Negative    bool   `json:"negative"`
	Base10Value string `json:"base10Value"`
}

type SymbolFacts struct {
	ID               int       `json:"id"`
	Name             string    `json:"name"`
	EscapedName      string    `json:"escapedName"`
	Flags            []string  `json:"flags"`
	Declarations     []NodeRef `json:"declarations"`
	ValueDeclaration *NodeRef  `json:"valueDeclaration,omitzero"`
	Parent           *int      `json:"parent,omitzero"`
	Aliased          *int      `json:"aliased,omitzero"`
	SyntheticOrigin  *int      `json:"syntheticOrigin,omitzero"`
}

type IndexInfo struct {
	KeyType     int      `json:"keyType"`
	Type        int      `json:"type"`
	IsReadonly  bool     `json:"isReadonly"`
	Declaration *NodeRef `json:"declaration,omitzero"`
}

type Members struct {
	Properties [][2]int    `json:"properties"`
	IndexInfos []IndexInfo `json:"indexInfos"`
}

type CallSignature struct {
	ReturnType int `json:"returnType"`
}

// Entry is one prefetchFile answer; it goes out as [pos, end, kind, id].
type Entry struct {
	Pos, End int
	Kind     string
	ID       *int
}

func (e Entry) MarshalJSON() ([]byte, error) {
	return json.Marshal([]any{e.Pos, e.End, e.Kind, e.ID})
}

type PrefetchResult struct {
	SymbolAt     []Entry  `json:"symbolAt"`
	TypeFrom     []Entry  `json:"typeFrom"`
	Declared     []Entry  `json:"declared"`
	TypeOfSymbol [][2]int `json:"typeOfSymbol"`
}

type PrintResult struct {
	Text        string `json:"text"`
	Identifiers []*int `json:"identifiers"`
}

type InlineFacts struct {
	Types   map[int]TypeFacts   `json:"types,omitempty"`
	Symbols map[int]SymbolFacts `json:"symbols,omitempty"`
}

// Op inputs, one struct per input shape in the protocol's operation table. Every field is required.

type request struct {
	Op      string            `json:"op"`
	Queries []json.RawMessage `json:"queries"`
}

type openInput struct {
	Cwd             string         `json:"cwd"`
	RootFiles       []string       `json:"rootFiles"`
	CompilerOptions map[string]any `json:"compilerOptions"`
}

type fileInput struct {
	File int `json:"file"`
}

type nodeInput struct {
	Node NodeRef `json:"node"`
}

type typeInput struct {
	Type int `json:"type"`
}

type symbolInput struct {
	Symbol int `json:"symbol"`
}

type resolveNameInput struct {
	Name    string   `json:"name"`
	Node    NodeRef  `json:"node"`
	Meaning []string `json:"meaning"`
}

type exportOfInput struct {
	Symbol int    `json:"symbol"`
	Name   string `json:"name"`
}

type propertyInput struct {
	Type int    `json:"type"`
	Name string `json:"name"`
}

type unionInput struct {
	Types []int `json:"types"`
}

type assignableInput struct {
	Source int `json:"source"`
	Target int `json:"target"`
}

// decode parses an op's input, failing with "missing <field>" when the query leaves out a field of In or of a struct
// inside it (a NodeRef's kind, say).
func decode[In any](raw json.RawMessage) (In, error) {
	var in In
	if field := missingField(reflect.TypeFor[In](), raw); field != "" {
		return in, errors.New("missing " + field)
	}
	return in, json.Unmarshal(raw, &in)
}

func missingField(t reflect.Type, raw json.RawMessage) string {
	var present map[string]json.RawMessage
	if json.Unmarshal(raw, &present) != nil {
		return ""
	}
	for i := range t.NumField() {
		field := t.Field(i)
		name := field.Tag.Get("json")
		value, ok := present[name]
		if !ok {
			return name
		}
		if field.Type.Kind() == reflect.Struct {
			if inner := missingField(field.Type, value); inner != "" {
				return inner
			}
		}
	}
	return ""
}

type response struct {
	Ok     bool         `json:"ok"`
	Result any          `json:"result"`
	Error  string       `json:"error,omitempty"`
	Facts  *InlineFacts `json:"facts,omitempty"`
}

type session struct {
	program *compiler.Program
	checker *checker.Checker
	files   []*ast.SourceFile
	fileIds map[*ast.SourceFile]int
	types   *interner[*checker.Type]
	symbols *interner[*ast.Symbol]
	closed  bool
}

// interner assigns protocol ids to checker values: 1-based and stable for the session. intern only assigns;
// handOut also records the id as returned to Node, so the response carries its facts (PROTOCOL.md, inline facts).
type interner[T comparable] struct {
	what      string
	values    []T
	ids       map[T]int
	handedOut []int
	sent      map[int]bool
}

func newInterner[T comparable](what string) *interner[T] {
	return &interner[T]{what: what, ids: map[T]int{}, sent: map[int]bool{}}
}

func (n *interner[T]) intern(v T) int {
	if id, ok := n.ids[v]; ok {
		return id
	}
	n.values = append(n.values, v)
	n.ids[v] = len(n.values)
	return len(n.values)
}

// internOrNil is intern for optional fact fields: a nil type or symbol is absent.
func (n *interner[T]) internOrNil(v T) *int {
	var zero T
	if v == zero {
		return nil
	}
	id := n.intern(v)
	return &id
}

// handOut interns v as part of an op's answer.
func (n *interner[T]) handOut(v T) int {
	id := n.intern(v)
	n.handedOut = append(n.handedOut, id)
	return id
}

// handOutOrNull is handOut for answers that may be null: a nil type or symbol.
func (n *interner[T]) handOutOrNull(v T) *int {
	var zero T
	if v == zero {
		return nil
	}
	id := n.handOut(v)
	return &id
}

func (n *interner[T]) get(id int) (T, error) {
	if id < 1 || id > len(n.values) {
		var zero T
		return zero, fmt.Errorf("unknown %s %d", n.what, id)
	}
	return n.values[id-1], nil
}

// takeUnsent returns the distinct ids handed out since the last call whose facts Node does not have yet.
func (n *interner[T]) takeUnsent() []int {
	var unsent []int
	seen := map[int]bool{}
	for _, id := range n.handedOut {
		if !n.sent[id] && !seen[id] {
			seen[id] = true
			unsent = append(unsent, id)
		}
	}
	n.handedOut = nil
	return unsent
}

func main() {
	debug.SetGCPercent(-1)
	debug.SetMemoryLimit(2 << 30)
	var conn io.ReadWriter = struct {
		io.Reader
		io.Writer
	}{os.Stdin, os.Stdout}
	if len(os.Args) == 3 && os.Args[1] == "--pipe" {
		transport, err := ipc.NewPipeTransport(os.Args[2])
		if err != nil {
			fmt.Fprintln(os.Stderr, "--pipe:", err)
			os.Exit(1)
		}
		defer transport.Close()
		accepted, err := transport.Accept()
		if err != nil {
			fmt.Fprintln(os.Stderr, "--pipe:", err)
			os.Exit(1)
		}
		defer accepted.Close()
		conn = accepted
	}
	in := bufio.NewReader(conn)
	out := bufio.NewWriter(conn)
	s := &session{types: newInterner[*checker.Type]("type"), symbols: newInterner[*ast.Symbol]("symbol")}
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
	facts := InlineFacts{Types: map[int]TypeFacts{}, Symbols: map[int]SymbolFacts{}}
	r := s.serveRequest(body, &facts)
	if len(facts.Types) > 0 || len(facts.Symbols) > 0 {
		r.Facts = &facts
	}
	return r
}

// addFacts adds the facts of the ids the last op handed out and Node does not have yet.
func (s *session) addFacts(facts *InlineFacts) {
	for _, id := range s.types.takeUnsent() {
		facts.Types[id] = s.typeFacts(s.types.values[id-1])
		s.types.sent[id] = true
	}
	for _, id := range s.symbols.takeUnsent() {
		facts.Symbols[id] = s.symbolFacts(s.symbols.values[id-1])
		s.symbols.sent[id] = true
	}
}

func (s *session) serveRequest(body []byte, facts *InlineFacts) response {
	var r request
	if err := json.Unmarshal(body, &r); err != nil {
		return response{Error: "invalid request: " + err.Error()}
	}
	if r.Op != "batch" {
		return s.query(r.Op, body, facts)
	}
	results := make([]response, len(r.Queries))
	for i, raw := range r.Queries {
		var q request
		if err := json.Unmarshal(raw, &q); err != nil {
			results[i] = response{Error: "invalid query: " + err.Error()}
			continue
		}
		results[i] = s.query(q.Op, raw, facts)
	}
	return response{Ok: true, Result: results}
}

// query answers one op. The facts it adds are computed under the same recover, so a panic in either fails the query.
func (s *session) query(op string, raw json.RawMessage, facts *InlineFacts) (r response) {
	defer func() {
		if p := recover(); p != nil {
			s.types.handedOut, s.symbols.handedOut = nil, nil
			r = response{Error: fmt.Sprintf("%s: panic: %v\n%s", op, p, debug.Stack())}
		}
	}()
	handler, ok := handlers[op]
	if !ok {
		return response{Error: op + ": unknown op"}
	}
	if op != "open" && op != "close" && s.checker == nil {
		return response{Error: op + ": no program is open"}
	}
	result, err := handler(s, raw)
	s.addFacts(facts)
	if err != nil {
		return response{Error: op + ": " + err.Error()}
	}
	return response{Ok: true, Result: result}
}

type handler func(s *session, raw json.RawMessage) (any, error)

// withInput, onNode, onType and onSymbol decode an op's input and resolve its ids before the op runs.
func withInput[In any](answer func(s *session, in In) (any, error)) handler {
	return func(s *session, raw json.RawMessage) (any, error) {
		in, err := decode[In](raw)
		if err != nil {
			return nil, err
		}
		return answer(s, in)
	}
}

func onNode(answer func(s *session, n *ast.Node) any) handler {
	return withInput(func(s *session, in nodeInput) (any, error) {
		n, err := s.node(in.Node)
		if err != nil {
			return nil, err
		}
		return answer(s, n), nil
	})
}

func onType(answer func(s *session, t *checker.Type) any) handler {
	return withInput(func(s *session, in typeInput) (any, error) {
		t, err := s.types.get(in.Type)
		if err != nil {
			return nil, err
		}
		return answer(s, t), nil
	})
}

func onSymbol(answer func(s *session, sym *ast.Symbol) any) handler {
	return withInput(func(s *session, in symbolInput) (any, error) {
		sym, err := s.symbols.get(in.Symbol)
		if err != nil {
			return nil, err
		}
		return answer(s, sym), nil
	})
}

var handlers = map[string]handler{
	"open":  withInput((*session).open),
	"close": func(s *session, raw json.RawMessage) (any, error) { s.closed = true; return nil, nil },
	"fileText": withInput(func(s *session, in fileInput) (any, error) {
		f, err := s.file(in.File)
		if err != nil {
			return nil, err
		}
		return f.Text(), nil
	}),
	"prefetchFile": withInput(func(s *session, in fileInput) (any, error) {
		f, err := s.file(in.File)
		if err != nil {
			return nil, err
		}
		return s.prefetchFile(f), nil
	}),
	"typeAtLocation": onNode(func(s *session, n *ast.Node) any {
		return s.types.handOutOrNull(s.checker.GetTypeAtLocation(n))
	}),
	"typeFromTypeNode": onNode(func(s *session, n *ast.Node) any {
		return s.types.handOutOrNull(s.checker.GetTypeFromTypeNode(n))
	}),
	"symbolAtLocation": onNode(func(s *session, n *ast.Node) any {
		return s.symbols.handOutOrNull(s.checker.GetSymbolAtLocation(n))
	}),
	"symbolOfDeclaration": onNode(func(s *session, n *ast.Node) any {
		return s.symbols.handOutOrNull(n.Symbol())
	}),
	"returnTypeOfDeclaration": onNode(func(s *session, n *ast.Node) any {
		if !ast.IsFunctionLike(n) {
			return nil
		}
		sig := s.checker.GetSignatureFromDeclaration(n)
		if sig == nil {
			return nil
		}
		return s.types.handOutOrNull(s.checker.GetReturnTypeOfSignature(sig))
	}),
	"constantValue": onNode(func(s *session, n *ast.Node) any {
		switch v := s.checker.GetConstantValue(n).(type) {
		case string:
			return v
		case jsnum.Number:
			return float64(v)
		}
		return nil
	}),
	"resolveName": withInput(func(s *session, in resolveNameInput) (any, error) {
		location, err := s.node(in.Node)
		if err != nil {
			return nil, err
		}
		var meaning ast.SymbolFlags
		for _, name := range in.Meaning {
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
		return s.symbols.handOutOrNull(s.checker.ResolveName(in.Name, location, meaning, false)), nil
	}),
	"type": withInput(func(s *session, in typeInput) (any, error) {
		t, err := s.types.get(in.Type)
		if err != nil {
			return nil, err
		}
		s.types.sent[in.Type] = true
		return s.typeFacts(t), nil
	}),
	"symbol": withInput(func(s *session, in symbolInput) (any, error) {
		sym, err := s.symbols.get(in.Symbol)
		if err != nil {
			return nil, err
		}
		s.symbols.sent[in.Symbol] = true
		return s.symbolFacts(sym), nil
	}),
	"typeOfSymbol": onSymbol(func(s *session, sym *ast.Symbol) any {
		return s.types.handOutOrNull(s.checker.GetTypeOfSymbol(sym))
	}),
	"exportOf": withInput(func(s *session, in exportOfInput) (any, error) {
		sym, err := s.symbols.get(in.Symbol)
		if err != nil {
			return nil, err
		}
		return s.symbols.handOutOrNull(sym.Exports()[in.Name]), nil
	}),
	"members": onType(func(s *session, t *checker.Type) any {
		properties := [][2]int{}
		for _, p := range s.checker.GetPropertiesOfType(t) {
			properties = append(properties, [2]int{s.symbols.handOut(p), s.types.handOut(s.checker.GetTypeOfSymbol(p))})
		}
		return Members{Properties: properties, IndexInfos: s.indexInfos(t)}
	}),
	"property": withInput(func(s *session, in propertyInput) (any, error) {
		t, err := s.types.get(in.Type)
		if err != nil {
			return nil, err
		}
		return s.symbols.handOutOrNull(s.checker.GetPropertyOfType(t, in.Name)), nil
	}),
	"callSignatures": onType(func(s *session, t *checker.Type) any {
		sigs := []CallSignature{}
		for _, sig := range s.checker.GetSignaturesOfType(t, checker.SignatureKindCall) {
			sigs = append(sigs, CallSignature{ReturnType: s.types.handOut(s.checker.GetReturnTypeOfSignature(sig))})
		}
		return sigs
	}),
	"nonNullable": onType(func(s *session, t *checker.Type) any {
		return s.types.handOutOrNull(s.checker.GetNonNullableType(t))
	}),
	"union": withInput(func(s *session, in unionInput) (any, error) {
		types := make([]*checker.Type, len(in.Types))
		for i, id := range in.Types {
			t, err := s.types.get(id)
			if err != nil {
				return nil, err
			}
			types[i] = t
		}
		return s.types.handOutOrNull(s.checker.GetUnionType(types)), nil
	}),
	"assignable": withInput(func(s *session, in assignableInput) (any, error) {
		source, err := s.types.get(in.Source)
		if err != nil {
			return nil, err
		}
		target, err := s.types.get(in.Target)
		if err != nil {
			return nil, err
		}
		return s.checker.IsTypeAssignableTo(source, target), nil
	}),
	"typeToString": onType(func(s *session, t *checker.Type) any {
		return s.checker.TypeToString(t)
	}),
	"print": onType(func(s *session, t *checker.Type) any {
		return s.print(t)
	}),
}

func (s *session) indexInfos(t *checker.Type) []IndexInfo {
	infos := []IndexInfo{}
	for _, info := range s.checker.GetIndexInfosOfType(t) {
		infos = append(infos, IndexInfo{
			KeyType:     s.types.handOut(info.KeyType()),
			Type:        s.types.handOut(info.ValueType()),
			IsReadonly:  info.IsReadonly(),
			Declaration: s.ref(info.Declaration()),
		})
	}
	return infos
}

func (s *session) open(a openInput) (any, error) {
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
	infos := []FileInfo{}
	for _, f := range s.program.GetSourceFiles() {
		s.files = append(s.files, f)
		id := len(s.files)
		s.fileIds[f] = id
		infos = append(infos, FileInfo{
			ID:                id,
			FileName:          string(f.FileName()),
			IsDeclarationFile: f.IsDeclarationFile,
			IsDefaultLibrary:  s.program.IsSourceFileDefaultLibrary(f.PathKey()),
		})
	}
	return OpenResult{Protocol: protocolRevision, Files: infos, UndefinedType: s.types.handOut(s.checker.GetUndefinedType())}, nil
}

func (s *session) file(id int) (*ast.SourceFile, error) {
	if id < 1 || id > len(s.files) {
		return nil, fmt.Errorf("unknown file %d", id)
	}
	return s.files[id-1], nil
}

// node resolves a NodeRef: the first node in preorder with the ref's kind and UTF-16 full range.
func (s *session) node(ref NodeRef) (*ast.Node, error) {
	f, err := s.file(ref.File)
	if err != nil {
		return nil, err
	}
	pm := f.GetPositionMap()
	kind, known := kindsByName[ref.Kind]
	pos, end := pm.UTF16ToUTF8(ref.Pos), pm.UTF16ToUTF8(ref.End)
	var found *ast.Node
	var visit func(n *ast.Node) bool
	visit = func(n *ast.Node) bool {
		if n.Pos() > pos || n.End() < end {
			return false
		}
		if n.Pos() == pos && n.End() == end && (n.Kind == kind || kind == ast.KindExpressionWithTypeArguments && n.Kind == ast.KindTypeReference) {
			found = n
			return true
		}
		return n.ForEachChild(visit)
	}
	if known {
		visit(f.AsNode())
	}
	if found == nil {
		return nil, fmt.Errorf("no %s at %d..%d in %s", ref.Kind, ref.Pos, ref.End, f.FileName())
	}
	return found, nil
}

func (s *session) ref(n *ast.Node) *NodeRef {
	if n == nil {
		return nil
	}
	f := ast.GetSourceFileOfNode(n)
	id, ok := s.fileIds[f]
	if !ok {
		return nil
	}
	pm := f.GetPositionMap()
	return &NodeRef{File: id, Pos: pm.UTF8ToUTF16(n.Pos()), End: pm.UTF8ToUTF16(n.End()), Kind: kindName(n)}
}

func (s *session) typeFacts(t *checker.Type) TypeFacts {
	flags := t.Flags()
	facts := TypeFacts{
		ID:          s.types.intern(t),
		Flags:       flagNames(uint64(flags), typeFlagNames),
		ObjectFlags: objectFlagNames(t),
		IsArray:     s.checker.IsArrayType(t),
		IsTuple:     t.IsTupleType(),
	}
	if name, ok := t.TsoaIntrinsicName(); ok {
		facts.IntrinsicName = name
	}
	if flags&checker.TypeFlagsBooleanLiteral != 0 {
		facts.IntrinsicName = fmt.Sprint(t.AsLiteralType().Value())
	} else if flags&(checker.TypeFlagsStringLiteral|checker.TypeFlagsNumberLiteral|checker.TypeFlagsBigIntLiteral) != 0 {
		switch v := t.AsLiteralType().Value().(type) {
		case string:
			facts.Value = v
		case jsnum.Number:
			facts.Value = float64(v)
		case jsnum.PseudoBigInt:
			facts.Value = BigIntValue{Negative: v.Negative, Base10Value: core.IfElse(v.Base10Value == "", "0", v.Base10Value)}
		}
	}
	facts.Symbol = s.symbols.internOrNil(t.Symbol())
	if alias := t.Alias(); alias != nil {
		facts.AliasSymbol = s.symbols.internOrNil(alias.Symbol())
		if args := alias.TypeArguments(); len(args) > 0 {
			facts.AliasTypeArguments = s.internTypes(args)
		}
	}
	if flags&checker.TypeFlagsObject != 0 && t.ObjectFlags()&checker.ObjectFlagsReference != 0 {
		facts.TypeArguments = s.internTypes(s.checker.GetTypeArguments(t))
		facts.Target = s.types.internOrNil(t.Target())
	}
	if flags&checker.TypeFlagsUnionOrIntersection != 0 {
		facts.Types = s.internTypes(t.Types())
	}
	facts.Origin = s.types.internOrNil(t.TsoaOrigin())
	if t.IsTupleType() && t.Target() == t {
		facts.ElementFlags = [][]string{}
		for _, f := range t.AsTupleType().ElementFlags() {
			facts.ElementFlags = append(facts.ElementFlags, flagNames(uint64(f), elementFlagNames))
		}
	}
	if flags&(checker.TypeFlagsLiteral|checker.TypeFlagsEnumLiteral) != 0 {
		facts.BaseLiteral = s.types.internOrNil(s.checker.GetBaseTypeOfLiteralType(t))
	}
	return facts
}

func (s *session) internTypes(types []*checker.Type) []int {
	ids := make([]int, len(types))
	for i, t := range types {
		ids[i] = s.types.intern(t)
	}
	return ids
}

func (s *session) symbolFacts(sym *ast.Symbol) SymbolFacts {
	declarations := []NodeRef{}
	for _, d := range sym.Declarations() {
		if r := s.ref(d); r != nil {
			declarations = append(declarations, *r)
		}
	}
	facts := SymbolFacts{
		ID:               s.symbols.intern(sym),
		Name:             ast.EscapeInternalSymbolName(ast.SymbolName(sym)),
		EscapedName:      ast.EscapeSymbolName(sym.Name()),
		Flags:            flagNames(uint64(sym.Flags()), symbolFlagNames),
		Declarations:     declarations,
		ValueDeclaration: s.ref(sym.ValueDeclaration()),
		Parent:           s.symbols.internOrNil(sym.Parent()),
		SyntheticOrigin:  s.symbols.internOrNil(s.checker.TsoaSyntheticOrigin(sym)),
	}
	if sym.Flags()&ast.SymbolFlagsAlias != 0 {
		facts.Aliased = s.symbols.internOrNil(s.checker.GetAliasedSymbol(sym))
	}
	return facts
}

func (s *session) print(t *checker.Type) *PrintResult {
	emitContext := printer.NewEmitContext()
	idToSymbol := map[*ast.IdentifierNode]*ast.Symbol{}
	builder := checker.NewNodeBuilderEx(s.checker, emitContext, idToSymbol)
	typeNode := builder.TypeToTypeNode(t, nil, nodebuilder.FlagsNoTruncation, nodebuilder.InternalFlagsNone, nil)
	if typeNode == nil {
		return nil
	}
	p := printer.NewPrinter(printer.PrinterOptions{RemoveComments: true, NewLine: core.NewLineKindLF}, printer.PrintHandlers{}, emitContext)
	identifiers := []*int{}
	var visit func(n *ast.Node) bool
	visit = func(n *ast.Node) bool {
		if ast.IsIdentifier(n) {
			identifiers = append(identifiers, s.symbols.handOutOrNull(idToSymbol[n]))
		}
		n.ForEachChild(visit)
		return false
	}
	visit(typeNode)
	return &PrintResult{Text: p.Emit(typeNode, nil), Identifiers: identifiers}
}

// prefetchFile answers symbolAtLocation, typeFromTypeNode, symbolOfDeclaration and typeOfSymbol for every node
// of one file (revision 4b). The first node in preorder wins for each pos, end and kind, as in node().
func (s *session) prefetchFile(f *ast.SourceFile) PrefetchResult {
	pm := f.GetPositionMap()
	type span struct {
		pos, end int
		kind     ast.Kind
	}
	seen := make(map[span]struct{}, 256)
	result := PrefetchResult{SymbolAt: []Entry{}, TypeFrom: []Entry{}, Declared: []Entry{}, TypeOfSymbol: [][2]int{}}
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
			entry := func(id *int) Entry {
				return Entry{pm.UTF8ToUTF16(key.pos), pm.UTF8ToUTF16(key.end), kindName(n), id}
			}
			if ast.IsIdentifier(n) {
				sym := s.checker.GetSymbolAtLocation(n)
				result.SymbolAt = append(result.SymbolAt, entry(s.symbols.handOutOrNull(sym)))
				noteProperty(sym)
			}
			if ast.IsTypeNode(n) {
				result.TypeFrom = append(result.TypeFrom, entry(s.types.handOutOrNull(s.checker.GetTypeFromTypeNode(n))))
			}
			if sym := n.Symbol(); sym != nil {
				result.Declared = append(result.Declared, entry(s.symbols.handOutOrNull(sym)))
				noteProperty(sym)
			}
		}
		n.ForEachChild(visit)
		return false
	}
	visit(f.AsNode())
	for _, sym := range propertySymbols {
		result.TypeOfSymbol = append(result.TypeOfSymbol, [2]int{s.symbols.handOut(sym), s.types.handOut(s.checker.GetTypeOfSymbol(sym))})
	}
	return result
}
