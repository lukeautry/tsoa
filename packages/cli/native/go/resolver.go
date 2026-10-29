package main

import (
	"encoding/json"
	"fmt"
	"math"
	"reflect"
	"regexp"
	"strconv"
	"strings"
	"unicode/utf16"

	"github.com/microsoft/TypeScript/tsc/internal/ast"
	"github.com/microsoft/TypeScript/tsc/internal/checker"
	"github.com/microsoft/TypeScript/tsc/internal/nodebuilder"
)

// ---- typeResolver.ts ----

type contextEntry struct {
	typeNode *ast.Node
	name     string
}

type resolverContext map[string]contextEntry

type typeResolver struct {
	g                    *generator
	typeNode             *ast.Node
	parentNode           *ast.Node
	context              resolverContext
	referencer           *checker.Type
	enclosingDeclaration *ast.Node
	childTypes           map[*ast.Node]*checker.Type
}

func (g *generator) newTypeResolver(typeNode *ast.Node) *typeResolver {
	return &typeResolver{g: g, typeNode: typeNode, context: resolverContext{}}
}

func (g *generator) newTypeResolverWithParent(typeNode, parentNode *ast.Node) *typeResolver {
	return &typeResolver{g: g, typeNode: typeNode, parentNode: parentNode, context: resolverContext{}}
}

func (r *typeResolver) sub(typeNode, parentNode *ast.Node, context resolverContext, referencer *checker.Type, enclosingDeclaration *ast.Node) *typeResolver {
	if context == nil {
		context = resolverContext{}
	}
	return &typeResolver{g: r.g, typeNode: typeNode, parentNode: parentNode, context: context, referencer: referencer, enclosingDeclaration: enclosingDeclaration}
}

func (r *typeResolver) checker() *checker.Checker { return r.g.checker }

func hasTypeFlag(t *checker.Type, flag checker.TypeFlags) bool { return t.Flags()&flag == flag }

func hasSymbolFlag(s *ast.Symbol, flag ast.SymbolFlags) bool { return s.Flags()&flag == flag }

func (r *typeResolver) typeToString(t *checker.Type) string { return r.checker().TypeToString(t) }

func (r *typeResolver) resolve() Obj {
	var parentTagNames []string
	if r.parentNode != nil {
		parentTagNames = getJSDocTagNames(r.parentNode, false)
	}
	if primitive := transformPrimitive(r.g.defaultNumberType, r.typeNode, parentTagNames, r.parentNode != nil); primitive != nil {
		return primitive
	}
	node := r.typeNode
	switch {
	case ast.IsArrayTypeNode(node):
		return Obj{"dataType": "array", "elementType": r.child(node.AsArrayTypeNode().ElementType, r.parentNode).resolve()}
	case ast.IsRestTypeNode(node):
		return r.child(node.Type(), r.parentNode).resolve()
	case ast.IsUnionTypeNode(node) || ast.IsIntersectionTypeNode(node):
		dataType := "intersection"
		if ast.IsUnionTypeNode(node) {
			dataType = "union"
		}
		types := []any{}
		for _, member := range unionOrIntersectionTypes(node) {
			types = append(types, r.child(member, r.parentNode).resolve())
		}
		return Obj{"dataType": dataType, "types": types}
	case ast.IsTupleTypeNode(node):
		elementTypes := []any{}
		var restType Obj
		for _, element := range node.AsTupleTypeNode().Elements.Nodes {
			elementNode := tupleElementNode(element)
			t := r.child(elementNode, element).resolve()
			if ast.IsRestTypeNode(element) {
				if elementNode == element.Type() && t["dataType"] == "array" {
					restType = t["elementType"].(Obj)
				} else {
					restType = t
				}
			} else {
				elementTypes = append(elementTypes, t)
			}
		}
		result := Obj{"dataType": "tuple", "types": elementTypes}
		if restType != nil {
			result["restType"] = restType
		}
		return result
	case node.Kind == ast.KindAnyKeyword || node.Kind == ast.KindUnknownKeyword:
		return Obj{"dataType": "any"}
	case ast.IsLiteralTypeNode(node):
		return Obj{"dataType": "enum", "enums": []any{r.getLiteralValue(node)}}
	case ast.IsTypeLiteralNode(node):
		return r.resolveTypeLiteral(node)
	case node.Kind == ast.KindObjectKeyword:
		return Obj{"dataType": "object"}
	case ast.IsMappedTypeNode(node):
		return r.calcMappedType(r.getReferencer(), node)
	case ast.IsConditionalTypeNode(node):
		referencer := r.getReferencer()
		resolver := r.printedResolver(referencer, node, nil, nodebuilder.FlagsNoTruncation)
		if ast.IsConditionalTypeNode(resolver.typeNode) {
			throwError(fmt.Sprintf("The conditional type %s did not resolve.", r.typeToString(referencer)), node)
		}
		return resolver.resolve()
	case ast.IsTypeOperatorNode(node):
		return r.resolveTypeOperatorNode(node)
	case ast.IsIndexedAccessTypeNode(node):
		return r.resolveIndexedAccessTypeNode(node)
	case ast.IsTemplateLiteralTypeNode(node):
		t := r.getReferencer()
		ok := hasTypeFlag(t, checker.TypeFlagsUnion)
		if ok {
			for _, member := range t.Types() {
				if member.Flags()&checker.TypeFlagsStringLiteral == 0 {
					ok = false
				}
			}
		}
		if !ok {
			var enclosing *ast.Node
			if !isSynthetic(node) {
				enclosing = node
			}
			throwError(fmt.Sprintf("Could not determine the type of %s", r.checker().TypeToStringEx(t, enclosing, defaultTypeFormatFlags, nil)), node)
		}
		enums := []any{}
		for _, member := range t.Types() {
			enums = append(enums, literalValue(member))
		}
		return Obj{"dataType": "enum", "enums": enums}
	case ast.IsParenthesizedTypeNode(node):
		return r.sub(node.Type(), node, r.context, r.referencer, r.enclosingDeclaration).resolve()
	}
	if node.Kind != ast.KindTypeReference {
		throwError(fmt.Sprintf("Unknown type: %s", syntaxKindName(node.Kind)), node)
	}
	return r.resolveTypeReferenceNode(node)
}

// syntaxKindName is the name of a syntax kind as TypeScript's SyntaxKind enum gives it.
func syntaxKindName(kind ast.Kind) string {
	return strings.TrimPrefix(kind.String(), "Kind")
}

const defaultTypeFormatFlags = checker.TypeFormatFlagsAllowUniqueESSymbolType | checker.TypeFormatFlagsUseAliasDefinedOutsideCurrentScope

func unionOrIntersectionTypes(node *ast.Node) []*ast.Node {
	if ast.IsUnionTypeNode(node) {
		return node.AsUnionTypeNode().Types.Nodes
	}
	return node.AsIntersectionTypeNode().Types.Nodes
}

func (r *typeResolver) resolveTypeLiteral(node *ast.Node) Obj {
	properties := []any{}
	for _, member := range node.AsTypeLiteralNode().Members.Nodes {
		if !ast.IsPropertySignatureDeclaration(member) {
			continue
		}
		t := r.child(member.Type(), member).resolve()
		property := Obj{
			"example":     r.getNodeExample(member),
			"default":     getDefault(member),
			"description": r.getNodeDescription(member),
			"format":      r.getNodeFormat(member),
			"name":        r.getPropertyName(member),
			"required":    member.PostfixToken() == nil || member.PostfixToken().Kind != ast.KindQuestionToken,
			"type":        t,
			"validators":  r.g.getPropertyValidators(member),
			"deprecated":  hasJSDocTag(member, "deprecated"),
			"title":       r.getNodeTitle(member),
			"extensions":  r.getNodeExtension(member),
		}
		// Members are listed last to first.
		properties = append([]any{property}, properties...)
	}
	var indexMember *ast.Node
	for _, member := range node.AsTypeLiteralNode().Members.Nodes {
		if ast.IsIndexSignatureDeclaration(member) {
			indexMember = member
			break
		}
	}
	var additionalType any
	if indexMember != nil {
		indexType := r.child(indexMember.Parameters()[0].Type(), r.parentNode).resolve()
		if indexType["dataType"] != "string" {
			throwError("Only string indexers are supported.", r.typeNode)
		}
		additionalType = r.child(indexMember.Type(), r.parentNode).resolve()
	}
	return Obj{"additionalProperties": additionalType, "dataType": "nestedObjectLiteral", "properties": properties}
}

