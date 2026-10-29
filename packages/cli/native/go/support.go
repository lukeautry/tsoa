package main

import (
	"regexp"
	"strings"

	"github.com/microsoft/TypeScript/tsc/internal/ast"
	"github.com/microsoft/TypeScript/tsc/internal/checker"
	"github.com/microsoft/TypeScript/tsc/internal/nodebuilder"
)

// ---- syntheticChildType.ts ----

// tupleElementNode: a rest element `...X[]` stands for X. Any other rest element keeps its node, and the resolver
// reads an array it resolves to as its elements.
func tupleElementNode(element *ast.Node) *ast.Node {
	if ast.IsNamedTupleMember(element) {
		return element.Type()
	}
	if ast.IsRestTypeNode(element) {
		if ast.IsArrayTypeNode(element.Type()) {
			return element.Type().AsArrayTypeNode().ElementType
		}
		return element.Type()
	}
	return element
}

func printKey(node *ast.Node) string {
	if ast.IsParenthesizedTypeNode(node) {
		node = node.Type()
	}
	return textPrinter.Emit(node, nil)
}

func withoutUndefined(t *checker.Type) *checker.Type {
	if t.Flags()&checker.TypeFlagsUnion == 0 {
		return t
	}
	// The union as written keeps an alias the flattened union lost, as in `P<A | null> | undefined`.
	if origin := t.Origin(); origin != nil && origin.Flags()&checker.TypeFlagsUnion != 0 {
		var written []*checker.Type
		for _, member := range origin.Types() {
			if member.Flags()&checker.TypeFlagsUndefined == 0 {
				written = append(written, member)
			}
		}
		if len(written) == 1 {
			return written[0]
		}
	}
	var others []*checker.Type
	for _, member := range t.Types() {
		if member.Flags()&checker.TypeFlagsUndefined == 0 {
			others = append(others, member)
		}
	}
	if len(others) == len(t.Types()) {
		return t
	}
	if len(others) == 1 {
		return others[0]
	}
	return nil
}

// syntheticChildTypes gives the children of a node printed by the checker the types they were printed from.
func (g *generator) syntheticChildTypes(parent *ast.Node, parentType *checker.Type, enclosingDeclaration *ast.Node) map[*ast.Node]*checker.Type {
	childTypes := map[*ast.Node]*checker.Type{}
	if parentType == nil || !isSynthetic(parent) {
		return childTypes
	}
	c := g.checker
	assign := func(child *ast.Node, t *checker.Type, optional bool) {
		// Under exactOptionalPropertyTypes the printer drops an optional member's `undefined`.
		if t != nil && optional && !ast.IsUnionTypeNode(child) {
			t = withoutUndefined(t)
		}
		if t != nil && isSynthetic(child) {
			childTypes[child] = t
		}
	}
	switch {
	case ast.IsArrayTypeNode(parent):
		if c.IsArrayType(parentType) {
			assign(parent.AsArrayTypeNode().ElementType, c.GetTypeArguments(parentType)[0], false)
		}
	case ast.IsTupleTypeNode(parent):
		if checker.IsTupleType(parentType) {
			elementTypes := c.GetTypeArguments(parentType)
			for index, element := range parent.AsTupleTypeNode().Elements.Nodes {
				if ast.IsNamedTupleMember(element) && element.AsNamedTupleMember().DotDotDotToken != nil {
					continue
				}
				if index < len(elementTypes) {
					optional := ast.IsNamedTupleMember(element) && element.AsNamedTupleMember().QuestionToken != nil
					assign(tupleElementNode(element), elementTypes[index], optional)
				}
			}
		}
	case ast.IsTypeLiteralNode(parent):
		for _, member := range parent.AsTypeLiteralNode().Members.Nodes {
			if ast.IsIndexSignatureDeclaration(member) {
				if parameters := member.Parameters(); len(parameters) > 0 && parameters[0].Type() != nil && parameters[0].Type().Kind == ast.KindStringKeyword {
					assign(member.Type(), c.GetStringIndexType(parentType), false)
				}
			} else if ast.IsPropertySignatureDeclaration(member) && member.Type() != nil {
				name := member.Name()
				if ast.IsIdentifier(name) || ast.IsStringLiteral(name) || ast.IsNumericLiteral(name) {
					if property := c.GetPropertyOfType(parentType, name.Text()); property != nil {
						assign(member.Type(), c.GetTypeOfSymbol(property), isOptionalMember(member))
					}
				}
			}
		}
	case (ast.IsUnionTypeNode(parent) || ast.IsIntersectionTypeNode(parent)) && parentType.Flags()&(checker.TypeFlagsUnion|checker.TypeFlagsIntersection) != 0:
		members := unionOrIntersectionTypes(parent)
		// The printer writes a union as it was written, so its members match the origin's members first.
		if origin := parentType.Origin(); origin != nil && origin.Flags()&checker.TypeFlagsUnion != 0 {
			g.assignMembers(enclosingDeclaration, members, origin.Types(), childTypes)
		}
		g.assignMembers(enclosingDeclaration, members, parentType.Types(), childTypes)
	}
	return childTypes
}

