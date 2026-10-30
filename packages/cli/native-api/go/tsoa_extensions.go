package api

import (
	"context"
	"fmt"

	"github.com/microsoft/TypeScript/tsc/internal/ast"
	"github.com/microsoft/TypeScript/tsc/internal/json"
	"github.com/microsoft/TypeScript/tsc/internal/nodebuilder"
)

// extensionHandlers are API methods that the compiler does not offer (yet), served by the patched compiler tsoa
// ships. Each answers in one request what the public API needs many requests for, or cannot answer at all.
var extensionHandlers = map[string]func(s *Session, ctx context.Context, params json.Value) (any, error){
	"tsoa/printedSymbols": (*Session).handlePrintedSymbols,
	"tsoa/describe":       (*Session).handleDescribe,
}

// handlePrintedSymbols prints a type as typeToTypeNode does, and returns the symbol each identifier of the printed
// node names, in the order a preorder forEachChild walk visits the identifiers. Classic TypeScript keeps these
// links on printed nodes; the API's printed nodes have none, so names in them cannot be resolved otherwise.
func (s *Session) handlePrintedSymbols(ctx context.Context, params json.Value) (any, error) {
	parsed, err := unmarshalPayload(string(MethodTypeToTypeNode), params)
	if err != nil {
		return nil, fmt.Errorf("%w: %w", ErrInvalidRequest, err)
	}
	p := parsed.(*TypeToTypeNodeParams)
	setup, err := s.setupChecker(ctx, p.Snapshot, p.Project)
	if err != nil {
		return nil, err
	}
	defer setup.done()
	t, err := setup.resolveTypeHandle(p.Type)
	if err != nil {
		return nil, err
	}
	var enclosingDeclaration *ast.Node
	if p.Location != "" {
		if enclosingDeclaration, err = setup.sd.resolveNodeHandle(setup.program, p.Location); err != nil {
			return nil, err
		}
	}
	idToSymbol := map[*ast.IdentifierNode]*ast.Symbol{}
	typeNode := setup.checker.TypeToTypeNode(t, enclosingDeclaration, nodebuilder.Flags(p.Flags), idToSymbol)
	symbols := []*SymbolResponse{}
	var visit func(node *ast.Node) bool
	visit = func(node *ast.Node) bool {
		if ast.IsIdentifier(node) {
			symbols = append(symbols, setup.sd.newSymbolResponse(idToSymbol[node], setup.projectID))
		}
		node.ForEachChild(visit)
		return false
	}
	if typeNode != nil {
		visit(typeNode)
	}
	return symbols, nil
}
