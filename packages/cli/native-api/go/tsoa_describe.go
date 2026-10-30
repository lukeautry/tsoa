package api

import (
	"context"
	"fmt"

	"github.com/microsoft/TypeScript/tsc/internal/ast"
	"github.com/microsoft/TypeScript/tsc/internal/checker"
	"github.com/microsoft/TypeScript/tsc/internal/compiler"
	"github.com/microsoft/TypeScript/tsc/internal/json"
	"github.com/microsoft/TypeScript/tsc/internal/ls"
	"github.com/microsoft/TypeScript/tsc/internal/project"
)

// DescribeParams names the program to describe.
type DescribeParams struct {
	Snapshot SnapshotID `json:"snapshot"`
	Project  project.ID `json:"project"`
}

// describedType is a type as plain data. References to other types and symbols are their index in the
// response's lists plus one; zero is none. R is the API's own response, for the client to create its usual
// objects from when it needs to ask more.
type describedType struct {
	R         *TypeResponse    `json:"r"`
	Symbol    int              `json:"symbol,omitempty"`
	Alias     int              `json:"alias,omitempty"`
	AliasArgs []int            `json:"aliasArgs,omitempty"`
	Types     []int            `json:"types,omitempty"`
	Args      []int            `json:"args,omitempty"`
	Array     bool             `json:"array,omitempty"`
	Tuple     bool             `json:"tuple,omitempty"`
	Props     []int            `json:"props"`
	Index     []describedIndex `json:"index,omitempty"`
	Intrinsic string           `json:"intrinsic,omitempty"`
}

type describedIndex struct {
	Key      int  `json:"key"`
	Value    int  `json:"value"`
	Readonly bool `json:"readonly,omitempty"`
}

type describedSymbol struct {
	R       *SymbolResponse `json:"r"`
	Doc     string          `json:"doc"`
	Type    int             `json:"type,omitempty"`
	Aliased int             `json:"aliased,omitempty"`
}

type describeResponse struct {
	Types       []*describedType   `json:"types"`
	Symbols     []*describedSymbol `json:"symbols"`
	NodeSymbols map[NodeHandle]int `json:"nodeSymbols"`
	NodeTypes   map[NodeHandle]int `json:"nodeTypes"`
	// LocationTypes are getTypeAtLocation's answers for parameters, heritage clauses and type nodes;
	// ReturnTypes the return types of the signatures of method and function declarations.
	LocationTypes map[NodeHandle]int `json:"locationTypes"`
	ReturnTypes   map[NodeHandle]int `json:"returnTypes"`
	Constants   map[NodeHandle]any `json:"constants"`
}

// handleDescribe answers in one response what a type resolver asks the checker about a program's own files: the
// symbol of every name, the type of every type node, and every type and symbol reachable from them, as plain
// data. Members of library interfaces and classes (Array, Promise, Date, ...) are left out.
func (s *Session) handleDescribe(ctx context.Context, raw json.Value) (any, error) {
	var params DescribeParams
	if err := json.Unmarshal(raw, &params); err != nil {
		return nil, fmt.Errorf("%w: %w", ErrInvalidRequest, err)
	}
	setup, err := s.setupChecker(ctx, params.Snapshot, params.Project)
	if err != nil {
		return nil, err
	}
	defer setup.done()
	d := &describer{
		setup:    setup,
		c:        setup.checker,
		program:  setup.program,
		types:    map[*checker.Type]int{},
		symbols:  map[*ast.Symbol]int{},
		response: &describeResponse{NodeSymbols: map[NodeHandle]int{}, NodeTypes: map[NodeHandle]int{}, LocationTypes: map[NodeHandle]int{}, ReturnTypes: map[NodeHandle]int{}, Constants: map[NodeHandle]any{}},
	}
	for _, file := range d.program.GetSourceFiles() {
		if file.IsDeclarationFile {
			continue
		}
		d.visit(file.AsNode())
	}
	// Types and symbols are described as they are reached, until nothing new is.
	for d.nextType < len(d.typeQueue) || d.nextSymbol < len(d.symbolQueue) {
		for ; d.nextType < len(d.typeQueue); d.nextType++ {
			d.describeType(d.typeQueue[d.nextType])
		}
		for ; d.nextSymbol < len(d.symbolQueue); d.nextSymbol++ {
			d.describeSymbol(d.symbolQueue[d.nextSymbol])
		}
	}
	return d.response, nil
}

type describer struct {
	setup       checkerSetup
	c           *checker.Checker
	program     *compiler.Program
	types       map[*checker.Type]int
	symbols     map[*ast.Symbol]int
	typeQueue   []*checker.Type
	symbolQueue []*ast.Symbol
	nextType    int
	nextSymbol  int
	response    *describeResponse
}

func (d *describer) visit(node *ast.Node) {
	switch {
	case ast.IsIdentifier(node) || ast.IsQualifiedName(node) || ast.IsPropertyAccessExpression(node):
		if symbol := d.symbolAtLocation(node); symbol != nil {
			d.response.NodeSymbols[d.setup.sd.nodeHandleFrom(node)] = d.symbol(symbol)
		}
	case ast.IsEnumMember(node):
		if value := d.c.GetConstantValue(node); value != nil {
			d.response.Constants[d.setup.sd.nodeHandleFrom(node)] = value
		}
	}
	if ast.IsTypeNode(node) {
		if t := d.typeFromTypeNode(node); t != nil {
			d.response.NodeTypes[d.setup.sd.nodeHandleFrom(node)] = d.typ(t)
		}
	}
	if ast.IsTypeNode(node) || ast.IsParameterDeclaration(node) || ast.IsExpressionWithTypeArguments(node) {
		if t := d.typeAtLocation(node); t != nil {
			d.response.LocationTypes[d.setup.sd.nodeHandleFrom(node)] = d.typ(t)
		}
	}
	if ast.IsMethodDeclaration(node) || ast.IsFunctionDeclaration(node) {
		if t := d.returnType(node); t != nil {
			d.response.ReturnTypes[d.setup.sd.nodeHandleFrom(node)] = d.typ(t)
		}
	}
	node.ForEachChild(func(child *ast.Node) bool {
		d.visit(child)
		return false
	})
}