// The printer reorders union and intersection members, so members match the types they were printed from by what they print.
func (g *generator) assignMembers(enclosingDeclaration *ast.Node, members []*ast.Node, candidates []*checker.Type, childTypes map[*ast.Node]*checker.Type) {
	printTable := func(flags nodebuilder.Flags) map[string][]*checker.Type {
		types := map[string][]*checker.Type{}
		for _, candidate := range candidates {
			if printed := g.printType(candidate, enclosingDeclaration, flags); printed != nil {
				key := printKey(printed)
				types[key] = append(types[key], candidate)
			}
		}
		return types
	}
	plain := printTable(nodebuilder.FlagsNoTruncation)
	var qualified map[string][]*checker.Type
	keys := make([]string, len(members))
	for i, member := range members {
		keys[i] = printKey(member)
	}
	seenKeys := map[string]int{}
	for i, member := range members {
		key := keys[i]
		occurrence := seenKeys[key]
		seenKeys[key]++
		if _, assigned := childTypes[member]; assigned || !isSynthetic(member) {
			continue
		}
		types, ok := plain[key]
		if !ok && strings.Contains(key, ".") {
			if qualified == nil {
				qualified = printTable(nodebuilder.FlagsNoTruncation | nodebuilder.FlagsUseFullyQualifiedType)
			}
			types = qualified[key]
		}
		sameKey := 0
		for _, other := range keys {
			if other == key {
				sameKey++
			}
		}
		// Members that print the same are printed in the order of the union's types.
		if len(types) == sameKey && occurrence < len(types) {
			childTypes[member] = types[occurrence]
		}
	}
}

// ---- documentation ----

func renderJSDocComment(comment *ast.NodeList) string {
	if comment == nil {
		return ""
	}
	var b strings.Builder
	for _, part := range comment.Nodes {
		switch part.Kind {
		case ast.KindJSDocText:
			b.WriteString(part.Text())
		case ast.KindJSDocLink, ast.KindJSDocLinkCode, ast.KindJSDocLinkPlain:
			tag := "link"
			if part.Kind == ast.KindJSDocLinkCode {
				tag = "linkcode"
			} else if part.Kind == ast.KindJSDocLinkPlain {
				tag = "linkplain"
			}
			text := strings.TrimLeft(part.Text(), " \t\n|")
			target := ""
			if name := part.Name(); name != nil {
				target = nodeText(name)
			}
			parts := []string{}
			for _, p := range []string{target, text} {
				if p != "" {
					parts = append(parts, p)
				}
			}
			b.WriteString("{@" + tag + " " + strings.Join(parts, " ") + "}")
		}
	}
	return b.String()
}

