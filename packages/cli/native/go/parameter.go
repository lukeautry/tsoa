package main

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/microsoft/TypeScript/tsc/internal/ast"
	"github.com/microsoft/TypeScript/tsc/internal/checker"
	"github.com/microsoft/TypeScript/tsc/internal/nodebuilder"
)

// ---- parameterGenerator.ts ----

type parameterGenerator struct {
	g              *generator
	parameter      *ast.Node
	method         string
	path           string
	methodLocation string
}

var parameterDecorators = []string{"header", "query", "queries", "path", "body", "bodyprop", "request", "requestprop", "res", "inject", "uploadedfile", "uploadedfiles", "formfield"}

func (g *generator) newParameterGenerator(parameter *ast.Node, method, path, methodLocation string) *parameterGenerator {
	return &parameterGenerator{g: g, parameter: parameter, method: method, path: path, methodLocation: methodLocation}
}

func (p *parameterGenerator) generate() []any {
	name, _ := getNodeFirstDecoratorName(p.parameter, func(identifier *ast.Node) bool {
		return containsString(parameterDecorators, strings.ToLower(identifier.Text()))
	})
	parameter := p.parameter
	switch name {
	case "Request":
		return []any{p.getRequestParameter(parameter)}
	case "RequestProp":
		return []any{p.getRequestPropParameter(parameter)}
	case "Body":
		return []any{p.getBodyParameter(parameter)}
	case "BodyProp":
		return []any{p.getBodyPropParameter(parameter)}
	case "FormField":
		return []any{p.getFormFieldParameter(parameter)}
	case "Header":
		return []any{p.getHeaderParameter(parameter)}
	case "Query":
		return p.getQueryParameters(parameter)
	case "Queries":
		return []any{p.getQueriesParameters(parameter)}
	case "Path":
		return []any{p.getPathParameter(parameter)}
	case "Res":
		return p.getResParameters(parameter)
	case "Inject":
		return []any{}
	case "UploadedFile":
		return []any{p.getUploadedFileParameter(parameter, false)}
	case "UploadedFiles":
		return []any{p.getUploadedFileParameter(parameter, true)}
	}
	return []any{p.getPathParameter(parameter)}
}

func parameterName(parameter *ast.Node) string {
	return parameter.Name().Text()
}

// isRequired is `!parameter.questionToken && !parameter.initializer`.
func isRequired(parameter *ast.Node) bool {
	return parameter.QuestionToken() == nil && parameter.Initializer() == nil
}

func firstTruthy(value any, fallback any) any {
	if truthy(value) {
		return value
	}
	return fallback
}

func firstDefined(value any, fallback any) any {
	if value == nil || value == Null {
		return fallback
	}
	return value
}

func (p *parameterGenerator) getRequestParameter(parameter *ast.Node) Obj {
	name := parameterName(parameter)
	return Obj{
		"description":   p.getParameterDescription(parameter),
		"in":            "request",
		"name":          name,
		"parameterName": name,
		"required":      isRequired(parameter),
		"type":          Obj{"dataType": "object"},
		"validators":    p.g.getParameterValidators(p.parameter, name),
		"deprecated":    p.getParameterDeprecation(parameter),
	}
}

func (p *parameterGenerator) getRequestPropParameter(parameter *ast.Node) Obj {
	name := parameterName(parameter)
	typ := p.getValidatedType(parameter)
	examples, labels := p.getParameterExample(parameter, name)
	return Obj{
		"default":       p.g.getInitializerValue(parameter.Initializer(), typ["dataType"].(string)),
		"description":   p.getParameterDescription(parameter),
		"example":       examples,
		"exampleLabels": labels,
		"in":            "request-prop",
		"name":          firstTruthy(p.g.getNodeFirstDecoratorValue(p.parameter, "ParameterProp"), name),
		"parameterName": name,
		"required":      isRequired(parameter),
		"type":          typ,
		"validators":    p.g.getParameterValidators(p.parameter, name),
		"deprecated":    p.getParameterDeprecation(parameter),
	}
}