func (r *typeResolver) getOneOrigDeclaration(prop *ast.Symbol) *ast.Node {
	if declarations := prop.Declarations(); len(declarations) > 0 {
		return declarations[0]
	}
	// The property of a mapped type points back to the property it maps; otherwise its documentation is lost.
	for _, root := range r.checker().GetRootSymbols(prop) {
		if root != prop && root.Name() == prop.Name() && len(root.Declarations()) > 0 {
			return root.Declarations()[0]
		}
	}
	return nil
}

func (r *typeResolver) calcMappedType(t *checker.Type, mappedTypeNode *ast.Node) Obj {
	c := r.checker()
	switch {
	case hasTypeFlag(t, checker.TypeFlagsUnion):
		types := []any{}
		for _, member := range t.Types() {
			types = append(types, r.calcMappedType(member, mappedTypeNode))
		}
		return Obj{"dataType": "union", "types": types}
	case hasTypeFlag(t, checker.TypeFlagsUndefined):
		return Obj{"dataType": "undefined"}
	case hasTypeFlag(t, checker.TypeFlagsNull):
		return Obj{"dataType": "enum", "enums": []any{Null}}
	case hasTypeFlag(t, checker.TypeFlagsObject):
		properties := []any{}
		for _, property := range c.GetPropertiesOfType(t) {
			parent := r.getOneOrigDeclaration(property)
			// Ignore methods, getter, setter and @ignored props
			if parent != nil && (containsString(getJSDocTagNames(parent, false), "ignore") ||
				(!ast.IsPropertyDeclaration(parent) && !ast.IsPropertySignatureDeclaration(parent) && !ast.IsParameterDeclaration(parent))) {
				continue
			}
			var propertyType *checker.Type
			if isSynthetic(r.typeNode) {
				propertyType = c.GetTypeOfSymbol(property)
			} else {
				propertyType = c.GetTypeOfSymbolAtLocation(property, r.typeNode)
			}
			typ := r.printedResolver(propertyType, parent, nil, nodebuilder.FlagsNoTruncation).resolve()
			var def any
			if parent != nil && hasInitializer(parent) {
				def = r.g.getInitializerValue(parent.Initializer(), "")
			} else if parent != nil {
				def = getDefault(parent)
			}
			prop := Obj{
				"name":        property.Name(),
				"required":    !hasSymbolFlag(property, ast.SymbolFlagsOptional),
				"deprecated":  parent != nil && (hasJSDocTag(parent, "deprecated") || isDecorator(parent, "Deprecated")),
				"type":        typ,
				"default":     def,
				"validators":  Obj{},
				"description": r.g.getSymbolDocumentation(property),
			}
			if parent != nil {
				prop["validators"] = r.g.getPropertyValidators(parent)
				prop["format"] = r.getNodeFormat(parent)
				prop["example"] = r.getNodeExample(parent)
				prop["extensions"] = r.getNodeExtension(parent)
			}
			properties = append(properties, prop)
		}
		objectLiteral := Obj{"dataType": "nestedObjectLiteral", "properties": properties}
		var indexTypes []any
		for _, indexInfo := range c.GetIndexInfosOfType(t) {
			resolver := r.printedResolver(indexInfo.ValueType(), mappedTypeNode, nil, nodebuilder.FlagsNoTruncation)
			if resolver.typeNode.Kind == ast.KindNeverKeyword {
				// { [k: string]: never; }
				continue
			}
			indexTypes = append(indexTypes, resolver.resolve())
		}
		if len(indexTypes) == 1 {
			objectLiteral["additionalProperties"] = indexTypes[0]
		} else if len(indexTypes) > 1 {
			// Every additional property key assumed as string
			objectLiteral["additionalProperties"] = Obj{"dataType": "union", "types": indexTypes}
		}
		return objectLiteral
	}
	throwError(fmt.Sprintf("Unhandled mapped type has found, flags: %d", t.Flags()), r.typeNode)
	return nil
}

// literalValue is a literal type's value: a string or a number.
func literalValue(t *checker.Type) any {
	value := t.AsLiteralType().Value()
	if s, ok := value.(string); ok {
		return s
	}
	if number, ok := toFloat(value); ok {
		return jsonNumber(number)
	}
	return value
}

func toFloat(value any) (float64, bool) {
	v := reflect.ValueOf(value)
	switch v.Kind() {
	case reflect.Float32, reflect.Float64:
		return v.Float(), true
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return float64(v.Int()), true
	}
	return 0, false
}

func isLiteralType(t *checker.Type) bool {
	return t.Flags()&(checker.TypeFlagsStringLiteral|checker.TypeFlagsNumberLiteral|checker.TypeFlagsBigIntLiteral) != 0
}

func (r *typeResolver) resolveTypeOperatorNode(node *ast.Node) Obj {
	operator := node.AsTypeOperatorNode()
	c := r.checker()
	switch operator.Operator {
	case ast.KindKeyOfKeyword:
		t := r.typeOf(node)
		if t.Flags()&checker.TypeFlagsIndex != 0 {
			// in case of generic: keyof T. Not handles all possible cases
			symbol := t.AsIndexType().Target().Symbol()
			if symbol != nil && hasSymbolFlag(symbol, ast.SymbolFlagsTypeParameter) {
				typeName := symbol.Name()
				if entry, ok := r.context[typeName]; ok {
					subResult := r.sub(entry.typeNode, r.parentNode, r.context, nil, nil).resolve()
					if subResult["dataType"] == "any" {
						return Obj{"dataType": "union", "types": []any{Obj{"dataType": "string"}, Obj{"dataType": "double"}}}
					}
					properties, ok := subResult["properties"].([]any)
					if !ok {
						throwError("TypeOperator 'keyof' on node which have no properties", entry.typeNode)
					}
					names := []any{}
					for _, property := range properties {
						names = append(names, property.(Obj)["name"])
					}
					return Obj{"dataType": "enum", "enums": names}
				}
			}
		} else if hasTypeFlag(t, checker.TypeFlagsUnion) {
			types := t.Types()
			literalValues := []any{}
			literals := 0
			for _, member := range types {
				if !isLiteralType(member) {
					continue
				}
				literals++
				value := literalValue(member)
				if _, isString := value.(string); !isString {
					if _, isNumber := value.(float64); !isNumber {
						throwError(fmt.Sprintf("Not handled key Type, maybe ts.PseudoBigInt %s", r.typeToString(member)), node)
					}
				}
				literalValues = append(literalValues, value)
			}
			if literals == 0 {
				someString, someNumber, someSymbol := false, false, false
				for _, member := range types {
					someString = someString || member.Flags() == checker.TypeFlagsString
					someNumber = someNumber || member.Flags() == checker.TypeFlagsNumber
					someSymbol = someSymbol || member.Flags() == checker.TypeFlagsESSymbol
				}
				if someString && someNumber && (len(types) == 2 || (len(types) == 3 && someSymbol)) {
					return Obj{"dataType": "union", "types": []any{Obj{"dataType": "string"}, Obj{"dataType": "double"}}}
				}
			}
			// Warn on nonsense (`number`, `typeof Symbol.iterator`)
			var problems []string
			for _, member := range types {
				if !isLiteralType(member) {
					problems = append(problems, r.typeToString(member))
				}
			}
			if len(problems) > 0 {
				r.g.warn(warningMessage("Skipped non-literal type(s) "+strings.Join(problems, ", "), node))
			}
			var stringMembers, numberMembers []any
			for _, value := range literalValues {
				if _, isString := value.(string); isString {
					stringMembers = append(stringMembers, value)
				} else {
					numberMembers = append(numberMembers, value)
				}
			}
			if len(stringMembers) > 0 && len(numberMembers) > 0 {
				return Obj{"dataType": "union", "types": []any{Obj{"dataType": "enum", "enums": stringMembers}, Obj{"dataType": "enum", "enums": numberMembers}}}
			}
			return Obj{"dataType": "enum", "enums": literalValues}
		} else if isLiteralType(t) {
			value := literalValue(t)
			if _, isString := value.(string); !isString {
				if _, isNumber := value.(float64); !isNumber {
					throwError(fmt.Sprintf("Not handled indexType, maybe ts.PseudoBigInt %s", r.typeToString(t)), node)
				}
			}
			return Obj{"dataType": "enum", "enums": []any{value}}
		} else if hasTypeFlag(t, checker.TypeFlagsNever) {
			throwError("TypeOperator 'keyof' on node produced a never type", node)
		} else if hasTypeFlag(t, checker.TypeFlagsTemplateLiteral) {
			//Now assumes template literals as string
			r.g.warn(warningMessage("Template literals are assumed as strings", node))
			return Obj{"dataType": "string"}
		} else if hasTypeFlag(t, checker.TypeFlagsNumber) {
			return Obj{"dataType": "double"}
		}
		throwError(fmt.Sprintf("Could not determine the keys on %s", r.typeToString(r.typeOf(operator.Type))), node)
	case ast.KindReadonlyKeyword:
		// Handle `readonly` arrays
		return r.sub(operator.Type, node, r.context, r.referencer, r.enclosingDeclaration).resolve()
	}
	throwError(fmt.Sprintf("Unknown type: %s", syntaxKindName(node.Kind)), node)
	_ = c
	return nil
}

