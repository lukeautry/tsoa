package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/microsoft/TypeScript/tsc/internal/ast"
	"github.com/microsoft/TypeScript/tsc/internal/printer"
	"github.com/microsoft/TypeScript/tsc/internal/scanner"
)

// isSynthetic reports whether a node was printed by the checker rather than parsed from a source file. Printed
// nodes can carry the position of the node they were made from, but they are not part of a source file.
func isSynthetic(node *ast.Node) bool {
	if ast.NodeIsSynthesized(node) {
		return true
	}
	sourceFile := ast.GetSourceFileOfNode(node)
	if sourceFile == nil {
		return true
	}
	text := sourceFile.Text()
	if node.End() > len(text) {
		return true
	}
	// A JSDoc node is a comment, which skipping trivia would skip.
	return !ast.IsJSDocKind(node.Kind) && scanner.SkipTrivia(text, node.Pos()) > node.End()
}

// Printers keep state while they print, so each goroutine takes one of its own.
var textPrinters = sync.Pool{New: func() any {
	return printer.NewPrinter(printer.PrinterOptions{RemoveComments: true}, printer.PrintHandlers{}, nil)
}}

// printText prints a node.
func printText(node *ast.Node) string {
	p := textPrinters.Get().(*printer.Printer)
	defer textPrinters.Put(p)
	return p.Emit(node, nil)
}

// nodeText is the source text of a node, or its printed form for a node printed by the checker.
func nodeText(node *ast.Node) string {
	if isSynthetic(node) {
		return printText(node)
	}
	if ast.IsJSDocKind(node.Kind) {
		return ast.GetSourceFileOfNode(node).Text()[node.Pos():node.End()]
	}
	return scanner.GetTextOfNode(node)
}

// ---- errors (exceptions.ts) ----

func metadataErrorMessage(message string, node *ast.Node, onlyCurrent bool) string {
	if node == nil {
		return message
	}
	return fmt.Sprintf("%s\n%s\n%s", message, prettyLocationOfNode(node), prettyTroubleCause(node, onlyCurrent))
}

func warningMessage(message string, node *ast.Node) string {
	return fmt.Sprintf("Warning: %s\n%s\n%s", message, prettyLocationOfNode(node), prettyTroubleCause(node, false))
}

func prettyLocationOfNode(node *ast.Node) string {
	// Nodes printed by the checker are located by the closest node written in source.
	for node != nil && isSynthetic(node) {
		node = node.Parent
	}
	if node == nil {
		return "At unknown position..."
	}
	sourceFile := ast.GetSourceFileOfNode(node)
	if sourceFile == nil {
		return "At unknown position..."
	}
	tokenPos := scanner.GetTokenPosOfNode(node, sourceFile, false)
	token := scanner.GetRangeOfTokenAtPosition(sourceFile, tokenPos)
	start := scanner.GetECMALineOfPosition(sourceFile, token.Pos()) + 1
	end := scanner.GetECMALineOfPosition(sourceFile, token.End()) + 1
	fileName := string(sourceFile.FileName())
	// Files below the working directory are shown relative to it.
	if cwd, err := os.Getwd(); err == nil {
		if relative, err := filepath.Rel(cwd, fileName); err == nil && !strings.HasPrefix(relative, "..") && !filepath.IsAbs(relative) {
			fileName = relative
		}
	}
	return fmt.Sprintf("At: %s.", filepath.Clean(fmt.Sprintf("%s:%d:%d", fileName, start, end)))
}

func prettyTroubleCause(node *ast.Node, onlyCurrent bool) string {
	cause := node
	if !onlyCurrent && node.Parent != nil {
		cause = node.Parent
	}
	name := "<unknown name>"
	if !isSynthetic(cause) && cause.Parent != nil {
		name = nodeText(cause)
	} else if declarationName := cause.Name(); declarationName != nil && (ast.IsIdentifier(declarationName) || ast.IsStringLiteral(declarationName)) {
		name = declarationName.Text()
	}
	return fmt.Sprintf("This was caused by '%s'", name)
}

// ---- JSDoc (jsDocUtils.ts) ----

func jsDocs(node *ast.Node) []*ast.Node {
	return node.JSDoc(nil)
}

func commentToString(comment *ast.NodeList) (string, bool) {
	if comment == nil {
		return "", false
	}
	parts := make([]string, len(comment.Nodes))
	for i, part := range comment.Nodes {
		parts[i] = part.Text()
	}
	return strings.Join(parts, " "), true
}

func getJSDocDescription(node *ast.Node) (string, bool) {
	docs := jsDocs(node)
	if len(docs) == 0 {
		return "", false
	}
	text, ok := commentToString(docs[0].AsJSDoc().Comment)
	if !ok || text == "" {
		return "", false
	}
	return text, true
}

func tagComment(tag *ast.Node) *ast.NodeList {
	return tag.CommentList()
}

// getJSDocTags lists the tags of the first JSDoc block of a node that match.
func getJSDocTags(node *ast.Node, isMatching func(tag *ast.Node) bool) []*ast.Node {
	docs := jsDocs(node)
	if len(docs) == 0 {
		return nil
	}
	tags := docs[0].AsJSDoc().Tags
	if tags == nil {
		return nil
	}
	var out []*ast.Node
	for _, tag := range tags.Nodes {
		if isMatching(tag) {
			out = append(out, tag)
		}
	}
	return out
}