func (p *parameterGenerator) extractTsoaResponse(typeNode *ast.Node) *ast.Node {
	if typeNode == nil || !ast.IsTypeReferenceNode(typeNode) {
		return nil
	}
	if nodeText(typeNode.AsTypeReferenceNode().TypeName) == "TsoaResponse" {
		return typeNode
	}
	alias := p.g.checker.GetTypeAtLocation(typeNode).Alias()
	if alias == nil || alias.Symbol() == nil || len(alias.Symbol().Declarations()) == 0 {
		return nil
	}
	declaration := alias.Symbol().Declarations()[0]
	if !ast.IsTypeAliasDeclaration(declaration) || declaration.Type() == nil || !ast.IsTypeReferenceNode(declaration.Type()) {
		return nil
	}
	if nodeText(declaration.Type().AsTypeReferenceNode().TypeName) == "TsoaResponse" {
		return declaration.Type()
	}
	return nil
}

func (p *parameterGenerator) getResParameters(parameter *ast.Node) []any {
	name := parameterName(parameter)
	decorator := firstTruthy(p.g.getNodeFirstDecoratorValue(p.parameter, "Res"), name)
	if !truthy(decorator) {
		throwError("Could not find Decorator", parameter)
	}
	typeNode := p.extractTsoaResponse(parameter.Type())
	if typeNode == nil {
		throwError("@Res() requires the type to be TsoaResponse<HTTPStatusCode, ResBody>", parameter)
	}
	typeArguments := typeNode.TypeArguments()
	if len(typeArguments) == 0 || typeArguments[0] == nil {
		throwError("@Res() requires the type to be TsoaResponse<HTTPStatusCode, ResBody>", parameter)
	}
	statusArgument := typeArguments[0]
	var bodyArgument *ast.Node
	if len(typeArguments) > 1 {
		bodyArgument = typeArguments[1]
	}
	statusArguments := []*ast.Node{statusArgument}
	if ast.IsUnionTypeNode(statusArgument) {
		statusArguments = statusArgument.AsUnionTypeNode().Types.Nodes
	}
	headers := p.g.getHeaderType(typeArguments, 2)
	parameters := []any{}
	for _, argument := range statusArguments {
		statusType := p.g.checker.GetTypeAtLocation(argument)
		if statusType.Flags()&checker.TypeFlagsNumberLiteral == 0 {
			throwError("@Res() requires the type to be TsoaResponse<HTTPStatusCode, ResBody>", parameter)
		}
		status := jsString(jsonNumberValue(statusType.AsLiteralType().Value()))
		typ := p.g.newTypeResolverWithParent(bodyArgument, typeNode).resolve()
		examples, labels := p.getParameterExample(parameter, name)
		var produces any
		if headerType, ok := headers.(Obj); ok {
			produces = getProducesFromResHeaders(headerType)
		}
		parameters = append(parameters, Obj{
			"description":   orEmpty(p.getParameterDescription(parameter)),
			"in":            "res",
			"name":          status,
			"produces":      produces,
			"parameterName": name,
			"examples":      examples,
			"required":      true,
			"type":          typ,
			"exampleLabels": labels,
			"schema":        typ,
			"validators":    Obj{},
			"headers":       headers,
			"deprecated":    p.getParameterDeprecation(parameter),
		})
	}
	return parameters
}

func getProducesFromResHeaders(headers Obj) any {
	properties, _ := headers["properties"].([]any)
	for _, property := range properties {
		prop := property.(Obj)
		if strings.ToLower(prop["name"].(string)) == "content-type" && prop["type"].(Obj)["dataType"] == "enum" {
			return prop["type"].(Obj)["enums"]
		}
	}
	return nil
}