// A node the checker cannot answer for is left to the client to ask about.
func (d *describer) symbolAtLocation(node *ast.Node) (symbol *ast.Symbol) {
	defer func() { _ = recover() }()
	return d.c.GetSymbolAtLocation(node)
}

func (d *describer) typeFromTypeNode(node *ast.Node) (t *checker.Type) {
	defer func() { _ = recover() }()
	return d.c.GetTypeFromTypeNode(node)
}

func (d *describer) typeAtLocation(node *ast.Node) (t *checker.Type) {
	defer func() { _ = recover() }()
	return d.c.GetTypeAtLocation(node)
}

func (d *describer) returnType(node *ast.Node) (t *checker.Type) {
	defer func() { _ = recover() }()
	if signature := d.c.GetSignatureFromDeclaration(node); signature != nil {
		return d.c.GetReturnTypeOfSignature(signature)
	}
	return nil
}

// typ is the reference to a type in the response, queueing it to be described.
func (d *describer) typ(t *checker.Type) int {
	if t == nil {
		return 0
	}
	if index, ok := d.types[t]; ok {
		return index
	}
	d.typeQueue = append(d.typeQueue, t)
	d.response.Types = append(d.response.Types, nil)
	d.types[t] = len(d.response.Types)
	return d.types[t]
}

func (d *describer) symbol(symbol *ast.Symbol) int {
	if symbol == nil {
		return 0
	}
	if index, ok := d.symbols[symbol]; ok {
		return index
	}
	d.symbolQueue = append(d.symbolQueue, symbol)
	d.response.Symbols = append(d.response.Symbols, nil)
	d.symbols[symbol] = len(d.response.Symbols)
	return d.symbols[symbol]
}

func (d *describer) types_(types []*checker.Type) []int {
	if len(types) == 0 {
		return nil
	}
	refs := make([]int, len(types))
	for i, t := range types {
		refs[i] = d.typ(t)
	}
	return refs
}

func (d *describer) describeType(t *checker.Type) {
	described := &describedType{R: d.setup.sd.newTypeResponse(d.setup.projectID, t, d.c), Symbol: d.symbol(t.Symbol())}
	if alias := t.Alias(); alias != nil {
		described.Alias = d.symbol(alias.Symbol())
		described.AliasArgs = d.types_(alias.TypeArguments())
	}
	if t.Flags()&checker.TypeFlagsUnionOrIntersection != 0 {
		described.Types = d.types_(t.Types())
	}
	if t.Flags()&checker.TypeFlagsIntrinsic != 0 {
		described.Intrinsic = t.AsIntrinsicType().IntrinsicName()
	}
	if t.Flags()&checker.TypeFlagsObject != 0 {
		described.Array = d.c.IsArrayType(t)
		described.Tuple = checker.IsTupleType(t)
		if t.ObjectFlags()&checker.ObjectFlagsReference != 0 {
			described.Args = d.types_(d.c.GetTypeArguments(t))
		}
	}
	if t.Flags()&(checker.TypeFlagsObject|checker.TypeFlagsIntersection) != 0 && !d.isLibraryInterface(t) {
		described.Props = []int{}
		for _, property := range d.c.GetPropertiesOfType(t) {
			described.Props = append(described.Props, d.symbol(property))
		}
		for _, info := range d.c.GetIndexInfosOfType(t) {
			described.Index = append(described.Index, describedIndex{Key: d.typ(info.KeyType()), Value: d.typ(info.ValueType()), Readonly: info.IsReadonly()})
		}
	}
	d.response.Types[d.types[t]-1] = described
}

// isLibraryInterface reports whether a type is an interface or class of TypeScript's own library, or a
// reference to one: Array, Promise, Date and the like, with many members tsoa never asks about. Packages such
// as @types/node augment some of them, so one declaration in a library file decides.
func (d *describer) isLibraryInterface(t *checker.Type) bool {
	if t.ObjectFlags()&(checker.ObjectFlagsClassOrInterface|checker.ObjectFlagsReference) == 0 || t.Symbol() == nil {
		return false
	}
	for _, declaration := range t.Symbol().Declarations() {
		if d.program.IsSourceFileDefaultLibrary(ast.GetSourceFileOfNode(declaration).PathKey()) {
			return true
		}
	}
	return false
}

func (d *describer) describeSymbol(symbol *ast.Symbol) {
	described := &describedSymbol{R: d.setup.sd.newSymbolResponse(symbol, d.setup.projectID), Doc: ls.GetSymbolDocumentationComment(d.c, symbol)}
	if symbol.Flags()&(ast.SymbolFlagsProperty|ast.SymbolFlagsEnumMember) != 0 {
		described.Type = d.typ(d.c.GetTypeOfSymbol(symbol))
	}
	if symbol.Flags()&ast.SymbolFlagsAlias != 0 {
		described.Aliased = d.symbol(d.c.GetAliasedSymbol(symbol))
	}
	d.response.Symbols[d.symbols[symbol]-1] = described
}