// typeOf is getTypeFromTypeNode, for nodes written in source and nodes printed by the checker.
func (r *typeResolver) typeOf(node *ast.Node) *checker.Type {
	return r.g.typeOfTypeNode(node)
}

func (g *generator) typeOfTypeNode(node *ast.Node) *checker.Type {
	return g.checker.GetTypeFromTypeNode(node)
}

func (r *typeResolver) resolveIndexedAccessTypeNode(node *ast.Node) Obj {
	access := node.AsIndexedAccessTypeNode()
	indexType, objectType := access.IndexType, access.ObjectType
	c := r.checker()
	if indexType.Kind == ast.KindNumberKeyword || indexType.Kind == ast.KindStringKeyword {
		isNumber := indexType.Kind == ast.KindNumberKeyword
		typeOfObjectType := r.typeOf(objectType)
		var t *checker.Type
		if isNumber {
			t = c.GetNumberIndexType(typeOfObjectType)
		} else {
			t = c.GetStringIndexType(typeOfObjectType)
		}
		if t == nil {
			kind := "string"
			if isNumber {
				kind = "number"
			}
			throwError(fmt.Sprintf("Could not determine %s index on %s", kind, r.typeToString(typeOfObjectType)), node)
		}
		return r.printedResolver(t, node, objectType, nodebuilder.FlagsNoTruncation).resolve()
	}
	if ast.IsLiteralTypeNode(indexType) {
		literal := indexType.AsLiteralTypeNode().Literal
		if ast.IsStringLiteral(literal) || ast.IsNumericLiteral(literal) {
			objectTypeType := r.typeOf(objectType)
			symbol := c.GetPropertyOfType(objectTypeType, literal.Text())
			if symbol == nil {
				throwError(fmt.Sprintf("Could not determine the keys on %s", r.typeToString(objectTypeType)), node)
			}
			if declaration := symbol.ValueDeclaration(); declaration != nil && hasTypeField(declaration) && declaration.Type() != nil {
				return r.sub(declaration.Type(), node, r.context, nil, nil).resolve()
			}
			declarationType := c.GetTypeOfSymbolAtLocation(symbol, objectType)
			return r.printedResolverOrFail(declarationType, node, objectType)
		}
	}
	if ast.IsTypeOperatorNode(indexType) && indexType.AsTypeOperatorNode().Operator == ast.KindKeyOfKeyword {
		typeOfObjectType := objectType
		if ast.IsParenthesizedTypeNode(objectType) {
			typeOfObjectType = objectType.Type()
		}
		typeOfIndexType := indexType.AsTypeOperatorNode().Type
		isSameTypeQuery := ast.IsTypeQueryNode(typeOfObjectType) && ast.IsTypeQueryNode(typeOfIndexType) &&
			nodeText(typeOfObjectType.AsTypeQueryNode().ExprName) == nodeText(typeOfIndexType.AsTypeQueryNode().ExprName)
		isSameTypeReference := ast.IsTypeReferenceNode(typeOfObjectType) && ast.IsTypeReferenceNode(typeOfIndexType) &&
			nodeText(typeOfObjectType.AsTypeReferenceNode().TypeName) == nodeText(typeOfIndexType.AsTypeReferenceNode().TypeName)
		if isSameTypeQuery || isSameTypeReference {
			return r.printedResolver(r.getReferencer(), node, nil, nodebuilder.FlagsInTypeAlias|nodebuilder.FlagsNoTruncation).resolve()
		}
	}
	throwError(fmt.Sprintf("Unknown type: %s", syntaxKindName(node.Kind)), node)
	return nil
}

func (r *typeResolver) printedResolverOrFail(declarationType *checker.Type, node, objectType *ast.Node) (result Obj) {
	defer func() {
		if recovered := recover(); recovered != nil {
			throwError(fmt.Sprintf("Could not determine the keys on %s", r.typeToString(r.typeOf(r.g.printType(declarationType, nil, nodebuilder.FlagsNoTruncation)))), node)
		}
	}()
	return r.printedResolver(declarationType, node, objectType, nodebuilder.FlagsNoTruncation).resolve()
}

func hasTypeField(node *ast.Node) bool {
	switch node.Kind {
	case ast.KindPropertyDeclaration, ast.KindPropertySignature, ast.KindParameter, ast.KindVariableDeclaration, ast.KindTypeAliasDeclaration,
		ast.KindMethodDeclaration, ast.KindMethodSignature, ast.KindGetAccessor, ast.KindSetAccessor, ast.KindFunctionDeclaration:
		return true
	}
	return false
}

func (r *typeResolver) resolveTypeReferenceNode(node *ast.Node) Obj {
	reference := node.AsTypeReferenceNode()
	typeName := reference.TypeName
	var typeArguments []*ast.Node
	if reference.TypeArguments != nil {
		typeArguments = reference.TypeArguments.Nodes
	}
	if typeName.Kind != ast.KindIdentifier {
		return r.getReferenceType(node, true)
	}
	switch typeName.Text() {
	case "Date":
		return transformDate(r.parentNode)
	case "Buffer", "Readable":
		return Obj{"dataType": "buffer"}
	case "Array":
		if len(typeArguments) == 1 {
			return Obj{"dataType": "array", "elementType": r.sub(typeArguments[0], r.parentNode, r.context, nil, nil).resolve()}
		}
	case "Promise":
		if len(typeArguments) == 1 {
			return r.sub(typeArguments[0], r.parentNode, r.context, nil, nil).resolve()
		}
	case "String":
		return Obj{"dataType": "string"}
	default:
		if entry, ok := r.context[typeName.Text()]; ok {
			return r.sub(entry.typeNode, r.parentNode, r.context, nil, nil).resolve()
		}
	}
	return r.getReferenceType(node, true)
}

func (r *typeResolver) getLiteralValue(node *ast.Node) any {
	literal := node.AsLiteralTypeNode().Literal
	switch literal.Kind {
	case ast.KindTrueKeyword:
		return true
	case ast.KindFalseKeyword:
		return false
	case ast.KindStringLiteral:
		return literal.Text()
	case ast.KindNumericLiteral:
		return jsParseFloat(literal.Text())
	case ast.KindPrefixUnaryExpression:
		prefix := literal.AsPrefixUnaryExpression()
		if prefix.Operator != ast.KindMinusToken {
			panic(&MetadataError{Message: "Couldn't resolve literal node: " + nodeText(literal)})
		}
		return jsParseFloat("-" + prefix.Operand.Text())
	case ast.KindNullKeyword:
		return Null
	}
	switch literal.Kind {
	case ast.KindNoSubstitutionTemplateLiteral, ast.KindBigIntLiteral, ast.KindRegularExpressionLiteral:
		return literal.Text()
	}
	panic(&MetadataError{Message: "Couldn't resolve literal node: " + nodeText(literal)})
}

var leadingFloat = regexp.MustCompile(`^[+-]?(Infinity|(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?)`)

// jsParseFloat is JavaScript's parseFloat.
func jsParseFloat(text string) any {
	match := leadingFloat.FindString(strings.TrimSpace(text))
	if match == "" {
		return Null
	}
	value, err := strconv.ParseFloat(strings.Replace(match, "Infinity", "Inf", 1), 64)
	if err != nil {
		return Null
	}
	return jsonNumber(value)
}

func (r *typeResolver) getDesignatedModels(nodes []*ast.Node, typeName string) []*ast.Node {
	var designated []*ast.Node
	for _, node := range nodes {
		if hasJSDocTag(node, "tsoaModel") {
			designated = append(designated, node)
		}
	}
	if len(designated) == 0 {
		return nodes
	}
	if len(designated) > 1 {
		panic(&MetadataError{Message: fmt.Sprintf("Multiple models for %s marked with '@tsoaModel'; '@tsoaModel' should only be applied to one model.", typeName)})
	}
	return designated
}

func (r *typeResolver) printedResolver(t *checker.Type, parentNode, enclosingDeclaration *ast.Node, flags nodebuilder.Flags) *typeResolver {
	node := r.g.printType(t, enclosingDeclaration, flags)
	return r.sub(node, parentNode, r.context, t, enclosingDeclaration)
}

func (r *typeResolver) child(node, parentNode *ast.Node) *typeResolver {
	if r.childTypes == nil {
		r.childTypes = r.g.syntheticChildTypes(r.typeNode, r.referencer, r.enclosingDeclaration)
	}
	return r.sub(node, parentNode, r.context, r.childTypes[node], r.enclosingDeclaration)
}