func (p *parameterGenerator) getBodyPropParameter(parameter *ast.Node) Obj {
	name := parameterName(parameter)
	typ := p.getValidatedType(parameter)
	if !p.supportBodyMethod(p.method) {
		panic(&MetadataError{Message: fmt.Sprintf("@BodyProp('%s') Can't support in %s method.", name, strings.ToUpper(p.method))})
	}
	examples, labels := p.getParameterExample(parameter, name)
	return Obj{
		"default":       p.g.getInitializerValue(parameter.Initializer(), typ["dataType"].(string)),
		"description":   p.getParameterDescription(parameter),
		"example":       examples,
		"exampleLabels": labels,
		"in":            "body-prop",
		"name":          firstTruthy(p.g.getNodeFirstDecoratorValue(p.parameter, "BodyProp"), name),
		"parameterName": name,
		"required":      isRequired(parameter),
		"type":          typ,
		"validators":    p.g.getParameterValidators(p.parameter, name),
		"deprecated":    p.getParameterDeprecation(parameter),
	}
}

func (p *parameterGenerator) getBodyParameter(parameter *ast.Node) Obj {
	name := parameterName(parameter)
	var typ Obj
	if p.isReadableType(parameter) {
		typ = Obj{"dataType": "binary"}
	} else {
		typ = p.getValidatedType(parameter)
	}
	if !p.supportBodyMethod(p.method) {
		panic(&MetadataError{Message: fmt.Sprintf("@Body('%s') Can't support in %s method.", name, strings.ToUpper(p.method))})
	}
	examples, labels := p.getParameterExample(parameter, name)
	return Obj{
		"description":   p.getParameterDescription(parameter),
		"in":            "body",
		"name":          name,
		"example":       examples,
		"exampleLabels": labels,
		"parameterName": name,
		"required":      isRequired(parameter),
		"type":          typ,
		"validators":    p.g.getParameterValidators(p.parameter, name),
		"deprecated":    p.getParameterDeprecation(parameter),
	}
}

func (p *parameterGenerator) getHeaderParameter(parameter *ast.Node) Obj {
	name := parameterName(parameter)
	typ := p.getValidatedType(parameter)
	if !p.supportPathDataType(typ) {
		panic(&MetadataError{Message: fmt.Sprintf("@Header('%s') Can't support '%s' type.", name, typ["dataType"])})
	}
	examples, labels := p.getParameterExample(parameter, name)
	return Obj{
		"default":       p.g.getInitializerValue(parameter.Initializer(), typ["dataType"].(string)),
		"description":   p.getParameterDescription(parameter),
		"example":       examples,
		"exampleLabels": labels,
		"in":            "header",
		"name":          firstTruthy(p.g.getNodeFirstDecoratorValue(p.parameter, "Header"), name),
		"parameterName": name,
		"required":      isRequired(parameter),
		"type":          typ,
		"validators":    p.g.getParameterValidators(p.parameter, name),
		"deprecated":    p.getParameterDeprecation(parameter),
	}
}

func (p *parameterGenerator) getUploadedFileParameter(parameter *ast.Node, isArray bool) Obj {
	name := parameterName(parameter)
	elementType := Obj{"dataType": "file"}
	typ := elementType
	if isArray {
		typ = Obj{"dataType": "array", "elementType": elementType}
	}
	if !p.supportPathDataType(elementType) {
		throwError(fmt.Sprintf("Parameter '%s:%s' can't be passed as an uploaded file(s) parameter in '%s'.", name, typ["dataType"], strings.ToUpper(p.method)), parameter)
	}
	decoratorName := "UploadedFile"
	if isArray {
		decoratorName = "UploadedFiles"
	}
	return Obj{
		"description":   p.getParameterDescription(parameter),
		"in":            "formData",
		"name":          firstDefined(p.g.getNodeFirstDecoratorValue(p.parameter, decoratorName), name),
		"required":      isRequired(parameter),
		"type":          typ,
		"parameterName": name,
		"validators":    p.g.getParameterValidators(p.parameter, name),
		"deprecated":    p.getParameterDeprecation(parameter),
	}
}