// commentHolders are the JSDoc blocks of a declaration, or the `@param` tags naming a parameter.
func commentHolders(declaration *ast.Node) []*ast.NodeList {
	var holders []*ast.NodeList
	if ast.IsParameterDeclaration(declaration) && declaration.Parent != nil && ast.IsIdentifier(declaration.Name()) {
		name := declaration.Name().Text()
		for _, doc := range jsDocs(declaration.Parent) {
			if tags := doc.AsJSDoc().Tags; tags != nil {
				for _, tag := range tags.Nodes {
					if ast.IsJSDocParameterTag(tag) && entityNameText(tag.Name()) == name {
						holders = append(holders, tag.CommentList())
					}
				}
			}
		}
	}
	host := declaration
	if ast.IsVariableDeclaration(declaration) && declaration.Parent != nil && declaration.Parent.Parent != nil && ast.IsVariableStatement(declaration.Parent.Parent) {
		host = declaration.Parent.Parent
	}
	for _, doc := range jsDocs(host) {
		holders = append(holders, doc.AsJSDoc().Comment)
	}
	return holders
}

// getSymbolDocumentation is the documentation TypeScript 6 gave a symbol: the comments of its declarations, or the
// `@param` tags naming a parameter, one per line; a member without one inherits it from its base types.
func (g *generator) getSymbolDocumentation(symbol *ast.Symbol) any {
	var comments []string
	for _, declaration := range symbol.Declarations() {
		for _, holder := range commentHolders(declaration) {
			if comment := renderJSDocComment(holder); comment != "" && !containsString(comments, comment) {
				comments = append(comments, comment)
			}
		}
	}
	if len(comments) > 0 {
		return strings.Join(comments, "\n")
	}
	if inherited := g.inheritedDocumentation(symbol, map[*ast.Symbol]bool{}); inherited != "" {
		return inherited
	}
	return nil
}

func (g *generator) inheritedDocumentation(symbol *ast.Symbol, seen map[*ast.Symbol]bool) string {
	if seen[symbol] {
		return ""
	}
	seen[symbol] = true
	for _, declaration := range symbol.Declarations() {
		container := declaration.Parent
		if container == nil || !(ast.IsClassLike(container) || ast.IsInterfaceDeclaration(container)) {
			continue
		}
		containerSymbol := container.Symbol()
		if containerSymbol == nil {
			continue
		}
		for _, base := range g.checker.GetBaseTypes(g.checker.GetDeclaredTypeOfSymbol(containerSymbol)) {
			property := g.checker.GetPropertyOfType(base, symbol.Name())
			if property == nil {
				continue
			}
			if documentation, ok := g.getSymbolDocumentation(property).(string); ok && documentation != "" {
				return documentation
			}
		}
	}
	return ""
}

// ---- minimatch ----

// minimatch matches a path against a glob the way the minimatch package does for tsoa's `ignore` patterns:
// `**` spans directories, `*` and `?` stay within one, `{a,b}` and `[...]` are alternatives.
func minimatch(path, pattern string) bool {
	re, err := regexp.Compile("^" + globToRegexp(pattern) + "$")
	if err != nil {
		return false
	}
	return re.MatchString(path)
}

func globToRegexp(pattern string) string {
	var b strings.Builder
	for i := 0; i < len(pattern); i++ {
		ch := pattern[i]
		switch ch {
		case '*':
			if i+1 < len(pattern) && pattern[i+1] == '*' {
				i++
				if i+1 < len(pattern) && pattern[i+1] == '/' {
					// `**/` matches any number of directories, including none
					i++
					b.WriteString(`(?:[^/]*(?:/|$))*`)
				} else {
					b.WriteString(`.*`)
				}
			} else {
				b.WriteString(`[^/]*`)
			}
		case '?':
			b.WriteString(`[^/]`)
		case '{':
			end := strings.IndexByte(pattern[i:], '}')
			if end < 0 {
				b.WriteString(`\{`)
				continue
			}
			options := strings.Split(pattern[i+1:i+end], ",")
			parts := make([]string, len(options))
			for j, option := range options {
				parts[j] = globToRegexp(option)
			}
			b.WriteString("(?:" + strings.Join(parts, "|") + ")")
			i += end
		case '[':
			end := strings.IndexByte(pattern[i:], ']')
			if end < 0 {
				b.WriteString(`\[`)
				continue
			}
			class := pattern[i+1 : i+end]
			if strings.HasPrefix(class, "!") {
				class = "^" + class[1:]
			}
			b.WriteString("[" + class + "]")
			i += end
		default:
			b.WriteString(regexp.QuoteMeta(string(ch)))
		}
	}
	return b.String()
}