func (r *typeResolver) getReferencer() *checker.Type {
	if r.referencer != nil {
		return r.referencer
	}
	if !isSynthetic(r.typeNode) {
		return r.typeOf(r.typeNode)
	}
	throwError("Can not succeeded to calculate referencer type.", r.typeNode)
	return nil
}

func typeReferenceToEntityName(node *ast.Node) *ast.Node {
	if ast.IsTypeReferenceNode(node) {
		return node.AsTypeReferenceNode().TypeName
	}
	if ast.IsExpressionWithTypeArguments(node) {
		return node.Expression()
	}
	panic(&MetadataError{Message: "Can't resolve Reference type."})
}

func entityNameText(name *ast.Node) string {
	if ast.IsIdentifier(name) {
		return name.Text()
	}
	if ast.IsQualifiedName(name) {
		q := name.AsQualifiedName()
		return entityNameText(q.Left) + "." + q.Right.Text()
	}
	if ast.IsPropertyAccessExpression(name) {
		p := name.AsPropertyAccessExpression()
		return entityNameText(p.Expression) + "." + p.Name().Text()
	}
	return nodeText(name)
}

func rightName(name *ast.Node) string {
	if ast.IsQualifiedName(name) {
		return name.AsQualifiedName().Right.Text()
	}
	if ast.IsPropertyAccessExpression(name) {
		return name.AsPropertyAccessExpression().Name().Text()
	}
	return name.Text()
}

func (r *typeResolver) calcRefTypeName(typeName *ast.Node) string {
	name := entityNameText(typeName)
	if entry, ok := r.context[name]; ok {
		//resolve name only interesting if entity is not qualifiedName
		return entry.name
	}
	declarations := r.getModelTypeDeclarations(typeName)
	if len(declarations) == 0 {
		if ast.IsIdentifier(typeName) {
			return typeName.Text()
		}
		resolved := r.sub(typeName, r.parentNode, r.context, nil, nil).resolve()
		sanitized := regexp.MustCompile(`^_|_$`).ReplaceAllString(regexp.MustCompile(`_+`).ReplaceAllString(regexp.MustCompile(`[^A-Za-z0-9]`).ReplaceAllString(r.calcTypeName(typeName), "_"), "_"), "")
		uniqueName := "Inline_" + sanitized
		r.g.AddReferenceType(Obj{"dataType": "refAlias", "refName": uniqueName, "type": resolved, "validators": Obj{}, "deprecated": false})
		return uniqueName
	}
	oneDeclaration := declarations[0]
	identifiers := strings.Split(name, ".")
	if ast.IsEnumMember(oneDeclaration) {
		name = strings.Join(identifiers[max(0, len(identifiers)-2):], ".")
	} else {
		name = strings.Join(identifiers[len(identifiers)-1:], ".")
	}
	actNode := oneDeclaration.Parent
	isFirst := true
	for actNode != nil && !ast.IsSourceFile(actNode) {
		if ast.IsBlock(actNode) {
			break
		}
		if !(isFirst && ast.IsEnumDeclaration(actNode)) && !ast.IsModuleBlock(actNode) {
			if !ast.IsModuleDeclaration(actNode) {
				throwError(fmt.Sprintf("This node kind is unknown: %d", actNode.Kind), typeName)
			}
			moduleName := actNode.Name()
			if !(ast.IsIdentifier(moduleName) && moduleName.Text() == "global") {
				name = moduleName.Text() + "." + name
			}
		}
		isFirst = false
		actNode = actNode.Parent
	}
	positions := make([]declarationPosition, len(declarations))
	for i, declaration := range declarations {
		positions[i] = declarationPosition{FileName: string(ast.GetSourceFileOfNode(declaration).FileName()), Pos: declaration.Pos()}
	}
	r.g.CheckModelUnicity(name, positions)
	return name
}

func (r *typeResolver) calcMemberJsDocProperties(member *ast.Node) string {
	type field struct {
		key   string
		value any
	}
	var fields []field
	add := func(key string, value any) {
		if value != nil {
			fields = append(fields, field{key, value})
		}
	}
	add("default", getDefault(member))
	var description any
	if symbol := r.getSymbolAtLocation(member.Name()); symbol != nil {
		description = r.g.getSymbolDocumentation(symbol)
	}
	add("description", description)
	if validators := r.g.getPropertyValidators(member); len(validators) > 0 {
		add("validators", validators)
	}
	add("format", r.getNodeFormat(member))
	add("example", r.getNodeExample(member))
	if extensions := r.getNodeExtension(member); len(extensions) > 0 {
		add("extensions", extensions)
	}
	if hasJSDocTag(member, "deprecated") || isDecorator(member, "Deprecated") {
		add("deprecated", true)
	}
	if containsString(getJSDocTagNames(member, false), "ignore") {
		add("ignored", true)
	}
	if len(fields) == 0 {
		return ""
	}
	var b strings.Builder
	b.WriteByte('{')
	for i, f := range fields {
		if i > 0 {
			b.WriteByte(',')
		}
		key, _ := json.Marshal(f.key)
		b.Write(key)
		b.WriteByte(':')
		b.WriteString(jsStringify(f.value))
	}
	b.WriteByte('}')
	return b.String()
}

// jsStringify is JSON.stringify of a metadata value, with object keys in the order JavaScript would keep them.
func jsStringify(value any) string {
	switch v := value.(type) {
	case Obj:
		keys := make([]string, 0, len(v))
		for k, item := range v {
			if !isUndefined(item) {
				keys = append(keys, k)
			}
		}
		sortJSKeys(keys)
		var b strings.Builder
		b.WriteByte('{')
		for i, k := range keys {
			if i > 0 {
				b.WriteByte(',')
			}
			key, _ := json.Marshal(k)
			b.Write(key)
			b.WriteByte(':')
			b.WriteString(jsStringify(v[k]))
		}
		b.WriteByte('}')
		return b.String()
	case []any:
		parts := make([]string, len(v))
		for i, item := range v {
			if isUndefined(item) {
				parts[i] = "null"
			} else {
				parts[i] = jsStringify(item)
			}
		}
		return "[" + strings.Join(parts, ",") + "]"
	case float64:
		return strconv.FormatFloat(v, 'f', -1, 64)
	}
	out, _ := json.Marshal(value)
	return string(out)
}

// sortJSKeys orders keys the way JavaScript does: integer-like keys ascending first, then the rest as inserted.
// Insertion order is not known here, so the rest keep a stable alphabetical order.
func sortJSKeys(keys []string) {
	isIndex := func(k string) bool {
		n, err := strconv.ParseUint(k, 10, 32)
		return err == nil && strconv.FormatUint(n, 10) == k
	}
	for i := 1; i < len(keys); i++ {
		for j := i; j > 0; j-- {
			a, b := keys[j-1], keys[j]
			ai, bi := isIndex(a), isIndex(b)
			less := false
			switch {
			case ai && bi:
				na, _ := strconv.ParseUint(a, 10, 32)
				nb, _ := strconv.ParseUint(b, 10, 32)
				less = nb < na
			case bi && !ai:
				less = true
			case !ai && !bi:
				less = b < a
			}
			if !less {
				break
			}
			keys[j-1], keys[j] = b, a
		}
	}
}