func (p *parameterGenerator) getFormFieldParameter(parameter *ast.Node) Obj {
	name := parameterName(parameter)
	typ := p.getValidatedType(parameter)
	if !p.supportPathDataType(typ) {
		throwError(fmt.Sprintf("Parameter '%s:%s' can't be passed as form field parameter in '%s'.", name, typ["dataType"], strings.ToUpper(p.method)), parameter)
	}
	return Obj{
		"description":   p.getParameterDescription(parameter),
		"in":            "formData",
		"name":          firstDefined(p.g.getNodeFirstDecoratorValue(p.parameter, "FormField"), name),
		"required":      isRequired(parameter),
		"type":          typ,
		"parameterName": name,
		"validators":    p.g.getParameterValidators(p.parameter, name),
		"deprecated":    p.getParameterDeprecation(parameter),
	}
}

func (p *parameterGenerator) getQueriesParameters(parameter *ast.Node) Obj {
	name := parameterName(parameter)
	typ := p.getValidatedType(parameter)
	queriesType := p.resolveQueriesType(typ, name, parameter)
	properties, _ := queriesType["properties"].([]any)
	for _, property := range properties {
		p.validateQueriesProperties(property.(Obj), name)
	}
	examples, labels := p.getParameterExample(parameter, name)
	return Obj{
		"description":   p.getParameterDescription(parameter),
		"in":            "queries",
		"name":          name,
		"example":       examples,
		"exampleLabels": labels,
		"parameterName": name,
		"required":      isRequired(parameter),
		"type":          queriesType,
		"validators":    p.g.getParameterValidators(p.parameter, name),
		"deprecated":    p.getParameterDeprecation(parameter),
	}
}

func isObjectLike(t Obj) bool {
	return t["dataType"] == "refObject" || t["dataType"] == "nestedObjectLiteral"
}

func (p *parameterGenerator) resolveQueriesType(typ Obj, name string, parameter *ast.Node) Obj {
	if isObjectLike(typ) {
		return typ
	}
	if typ["dataType"] == "refAlias" {
		unwrapped := typ["type"].(Obj)
		for unwrapped["dataType"] == "refAlias" {
			unwrapped = unwrapped["type"].(Obj)
		}
		if isObjectLike(unwrapped) {
			return unwrapped
		}
	}
	// Types the resolver does not give as objects, such as Zod's z.infer, are resolved from their printed type.
	typeNode := parameter.Type()
	if typeNode == nil {
		typeNode = p.g.printType(p.g.checker.GetTypeAtLocation(parameter), nil, nodebuilder.FlagsNoTruncation)
	}
	if typeNode != nil && ast.IsTypeReferenceNode(typeNode) {
		resolved, failure := p.tryResolveQueriesType(typeNode, parameter)
		if failure != "" {
			p.g.warn(fmt.Sprintf("Failed to resolve complex type for @Queries('%s'): %s", name, failure))
		} else if isObjectLike(resolved) {
			return resolved
		}
	}
	panic(&MetadataError{Message: fmt.Sprintf("@Queries('%s') only support 'refObject' or 'nestedObjectLiteral' types. If you want only one query parameter, please use the '@Query' decorator.", name)})
}

func (p *parameterGenerator) tryResolveQueriesType(typeNode, parameter *ast.Node) (resolved Obj, failure string) {
	defer func() {
		if r := recover(); r != nil {
			failure = fmt.Sprint(r)
			if metadataError, ok := r.(*MetadataError); ok {
				failure = metadataError.Message
			}
		}
	}()
	actual := p.g.typeOfTypeNode(typeNode)
	printed := p.g.printType(actual, nil, nodebuilder.FlagsNoTruncation)
	return p.g.newTypeResolverWithParent(printed, parameter).resolve(), ""
}