func tagName(tag *ast.Node) string {
	return tag.TagName().Text()
}

func isExistJSDocTag(node *ast.Node, isMatching func(tag *ast.Node) bool) bool {
	return len(getJSDocTags(node, isMatching)) > 0
}

func hasJSDocTag(node *ast.Node, name string) bool {
	return isExistJSDocTag(node, func(tag *ast.Node) bool { return tagName(tag) == name })
}

func getJSDocComments(node *ast.Node, name string) ([]string, bool) {
	tags := getJSDocTags(node, func(tag *ast.Node) bool { return tagName(tag) == name })
	if len(tags) == 0 {
		return nil, false
	}
	comments := []string{}
	for _, tag := range tags {
		if comment, ok := commentToString(tagComment(tag)); ok && comment != "" {
			comments = append(comments, comment)
		}
	}
	return comments, true
}

func getJSDocComment(node *ast.Node, name string) (string, bool) {
	comments, _ := getJSDocComments(node, name)
	if len(comments) == 0 {
		return "", false
	}
	return comments[0], true
}

func getJSDocTagNames(node *ast.Node, requireTagName bool) []string {
	var tags []*ast.Node
	if node.Kind == ast.KindParameter {
		parameterName := node.Name().Text()
		tags = getJSDocTags(node.Parent, func(tag *ast.Node) bool {
			if ast.IsJSDocParameterTag(tag) {
				return false
			}
			comment, ok := commentToString(tagComment(tag))
			if !ok && !ast.IsJSDocReturnTag(tag) {
				panic(&MetadataError{Message: fmt.Sprintf("Orphan tag: @%s should have a parameter name follows with.", tagName(tag))})
			}
			return ok && strings.HasPrefix(comment, parameterName)
		})
	} else {
		tags = getJSDocTags(node, func(tag *ast.Node) bool {
			if requireTagName {
				return tagComment(tag) != nil
			}
			return true
		})
	}
	names := make([]string, len(tags))
	for i, tag := range tags {
		names[i] = tagName(tag)
	}
	return names
}

func containsString(values []string, value string) bool {
	for _, v := range values {
		if v == value {
			return true
		}
	}
	return false
}

// safeFromJSON parses JSON, or gives nothing for text that is not JSON.
func safeFromJSON(text string) (any, bool) {
	var value any
	if err := json.Unmarshal([]byte(text), &value); err != nil {
		return nil, false
	}
	return fromJSON(value), true
}

// fromJSON turns decoded JSON into metadata values: objects become Obj, null becomes Null.
func fromJSON(value any) any {
	switch v := value.(type) {
	case nil:
		return Null
	case map[string]any:
		out := Obj{}
		for k, item := range v {
			out[k] = fromJSON(item)
		}
		return out
	case []any:
		out := make([]any, len(v))
		for i, item := range v {
			out[i] = fromJSON(item)
		}
		return out
	}
	return value
}

// ---- decorators (decoratorUtils.ts) ----

// innermostExpression follows `.expression` the way the JavaScript generator does, so `@Get()` gives `Get`.
func innermostExpression(node *ast.Node) *ast.Node {
	for {
		switch node.Kind {
		case ast.KindDecorator, ast.KindCallExpression, ast.KindPropertyAccessExpression, ast.KindElementAccessExpression,
			ast.KindParenthesizedExpression, ast.KindNonNullExpression, ast.KindAsExpression, ast.KindTypeAssertionExpression,
			ast.KindSatisfiesExpression, ast.KindTaggedTemplateExpression:
			next := node.Expression()
			if next == nil {
				return node
			}
			node = next
		default:
			return node
		}
	}
}

// getDecorators lists the identifiers of a node's decorators that match, such as `Get` of `@Get('path')`.
func getDecorators(node *ast.Node, isMatching func(identifier *ast.Node) bool) []*ast.Node {
	modifiers := node.Modifiers()
	if modifiers == nil {
		return nil
	}
	var out []*ast.Node
	for _, modifier := range modifiers.Nodes {
		if !ast.IsDecorator(modifier) {
			continue
		}
		identifier := innermostExpression(modifier)
		if ast.IsIdentifier(identifier) && isMatching(identifier) {
			out = append(out, identifier)
		}
	}
	return out
}

func decoratorsNamed(node *ast.Node, name string) []*ast.Node {
	return getDecorators(node, func(identifier *ast.Node) bool { return identifier.Text() == name })
}

func isDecorator(node *ast.Node, name string) bool {
	return len(decoratorsNamed(node, name)) > 0
}

func getNodeFirstDecoratorName(node *ast.Node, isMatching func(identifier *ast.Node) bool) (string, bool) {
	decorators := getDecorators(node, isMatching)
	if len(decorators) == 0 {
		return "", false
	}
	return decorators[0].Text(), true
}

// ---- isVoidType.ts ----

func isVoidType(t Obj) bool {
	switch t["dataType"] {
	case "void", "undefined":
		return true
	case "refAlias":
		return isVoidType(t["type"].(Obj))
	}
	return false
}