func (r *typeResolver) calcTypeName(arg *ast.Node) string {
	if ast.IsLiteralTypeNode(arg) {
		switch value := r.getLiteralValue(arg).(type) {
		case string:
			return "'" + value + "'"
		case jsonNull:
			return "null"
		case bool:
			return strconv.FormatBool(value)
		default:
			return jsString(value)
		}
	}
	if primitive := resolveKindToPrimitive(arg.Kind); primitive != "" {
		return primitive
	}
	switch {
	case ast.IsTypeReferenceNode(arg) || ast.IsExpressionWithTypeArguments(arg):
		_, name := r.calcTypeReferenceTypeName(arg)
		return name
	case ast.IsTypeLiteralNode(arg):
		var members []string
		for _, member := range arg.AsTypeLiteralNode().Members.Nodes {
			if ast.IsPropertySignatureDeclaration(member) {
				optional := ""
				if member.PostfixToken() != nil && member.PostfixToken().Kind == ast.KindQuestionToken {
					optional = "?"
				}
				members = append(members, fmt.Sprintf("\"%s\"%s%s: %s", jsText(member.Name()), optional, r.calcMemberJsDocProperties(member), r.calcTypeName(member.Type())))
			} else if ast.IsIndexSignatureDeclaration(member) {
				parameters := member.Parameters()
				if len(parameters) != 1 {
					throwError("Index signature parameters length != 1", member)
				}
				indexType := parameters[0]
				if indexType.QuestionToken() != nil {
					throwError("Question token has found for an indexSignature declaration", indexType)
				}
				members = append(members, fmt.Sprintf("[\"%s\": %s]: %s", jsText(indexType.Name()), r.calcTypeName(indexType.Type()), r.calcTypeName(member.Type())))
			} else {
				throwError(fmt.Sprintf("Unhandled member kind has found: %d", member.Kind), member)
			}
		}
		return "{" + strings.Join(members, "; ") + "}"
	case ast.IsArrayTypeNode(arg):
		return r.calcTypeName(arg.AsArrayTypeNode().ElementType) + "[]"
	case ast.IsIntersectionTypeNode(arg) || ast.IsUnionTypeNode(arg):
		separator := " & "
		if ast.IsUnionTypeNode(arg) {
			separator = " | "
		}
		var names []string
		for _, member := range unionOrIntersectionTypes(arg) {
			names = append(names, r.calcTypeName(member))
		}
		return strings.Join(names, separator)
	case ast.IsTypeOperatorNode(arg):
		operator := arg.AsTypeOperatorNode()
		sub := r.calcTypeName(operator.Type)
		switch operator.Operator {
		case ast.KindKeyOfKeyword:
			return "keyof " + sub
		case ast.KindReadonlyKeyword:
			return "readonly " + sub
		}
		throwError(fmt.Sprintf("Unknown keyword has found: %d", operator.Operator), arg)
	case ast.IsTypeQueryNode(arg):
		return "typeof " + r.calcRefTypeName(arg.AsTypeQueryNode().ExprName)
	case ast.IsIndexedAccessTypeNode(arg):
		access := arg.AsIndexedAccessTypeNode()
		return fmt.Sprintf("%s[%s]", r.calcTypeName(access.ObjectType), r.calcTypeName(access.IndexType))
	case arg.Kind == ast.KindUnknownKeyword:
		return "unknown"
	case arg.Kind == ast.KindAnyKeyword:
		return "any"
	case arg.Kind == ast.KindNeverKeyword:
		return "never"
	case ast.IsConditionalTypeNode(arg):
		conditional := arg.AsConditionalTypeNode()
		return fmt.Sprintf("%s extends %s ? %s : %s", r.calcTypeName(conditional.CheckType), r.calcTypeName(conditional.ExtendsType), r.calcTypeName(conditional.TrueType), r.calcTypeName(conditional.FalseType))
	case ast.IsParenthesizedTypeNode(arg):
		return "(" + r.calcTypeName(arg.Type()) + ")"
	}
	r.g.warn(warningMessage(fmt.Sprintf("This kind (%d) is unhandled, so the type will be any, and no type conflict checks will made", arg.Kind), arg))
	return "any"
}

// jsText is `(node as Identifier).text`: the text of names and literals, "undefined" for anything else.
func jsText(node *ast.Node) string {
	switch node.Kind {
	case ast.KindIdentifier, ast.KindPrivateIdentifier, ast.KindStringLiteral, ast.KindNumericLiteral, ast.KindNoSubstitutionTemplateLiteral:
		return node.Text()
	}
	return "undefined"
}

func (r *typeResolver) calcTypeReferenceTypeName(node *ast.Node) (*ast.Node, string) {
	typeName := typeReferenceToEntityName(node)
	refTypeName := r.calcRefTypeName(typeName)
	if typeArguments := node.TypeArgumentList(); typeArguments != nil {
		// Add typeArguments for Synthetic nodes (e.g. Record<> in TestClassModel.indexedResponse)
		var names []string
		for _, argument := range typeArguments.Nodes {
			names = append(names, r.calcTypeName(argument))
		}
		return typeName, fmt.Sprintf("%s<%s>", refTypeName, strings.Join(names, ", "))
	}
	return typeName, refTypeName
}

func (r *typeResolver) getReferenceType(node *ast.Node, addToRefTypeMap bool) Obj {
	typeName, name := r.calcTypeReferenceTypeName(node)
	refTypeName := getRefTypeName(name)
	r.g.CheckExpressionUnicity(refTypeName, name)
	r.context = r.typeArgumentsToContext(node, typeName)

	result := r.calcReferenceType(node, typeName, name, refTypeName)
	if addToRefTypeMap {
		r.g.AddReferenceType(result)
	}
	return result
}

func (r *typeResolver) calcReferenceType(node, typeName *ast.Node, name, refTypeName string) Obj {
	g := r.g
	if existing := g.localReferenceTypeCache[name]; existing != nil {
		return existing
	}
	if _, inProgress := g.inProgressTypes[name]; inProgress {
		return r.createCircularDependencyResolver(name, refTypeName)
	}
	g.inProgressTypes[name] = nil
	defer func() {
		if recovered := recover(); recovered != nil {
			g.warn(fmt.Sprintf("There was a problem resolving type of '%s'.", name))
			panic(recovered)
		}
	}()
	declarations := r.getModelTypeDeclarations(typeName)
	if len(declarations) == 0 {
		panic(&MetadataError{Message: fmt.Sprintf("Could not find declarations for type '%s'. This might be a complex generic type that needs special handling.", name)})
	}
	var referenceTypes []Obj
	for _, declaration := range declarations {
		switch {
		case ast.IsTypeAliasDeclaration(declaration):
			var referencer *checker.Type
			if !isSynthetic(node) {
				referencer = r.checker().GetTypeFromTypeNode(node)
			}
			referenceTypes = append(referenceTypes, r.transformReference(declaration, refTypeName, referencer))
		case ast.IsEnumDeclaration(declaration) || ast.IsEnumMember(declaration):
			referenceTypes = append(referenceTypes, r.transformEnum(declaration, refTypeName))
		default:
			referenceTypes = append(referenceTypes, r.getModelReference(declaration, refTypeName))
		}
	}
	referenceType := mergeReferenceTypes(referenceTypes)
	r.addToLocalReferenceTypeCache(name, referenceType)
	return referenceType
}

func (r *typeResolver) addToLocalReferenceTypeCache(name string, refType Obj) {
	for _, fill := range r.g.inProgressTypes[name] {
		fill(refType)
	}
	r.g.localReferenceTypeCache[name] = refType
	delete(r.g.inProgressTypes, name)
}

func (r *typeResolver) getModelReference(modelType *ast.Node, refTypeName string) Obj {
	example := r.getNodeExample(modelType)
	description := r.getNodeDescription(modelType)
	deprecated := hasJSDocTag(modelType, "deprecated") || isDecorator(modelType, "Deprecated")
	title := r.getNodeTitle(modelType)

	if modelType.Name() == nil {
		throwError("Can't get Symbol from anonymous class", modelType)
	}
	c := r.checker()
	t := c.GetTypeAtLocation(modelType.Name())
	if toJSON := c.GetPropertyOfType(t, "toJSON"); toJSON != nil {
		if declaration := toJSON.ValueDeclaration(); declaration != nil && (ast.IsMethodDeclaration(declaration) || ast.IsMethodSignatureDeclaration(declaration)) {
			nodeType := declaration.Type()
			if nodeType == nil {
				implicitType := c.GetReturnTypeOfSignature(c.GetSignatureFromDeclaration(declaration))
				nodeType = r.g.printType(implicitType, nil, nodebuilder.FlagsNoTruncation)
			}
			referenceType := Obj{
				"refName":     refTypeName,
				"dataType":    "refAlias",
				"description": description,
				"type":        r.g.newTypeResolver(nodeType).resolve(),
				"validators":  Obj{},
				"deprecated":  deprecated,
			}
			if example != nil {
				referenceType["example"] = example
			}
			if truthy(title) {
				referenceType["title"] = title
			}
			return referenceType
		}
	}

	properties := r.transformProperties(modelType, nil)
	additionalProperties := r.getModelAdditionalProperties(modelType)
	inherited := r.getModelInheritedProperties(modelType)
	referenceType := Obj{
		"additionalProperties": additionalProperties,
		"dataType":             "refObject",
		"description":          description,
		"properties":           append(inherited, properties...),
		"refName":              refTypeName,
		"deprecated":           deprecated,
	}
	if example != nil {
		referenceType["example"] = example
	}
	if truthy(title) {
		referenceType["title"] = title
	}
	return referenceType
}