func (p *parameterGenerator) validateQueriesProperties(property Obj, parentName string) {
	propertyType := property["type"].(Obj)
	name := property["name"].(string)
	switch propertyType["dataType"] {
	case "array":
		elementType := propertyType["elementType"].(Obj)
		if elementType["dataType"] == "nestedObjectLiteral" {
			nested, _ := elementType["properties"].([]any)
			for _, item := range nested {
				p.validateQueriesProperties(item.(Obj), fmt.Sprintf("%s.%s[]", parentName, name))
			}
		} else if !p.supportPathDataType(elementType) {
			panic(&MetadataError{Message: fmt.Sprintf("@Queries('%s') property '%s' can't support array '%s' type.", parentName, name, elementType["dataType"])})
		}
	case "nestedObjectLiteral":
		nested, _ := propertyType["properties"].([]any)
		for _, item := range nested {
			p.validateQueriesProperties(item.(Obj), fmt.Sprintf("%s.%s", parentName, name))
		}
	default:
		if !p.supportPathDataType(propertyType) {
			panic(&MetadataError{Message: fmt.Sprintf("@Queries('%s') nested property '%s' Can't support '%s' type.", parentName, name, propertyType["dataType"])})
		}
	}
}

func (p *parameterGenerator) getQueryParameters(parameter *ast.Node) []any {
	name := parameterName(parameter)
	typ := p.getValidatedType(parameter)
	examples, labels := p.getParameterExample(parameter, name)
	common := Obj{
		"default":       p.g.getInitializerValue(parameter.Initializer(), typ["dataType"].(string)),
		"description":   p.getParameterDescription(parameter),
		"example":       examples,
		"exampleLabels": labels,
		"in":            "query",
		"name":          firstTruthy(p.g.getNodeFirstDecoratorValue(p.parameter, "Query"), name),
		"parameterName": name,
		"required":      isRequired(parameter),
		"validators":    p.g.getParameterValidators(p.parameter, name),
		"deprecated":    p.getParameterDeprecation(parameter),
	}
	if p.getQueryParameterIsHidden(parameter) {
		if common["required"] == true {
			panic(&MetadataError{Message: fmt.Sprintf("@Query('%s') Can't support @Hidden because it is required (does not allow undefined and does not have a default value).", name)})
		}
		return []any{}
	}
	if typ["dataType"] == "array" {
		elementType := typ["elementType"].(Obj)
		if !p.supportPathDataType(elementType) {
			panic(&MetadataError{Message: fmt.Sprintf("@Query('%s') Can't support array '%s' type.", name, elementType["dataType"])})
		}
		common["collectionFormat"] = "multi"
		common["type"] = typ
		return []any{common}
	}
	if !p.supportPathDataType(typ) {
		panic(&MetadataError{Message: fmt.Sprintf("@Query('%s') Can't support '%s' type.", name, typ["dataType"])})
	}
	common["type"] = typ
	return []any{common}
}

func (p *parameterGenerator) getPathParameter(parameter *ast.Node) Obj {
	name := parameterName(parameter)
	typ := p.getValidatedType(parameter)
	pathName := jsString(firstTruthy(p.g.getNodeFirstDecoratorValue(p.parameter, "Path"), name))
	if !p.supportPathDataType(typ) {
		panic(&MetadataError{Message: fmt.Sprintf("@Path('%s') Can't support '%s' type.", name, typ["dataType"])})
	}
	if !strings.Contains(p.path, "{"+pathName+"}") && !strings.Contains(p.path, ":"+pathName) {
		panic(&MetadataError{Message: fmt.Sprintf("@Path('%s') Can't match in URL: '%s'.", name, p.path)})
	}
	examples, labels := p.getParameterExample(parameter, name)
	return Obj{
		"default":       p.g.getInitializerValue(parameter.Initializer(), typ["dataType"].(string)),
		"description":   p.getParameterDescription(parameter),
		"example":       examples,
		"exampleLabels": labels,
		"in":            "path",
		"name":          pathName,
		"parameterName": name,
		"required":      true,
		"type":          typ,
		"validators":    p.g.getParameterValidators(p.parameter, name),
		"deprecated":    p.getParameterDeprecation(parameter),
	}
}

func (p *parameterGenerator) getParameterDescription(node *ast.Node) any {
	symbol := p.g.checker.GetSymbolAtLocation(node.Name())
	if symbol == nil {
		return nil
	}
	return p.g.getSymbolDocumentation(symbol)
}

func (p *parameterGenerator) getParameterDeprecation(node *ast.Node) bool {
	return hasJSDocTag(node, "deprecated") || isDecorator(node, "Deprecated")
}

func (p *parameterGenerator) getParameterExample(node *ast.Node, name string) (any, any) {
	labels := []any{}
	var texts []string
	for _, tag := range getJSDocTags(node.Parent, func(tag *ast.Node) bool { return true }) {
		comment, ok := commentToString(tagComment(tag))
		isExample := tagName(tag) == "example" && tagComment(tag) != nil && ok && strings.HasPrefix(comment, name)
		if !isExample {
			continue
		}
		first := strings.Split(comment, " ")[0]
		if strings.Index(first, ".") > 0 {
			labels = append(labels, strings.Join(strings.Split(first, ".")[1:], "."))
		} else {
			labels = append(labels, nil)
		}
		texts = append(texts, strings.ReplaceAll(strings.Replace(comment, first, "", 1), "\r", ""))
	}
	if len(texts) == 0 {
		return nil, nil
	}
	examples := make([]any, len(texts))
	for i, text := range texts {
		var value any
		if err := json.Unmarshal([]byte(text), &value); err != nil {
			// JavaScript reports the error: its message is JSON.parse's.
			p.g.checks = append(p.g.checks, check{Kind: "json", Value: text, Suffix: fmt.Sprintf(" \n in '%s'", p.methodLocation)})
			panic(&MetadataError{Message: "JSON format is incorrect: " + jsonParseMessage(text, err)})
		}
		examples[i] = fromJSON(value)
	}
	return examples, labels
}

// jsonParseMessage stands in for the message of JSON.parse's SyntaxError.
func jsonParseMessage(text string, err error) string {
	return err.Error()
}

func (p *parameterGenerator) supportBodyMethod(method string) bool {
	return containsString([]string{"post", "put", "patch", "delete"}, strings.ToLower(method))
}

var supportedPathDataTypes = []string{"string", "integer", "long", "float", "double", "date", "datetime", "buffer", "boolean", "enum", "refEnum", "file", "any"}

func (p *parameterGenerator) supportPathDataType(t Obj) bool {
	dataType, _ := t["dataType"].(string)
	if containsString(supportedPathDataTypes, dataType) {
		return true
	}
	if dataType == "refAlias" {
		return p.supportPathDataType(t["type"].(Obj))
	}
	if dataType == "union" {
		for _, member := range t["types"].([]any) {
			m := member.(Obj)
			if m["dataType"] != "undefined" && !p.supportPathDataType(m) {
				return false
			}
		}
		return true
	}
	return false
}

func (p *parameterGenerator) isReadableType(parameter *ast.Node) bool {
	typeNode := parameter.Type()
	if typeNode == nil || !ast.IsTypeReferenceNode(typeNode) {
		return false
	}
	name := typeNode.AsTypeReferenceNode().TypeName
	return ast.IsIdentifier(name) && name.Text() == "Readable"
}

func (p *parameterGenerator) getValidatedType(parameter *ast.Node) Obj {
	typeNode := parameter.Type()
	if typeNode == nil {
		typeNode = p.g.printType(p.g.checker.GetTypeAtLocation(parameter), nil, nodebuilder.FlagsNoTruncation)
	}
	return p.g.newTypeResolverWithParent(typeNode, parameter).resolve()
}

func (p *parameterGenerator) getQueryParameterIsHidden(parameter *ast.Node) bool {
	hidden := decoratorsNamed(parameter, "Hidden")
	if len(hidden) > 1 {
		panic(&MetadataError{Message: fmt.Sprintf("Only one Hidden decorator allowed on @Query('%s').", parameterName(parameter))})
	}
	return len(hidden) == 1
}

// jsonNumberValue turns a literal type's value into a metadata number.
func jsonNumberValue(value any) any {
	switch v := value.(type) {
	case float64:
		return jsonNumber(v)
	case int:
		return float64(v)
	}
	if number, ok := toFloat(value); ok {
		return jsonNumber(number)
	}
	return value
}