// Each replacement can only apply to a name holding one of its trigger characters.
var refTypeNameReplacements = []struct {
	triggers    string
	pattern     *regexp.Regexp
	replacement string
}{
	{"<>", regexp.MustCompile(`<|>`), "_"},
	{" \t\n\r\f\v", regexp.MustCompile(`\s+`), ""},
	{",", regexp.MustCompile(`,`), "."},
	{"'", regexp.MustCompile(`'([^']*)'`), "$1"},
	{"\"", regexp.MustCompile(`"([^"]*)"`), "$1"},
	{"&", regexp.MustCompile(`&`), "-and-"},
	{"|", regexp.MustCompile(`\|`), "-or-"},
	{"[", regexp.MustCompile(`\[\]`), "-Array"},
	{"{}", regexp.MustCompile(`\{|\}`), "_"},
	{":", regexp.MustCompile(`(?i)([a-z_0-9]+\??):([a-z]+)`), "$1-$2"},
	{";", regexp.MustCompile(`;`), "--"},
	{"[", regexp.MustCompile(`(?i)([a-z})\]])\[([a-z]+)\]`), "$1-at-$2"},
}

func isASCII(s string) bool {
	for i := 0; i < len(s); i++ {
		if s[i] >= 0x80 {
			return false
		}
	}
	return true
}

func isSafeRefName(name string) bool {
	for i := 0; i < len(name); i++ {
		c := name[i]
		if !(c >= 'A' && c <= 'Z' || c >= 'a' && c <= 'z' || c >= '0' && c <= '9' || c == '-' || c == '.' || c == '_') {
			return false
		}
	}
	return true
}

var unsafeRefNameCharacter = regexp.MustCompile(`[^A-Za-z0-9\-._]`)

// Generates a name from the original type expression.
// This function is not invertable, so it's possible, that 2 type expressions have the same refTypeName.
var refTypeNames = map[string]string{}

func getRefTypeName(name string) string {
	if formatted, ok := refTypeNames[name]; ok {
		return formatted
	}
	formatted := formatRefTypeName(name)
	refTypeNames[name] = formatted
	return formatted
}

func formatRefTypeName(name string) string {
	for _, r := range refTypeNameReplacements {
		if strings.ContainsAny(name, r.triggers) || (r.triggers[0] == ' ' && !isASCII(name)) {
			name = r.pattern.ReplaceAllString(name, r.replacement)
		}
	}
	if isSafeRefName(name) {
		return strings.ReplaceAll(name, "92_r_92_n", "92_n")
	}
	//Safety fixes to replace all characters which are not accepted by swagger ui
	name = unsafeRefNameCharacter.ReplaceAllStringFunc(name, func(match string) string {
		// charCodeAt: the first UTF-16 unit of the character
		units := utf16.Encode([]rune(match))
		var b strings.Builder
		for i, unit := range units {
			if i > 0 {
				// a character outside the BMP is two units, each replaced on its own
				b.WriteString(fmt.Sprintf("_%d_", unit))
				continue
			}
			b.WriteString(fmt.Sprintf("_%d_", unit))
		}
		return b.String()
	})
	return strings.ReplaceAll(name, "92_r_92_n", "92_n")
}

func (r *typeResolver) createCircularDependencyResolver(refName, refTypeName string) Obj {
	referenceType := Obj{"dataType": "refObject", "refName": refTypeName}
	r.g.inProgressTypes[refName] = append(r.g.inProgressTypes[refName], func(real Obj) {
		for k, v := range real {
			referenceType[k] = v
		}
	})
	return referenceType
}

func nodeIsUsable(node *ast.Node) bool {
	switch node.Kind {
	case ast.KindInterfaceDeclaration, ast.KindClassDeclaration, ast.KindTypeAliasDeclaration, ast.KindEnumDeclaration, ast.KindEnumMember:
		return true
	}
	return false
}

func (r *typeResolver) getModelTypeDeclarations(typeName *ast.Node) []*ast.Node {
	name := rightName(typeName)
	symbol := r.getSymbolAtLocation(typeName)
	if symbol == nil && ast.IsQualifiedName(typeName) {
		if full := r.getSymbolAtLocation(typeName.AsQualifiedName().Left); full != nil {
			symbol = full.Exports()[name]
		}
	}
	if symbol == nil || len(symbol.Declarations()) == 0 {
		return nil
	}
	if symbol.Name() != name && symbol.Name() != "default" {
		name = symbol.Name()
	}
	var modelTypes []*ast.Node
	for _, declaration := range symbol.Declarations() {
		if nodeIsUsable(declaration) && declaration.Name() != nil && nodeText(declaration.Name()) == name {
			modelTypes = append(modelTypes, declaration)
		}
	}
	if len(modelTypes) == 0 {
		return nil
	}
	if len(modelTypes) > 1 {
		var nonLib []*ast.Node
		for _, modelType := range modelTypes {
			if !r.g.program.IsSourceFileDefaultLibrary(ast.GetSourceFileOfNode(modelType).PathKey()) {
				nonLib = append(nonLib, modelType)
			}
		}
		// ES2022 adds cause to Error in a second library declaration.
		if !(len(nonLib) == 0 && name == "Error") {
			modelTypes = nonLib
		}
		modelTypes = r.getDesignatedModels(modelTypes, name)
	}
	return modelTypes
}

func (r *typeResolver) getSymbolAtLocation(node *ast.Node) *ast.Symbol {
	var symbol *ast.Symbol
	if isSynthetic(node) {
		symbol = r.g.idToSymbol[node]
	} else {
		symbol = r.checker().GetSymbolAtLocation(node)
	}
	// resolve alias if it is an alias, otherwise take symbol directly
	if symbol != nil && hasSymbolFlag(symbol, ast.SymbolFlagsAlias) {
		if aliased := r.checker().GetAliasedSymbol(symbol); aliased != nil {
			return aliased
		}
	}
	return symbol
}

func (r *typeResolver) getModelAdditionalProperties(node *ast.Node) any {
	if node.Kind != ast.KindInterfaceDeclaration {
		return nil
	}
	for _, member := range node.Members() {
		if member.Kind == ast.KindIndexSignature {
			indexType := r.sub(member.Parameters()[0].Type(), r.parentNode, r.context, nil, nil).resolve()
			if indexType["dataType"] != "string" {
				throwError("Only string indexers are supported.", r.typeNode)
			}
			return r.sub(member.Type(), r.parentNode, r.context, nil, nil).resolve()
		}
	}
	return nil
}

func (r *typeResolver) typeArgumentsToContext(node, targetEntity *ast.Node) (newContext resolverContext) {
	newContext = resolverContext{}
	declarations, ok := r.tryGetModelTypeDeclarations(targetEntity)
	if !ok || len(declarations) == 0 {
		return newContext
	}
	var typeParameters []*ast.Node
	switch declarations[0].Kind {
	case ast.KindClassDeclaration, ast.KindInterfaceDeclaration, ast.KindTypeAliasDeclaration:
		typeParameters = declarations[0].TypeParameters()
	}
	var typeArguments []*ast.Node
	if list := node.TypeArgumentList(); list != nil {
		typeArguments = list.Nodes
	}
	for index, typeParameter := range typeParameters {
		var resolvedType *ast.Node
		name := ""
		var typeArgument *ast.Node
		if index < len(typeArguments) {
			typeArgument = typeArguments[index]
		}
		if typeArgument != nil && ast.IsTypeReferenceNode(typeArgument) && ast.IsIdentifier(typeArgument.AsTypeReferenceNode().TypeName) {
			if entry, ok := r.context[typeArgument.AsTypeReferenceNode().TypeName.Text()]; ok {
				resolvedType, name = entry.typeNode, entry.name
			}
		}
		if resolvedType == nil {
			switch {
			case typeArgument != nil:
				resolvedType = typeArgument
			case typeParameter.AsTypeParameterDeclaration().DefaultType != nil:
				resolvedType = typeParameter.AsTypeParameterDeclaration().DefaultType
			default:
				throwError(fmt.Sprintf("Could not find a value for type parameter %s", typeParameter.Name().Text()), node)
			}
		}
		if name == "" {
			name = r.calcTypeName(resolvedType)
		}
		newContext[typeParameter.Name().Text()] = contextEntry{typeNode: resolvedType, name: name}
	}
	return newContext
}

func (r *typeResolver) tryGetModelTypeDeclarations(entity *ast.Node) (declarations []*ast.Node, ok bool) {
	defer func() {
		if recover() != nil {
			declarations, ok = nil, false
		}
	}()
	return r.getModelTypeDeclarations(entity), true
}

func (r *typeResolver) getModelInheritedProperties(modelType *ast.Node) []any {
	properties := []any{}
	clauses := heritageClauses(modelType)
	if clauses == nil {
		return properties
	}
	for _, clause := range clauses.Nodes {
		for _, t := range clause.AsHeritageClause().Types.Nodes {
			baseEntityName := typeReferenceToEntityName(t)
			resetContext := r.context
			r.context = r.typeArgumentsToContext(t, baseEntityName)
			referenceType := r.getReferenceType(t, false)
			switch referenceType["dataType"] {
			case "refAlias":
				inner := referenceType
				for inner["dataType"] == "refAlias" {
					inner = inner["type"].(Obj)
				}
				if inner["dataType"] == "refObject" || inner["dataType"] == "nestedObjectLiteral" {
					if items, ok := inner["properties"].([]any); ok {
						properties = append(properties, items...)
					}
				}
			case "refObject":
				if items, ok := referenceType["properties"].([]any); ok {
					properties = append(properties, items...)
				}
			}
			r.context = resetContext
		}
	}
	return properties
}

func heritageClauses(node *ast.Node) *ast.NodeList {
	switch node.Kind {
	case ast.KindClassDeclaration:
		return node.AsClassDeclaration().HeritageClauses
	case ast.KindClassExpression:
		return node.AsClassExpression().HeritageClauses
	case ast.KindInterfaceDeclaration:
		return node.AsInterfaceDeclaration().HeritageClauses
	}
	return nil
}

func (r *typeResolver) getNodeDescription(node *ast.Node) any {
	symbol := r.getSymbolAtLocation(node.Name())
	if symbol == nil {
		return nil
	}
	return r.g.getSymbolDocumentation(symbol)
}

func (r *typeResolver) getNodeFormat(node *ast.Node) any {
	if format, ok := getJSDocComment(node, "format"); ok {
		return format
	}
	return nil
}

func (r *typeResolver) getNodeTitle(node *ast.Node) any {
	if title, ok := getJSDocComment(node, "title"); ok {
		return title
	}
	return nil
}

func (r *typeResolver) getPropertyName(prop *ast.Node) string {
	name := prop.Name()
	if ast.IsComputedPropertyName(name) && ast.IsPropertyAccessExpression(name.Expression()) {
		if value := r.g.getInitializerValue(name.Expression(), ""); truthy(value) {
			return jsString(value)
		}
	}
	if ast.IsIdentifier(name) || ast.IsStringLiteral(name) || ast.IsNumericLiteral(name) || ast.IsPrivateIdentifier(name) {
		return name.Text()
	}
	return "undefined"
}

func (r *typeResolver) getNodeExample(node *ast.Node) any {
	if example, ok := getJSDocComment(node, "example"); ok {
		value, _ := safeFromJSON(example)
		return value
	}
	return r.g.getNodeFirstDecoratorValue(node, "Example")
}

func (r *typeResolver) getNodeExtension(node *ast.Node) []any {
	extensions := r.g.getExtensions(decoratorsNamed(node, "Extension"))
	if comments, ok := getJSDocComments(node, "extension"); ok {
		extensions = append(extensions, getExtensionsFromJSDocComments(comments)...)
	}
	return extensions
}

// getDefault is TypeResolver.getDefault: the value of a `@default` tag, read as JSON with JavaScript-style quotes.
func getDefault(node *ast.Node) any {
	defaultText, ok := getJSDocComment(node, "default")
	if !ok || defaultText == "undefined" {
		return nil
	}
	var formatted strings.Builder
	var quote rune
	runes := []rune(defaultText)
	for i := 0; i < len(runes); i++ {
		ch := runes[i]
		if quote != 0 {
			switch {
			case ch == quote:
				formatted.WriteRune('"')
				quote = 0
			case ch == '"':
				formatted.WriteString(`\"`)
			case ch == '\\':
				i++
				if i < len(runes) {
					next := runes[i]
					if strings.ContainsRune("ntrbf\\\"", next) {
						formatted.WriteRune('\\')
						formatted.WriteRune(next)
					} else if next != 'v' && next != '0' {
						//\v, \0 characters are not compatible with JSON
						formatted.WriteRune(next)
					}
				} else {
					formatted.WriteRune(ch)
				}
			default:
				formatted.WriteRune(ch)
			}
			continue
		}
		switch {
		case ch == '"' || ch == '\'' || ch == '`':
			quote = ch
			formatted.WriteRune('"')
		case ch == '/' && i+1 < len(runes) && runes[i+1] == '/':
			i += 2
			for i < len(runes) && runes[i] != '\n' {
				i++
			}
		default:
			formatted.WriteRune(ch)
		}
	}
	var value any
	if err := json.Unmarshal([]byte(formatted.String()), &value); err != nil {
		panic(&MetadataError{Message: fmt.Sprintf("JSON could not parse default str: \"%s\", preformatted: \"%s\"\nmessage: \"%s\"", defaultText, formatted.String(), err.Error())})
	}
	return fromJSON(value)
}

// ---- transformer/primitiveTransformer.ts ----

func resolveKindToPrimitive(kind ast.Kind) string {
	switch kind {
	case ast.KindNumberKeyword:
		return "number"
	case ast.KindStringKeyword:
		return "string"
	case ast.KindBooleanKeyword:
		return "boolean"
	case ast.KindVoidKeyword:
		return "void"
	case ast.KindUndefinedKeyword:
		return "undefined"
	case ast.KindNullKeyword:
		return "null"
	}
	// `null` and literal keywords printed by the checker are literal type nodes.
	return ""
}

func transformPrimitive(defaultNumberType string, typeNode *ast.Node, parentTagNames []string, hasParent bool) Obj {
	kind := typeNode.Kind
	if ast.IsLiteralTypeNode(typeNode) && typeNode.AsLiteralTypeNode().Literal.Kind == ast.KindNullKeyword {
		kind = ast.KindNullKeyword
	}
	switch resolveKindToPrimitive(kind) {
	case "number":
		for _, name := range parentTagNames {
			switch name {
			case "isInt":
				return Obj{"dataType": "integer"}
			case "isLong":
				return Obj{"dataType": "long"}
			case "isFloat":
				return Obj{"dataType": "float"}
			case "isDouble":
				return Obj{"dataType": "double"}
			}
		}
		return Obj{"dataType": defaultNumberType}
	case "string", "boolean", "void", "undefined":
		return Obj{"dataType": resolveKindToPrimitive(kind)}
	case "null":
		return Obj{"dataType": "enum", "enums": []any{Null}}
	}
	return nil
}

// ---- transformer/dateTransformer.ts ----

func transformDate(parentNode *ast.Node) Obj {
	if parentNode == nil {
		return Obj{"dataType": "datetime"}
	}
	for _, name := range getJSDocTagNames(parentNode, false) {
		switch name {
		case "isDate":
			return Obj{"dataType": "date"}
		case "isDateTime":
			return Obj{"dataType": "datetime"}
		}
	}
	return Obj{"dataType": "datetime"}
}

// ---- transformer/enumTransformer.ts ----

func (r *typeResolver) transformEnum(declaration *ast.Node, enumName string) Obj {
	c := r.checker()
	if ast.IsEnumDeclaration(declaration) {
		enums, varnames := []any{}, []any{}
		for _, member := range declaration.AsEnumDeclaration().Members.Nodes {
			if value := c.GetConstantValue(member); value != nil {
				enums = append(enums, constantValue(value))
			}
			varnames = append(varnames, nodeText(member.Name()))
		}
		result := Obj{
			"dataType":     "refEnum",
			"description":  r.getNodeDescription(declaration),
			"example":      r.getNodeExample(declaration),
			"enums":        enums,
			"enumVarnames": varnames,
			"refName":      enumName,
			"deprecated":   hasJSDocTag(declaration, "deprecated"),
		}
		if title := r.getNodeTitle(declaration); truthy(title) {
			result["title"] = title
		}
		return result
	}
	return Obj{
		"dataType":     "refEnum",
		"refName":      enumName,
		"enums":        []any{constantValue(c.GetConstantValue(declaration))},
		"enumVarnames": []any{nodeText(declaration.Name())},
		"deprecated":   hasJSDocTag(declaration, "deprecated"),
	}
}

func constantValue(value any) any {
	if s, ok := value.(string); ok {
		return s
	}
	if number, ok := toFloat(value); ok {
		if math.IsNaN(number) || math.IsInf(number, 0) {
			return Null
		}
		return number
	}
	return value
}

func mergeEnums(first, second Obj) Obj {
	description := joinDescriptions(first["description"], second["description"])
	result := Obj{
		"dataType":     "refEnum",
		"description":  description,
		"enums":        concatOrEither(first["enums"], second["enums"]),
		"enumVarnames": concatOrEither(first["enumVarnames"], second["enumVarnames"]),
		"refName":      first["refName"],
		"deprecated":   first["deprecated"] == true || second["deprecated"] == true,
		"example":      firstDefined(first["example"], second["example"]),
	}
	if title := firstTruthy(first["title"], second["title"]); truthy(title) {
		result["title"] = title
	}
	return result
}

func concatOrEither(first, second any) any {
	a, aok := first.([]any)
	b, bok := second.([]any)
	switch {
	case aok && bok:
		return append(append([]any{}, a...), b...)
	case aok:
		return a
	}
	return second
}

func joinDescriptions(first, second any) any {
	if truthy(first) {
		if truthy(second) {
			return jsString(first) + "\n" + jsString(second)
		}
		return first
	}
	return second
}

// ---- transformer/referenceTransformer.ts ----

func mergeReferenceTypes(referenceTypes []Obj) Obj {
	if len(referenceTypes) == 0 {
		panic(&MetadataError{Message: "Cannot merge empty reference types array"})
	}
	if len(referenceTypes) == 1 {
		return referenceTypes[0]
	}
	allOf := func(dataType string) bool {
		for _, t := range referenceTypes {
			if t["dataType"] != dataType {
				return false
			}
		}
		return true
	}
	if allOf("refEnum") {
		merged := mergeEnums(referenceTypes[0], referenceTypes[1])
		for _, t := range referenceTypes[2:] {
			merged = mergeEnums(merged, t)
		}
		return merged
	}
	if allOf("refObject") {
		merged := mergeRefObj(referenceTypes[0], referenceTypes[1])
		for _, t := range referenceTypes[2:] {
			merged = mergeRefObj(merged, t)
		}
		return merged
	}
	panic(&MetadataError{Message: "These resolved type merge rules are not defined: " + jsonText(referenceTypes)})
}

func mergeRefObj(first, second Obj) Obj {
	firstProperties, _ := first["properties"].([]any)
	secondProperties, _ := second["properties"].([]any)
	properties := append([]any{}, firstProperties...)
	for _, property := range secondProperties {
		name := property.(Obj)["name"]
		unique := true
		for _, existing := range firstProperties {
			if existing.(Obj)["name"] == name {
				unique = false
			}
		}
		if unique {
			properties = append(properties, property)
		}
	}
	var additional any
	switch {
	case first["additionalProperties"] != nil && second["additionalProperties"] != nil:
		additional = Obj{"dataType": "union", "types": []any{first["additionalProperties"], second["additionalProperties"]}}
	case first["additionalProperties"] != nil:
		additional = first["additionalProperties"]
	default:
		additional = second["additionalProperties"]
	}
	result := Obj{
		"dataType":             "refObject",
		"description":          joinDescriptions(first["description"], second["description"]),
		"properties":           properties,
		"additionalProperties": additional,
		"refName":              first["refName"],
		"deprecated":           first["deprecated"] == true || second["deprecated"] == true,
		"example":              firstDefined(first["example"], second["example"]),
	}
	if title := firstTruthy(first["title"], second["title"]); truthy(title) {
		result["title"] = title
	}
	return result
}

func (r *typeResolver) transformReference(declaration *ast.Node, refTypeName string, referencer *checker.Type) Obj {
	example := r.getNodeExample(declaration)
	title := r.getNodeTitle(declaration)
	innerReferencer := r.referencer
	if innerReferencer == nil {
		innerReferencer = referencer
	}
	referenceType := Obj{
		"dataType":    "refAlias",
		"default":     getDefault(declaration),
		"description": r.getNodeDescription(declaration),
		"refName":     refTypeName,
		"format":      r.getNodeFormat(declaration),
		"type":        r.sub(declaration.Type(), declaration, r.context, innerReferencer, nil).resolve(),
		"validators":  r.g.getPropertyValidators(declaration),
		"deprecated":  hasJSDocTag(declaration, "deprecated"),
	}
	if example != nil {
		referenceType["example"] = example
	}
	if truthy(title) {
		referenceType["title"] = title
	}
	return referenceType
}

// ---- transformer/propertyTransformer.ts ----

func (r *typeResolver) transformProperties(node *ast.Node, overrideToken *ast.Node) []any {
	isIgnored := func(member *ast.Node) bool {
		return hasJSDocTag(member, "ignore") || member.Flags&ast.NodeFlagsThisNodeHasError != 0
	}
	properties := []any{}
	if ast.IsInterfaceDeclaration(node) {
		for _, member := range node.Members() {
			if !isIgnored(member) && ast.IsPropertySignatureDeclaration(member) {
				properties = append(properties, r.propertyFromSignature(member, overrideToken))
			}
		}
		return properties
	}
	var declarations []*ast.Node
	for _, member := range node.Members() {
		if !isIgnored(member) && ast.IsPropertyDeclaration(member) && !hasModifier(member, ast.KindStaticKeyword) && hasPublicModifier(member) {
			declarations = append(declarations, member)
		}
	}
	for _, member := range node.Members() {
		if ast.IsConstructorDeclaration(member) {
			for _, parameter := range member.Parameters() {
				if isAccessibleParameter(parameter) {
					declarations = append(declarations, parameter)
				}
			}
			break
		}
	}
	for _, declaration := range declarations {
		properties = append(properties, r.propertyFromDeclaration(declaration, overrideToken))
	}
	return properties
}

func modifierKinds(node *ast.Node) []ast.Kind {
	modifiers := node.Modifiers()
	if modifiers == nil {
		return nil
	}
	var kinds []ast.Kind
	for _, modifier := range modifiers.Nodes {
		if !ast.IsDecorator(modifier) {
			kinds = append(kinds, modifier.Kind)
		}
	}
	return kinds
}

func hasModifier(node *ast.Node, kind ast.Kind) bool {
	for _, k := range modifierKinds(node) {
		if k == kind {
			return true
		}
	}
	return false
}

func hasPublicModifier(node *ast.Node) bool {
	return !hasModifier(node, ast.KindProtectedKeyword) && !hasModifier(node, ast.KindPrivateKeyword)
}

func isAccessibleParameter(node *ast.Node) bool {
	if len(modifierKinds(node)) == 0 {
		return false
	}
	// public || public readonly
	if hasModifier(node, ast.KindPublicKeyword) {
		return true
	}
	// readonly, not private readonly, not public readonly
	return hasModifier(node, ast.KindReadonlyKeyword) && hasPublicModifier(node)
}

func applyOverrideToken(required bool, overrideToken *ast.Node) bool {
	if overrideToken != nil && overrideToken.Kind == ast.KindMinusToken {
		return true
	}
	if overrideToken != nil && overrideToken.Kind == ast.KindQuestionToken {
		return false
	}
	return required
}

func isOptionalMember(node *ast.Node) bool {
	if node.Kind == ast.KindParameter {
		return node.QuestionToken() != nil
	}
	token := node.PostfixToken()
	return token != nil && token.Kind == ast.KindQuestionToken
}

func (r *typeResolver) propertyFromSignature(signature *ast.Node, overrideToken *ast.Node) Obj {
	if signature.Type() == nil {
		panic(&MetadataError{Message: "No valid type found for property declaration."})
	}
	return Obj{
		"default":     getDefault(signature),
		"description": r.getNodeDescription(signature),
		"example":     r.getNodeExample(signature),
		"format":      r.getNodeFormat(signature),
		"name":        r.getPropertyName(signature),
		"required":    applyOverrideToken(!isOptionalMember(signature), overrideToken),
		"type":        r.sub(signature.Type(), signature.Type().Parent, r.context, nil, nil).resolve(),
		"validators":  r.g.getPropertyValidators(signature),
		"deprecated":  hasJSDocTag(signature, "deprecated"),
		"title":       r.getNodeTitle(signature),
		"extensions":  r.getNodeExtension(signature),
	}
}

func (r *typeResolver) propertyFromDeclaration(declaration *ast.Node, overrideToken *ast.Node) Obj {
	typeNode := declaration.Type()
	tsType := r.checker().GetTypeAtLocation(declaration)
	if typeNode == nil {
		// Type is from initializer
		typeNode = r.g.printType(tsType, nil, nodebuilder.FlagsNoTruncation)
	}
	t := r.sub(typeNode, declaration, r.context, tsType, nil).resolve()
	required := applyOverrideToken(!isOptionalMember(declaration) && declaration.Initializer() == nil, overrideToken)
	def := r.g.getInitializerValue(declaration.Initializer(), "")
	if def == nil {
		def = getDefault(declaration)
	}
	return Obj{
		"default":     def,
		"description": r.getNodeDescription(declaration),
		"example":     r.getNodeExample(declaration),
		"format":      r.getNodeFormat(declaration),
		"name":        r.getPropertyName(declaration),
		"required":    required,
		"type":        t,
		"validators":  r.g.getPropertyValidators(declaration),
		// class properties and constructor parameters may be deprecated either via jsdoc annotation or decorator
		"deprecated": hasJSDocTag(declaration, "deprecated") || isDecorator(declaration, "Deprecated"),
		"title":      r.getNodeTitle(declaration),
		"extensions": r.getNodeExtension(declaration),
	}
}
