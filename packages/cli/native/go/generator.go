package main

import (
	"encoding/json"
	"fmt"
	"path"
	"regexp"
	"strconv"
	"strings"

	"github.com/microsoft/TypeScript/tsc/internal/ast"
	"github.com/microsoft/TypeScript/tsc/internal/checker"
	"github.com/microsoft/TypeScript/tsc/internal/compiler"
	"github.com/microsoft/TypeScript/tsc/internal/nodebuilder"
)

type declarationPosition struct {
	FileName string `json:"fileName"`
	Pos      int    `json:"pos"`
}

// generator is metadataGenerator.ts: the state of one metadata generation.
type generator struct {
	program           *compiler.Program
	checker           *checker.Checker
	defaultNumberType string
	ignorePaths       []string
	rootSecurity      []any

	referenceTypeMap      *referenceTypeMap
	modelDefinitionPosMap map[string][]declarationPosition
	expressionOrigNameMap map[string]string
	warnings              []string
	checks                []check

	// typeResolver.ts module state
	localReferenceTypeCache map[string]Obj
	inProgressTypes         map[string][]func(Obj)
	// Printed identifiers, and the symbols they name: the checker cannot look up nodes it printed.
	idToSymbol map[*ast.IdentifierNode]*ast.Symbol
}

func (g *generator) init() {
	g.referenceTypeMap = newReferenceTypeMap()
	g.modelDefinitionPosMap = map[string][]declarationPosition{}
	g.expressionOrigNameMap = map[string]string{}
	g.localReferenceTypeCache = map[string]Obj{}
	g.inProgressTypes = map[string][]func(Obj){}
	g.idToSymbol = map[*ast.IdentifierNode]*ast.Symbol{}
}

func (g *generator) warn(message string) {
	g.warnings = append(g.warnings, message)
}

func (g *generator) Generate(sourceFiles []*ast.SourceFile) Obj {
	g.init()
	var controllerNodes []*ast.Node
	for _, sf := range sourceFiles {
		if g.isIgnored(string(sf.FileName())) {
			continue
		}
		for _, node := range sf.Statements.Nodes {
			if ast.IsClassDeclaration(node) && len(decoratorsNamed(node, "Route")) > 0 {
				controllerNodes = append(controllerNodes, node)
			}
		}
	}
	if len(controllerNodes) == 0 {
		panic(&MetadataError{Message: "no controllers found, check tsoa configuration"})
	}
	controllers := []any{}
	for _, node := range controllerNodes {
		controller := g.newControllerGenerator(node)
		if controller.isValid() {
			controllers = append(controllers, controller.generate())
		}
	}
	return Obj{"controllers": controllers}
}

func (g *generator) isIgnored(fileName string) bool {
	for _, pattern := range g.ignorePaths {
		if minimatch(fileName, pattern) {
			return true
		}
	}
	return false
}

func (g *generator) AddReferenceType(referenceType Obj) {
	name, _ := referenceType["refName"].(string)
	if name == "" {
		panic(fmt.Errorf("no reference type name found"))
	}
	g.referenceTypeMap.set(name, referenceType)
}

func (g *generator) CheckModelUnicity(refName string, positions []declarationPosition) {
	original, ok := g.modelDefinitionPosMap[refName]
	if !ok {
		g.modelDefinitionPosMap[refName] = positions
		return
	}
	same := len(original) == len(positions)
	for _, position := range positions {
		found := false
		for _, o := range original {
			if o == position {
				found = true
			}
		}
		same = same && found
	}
	if !same {
		panic(fmt.Errorf("Found 2 different model definitions for model %s: orig: %s, act: %s", refName, jsonText(original), jsonText(positions)))
	}
}

func (g *generator) CheckExpressionUnicity(formattedRefName, refName string) {
	original, ok := g.expressionOrigNameMap[formattedRefName]
	if !ok {
		g.expressionOrigNameMap[formattedRefName] = refName
		return
	}
	if original != refName {
		panic(fmt.Errorf("Found 2 different type expressions for formatted name \"%s\": orig: \"%s\", act: \"%s\"", formattedRefName, original, refName))
	}
}

// printType is `typeToTypeNode`; the identifiers it prints keep their symbols.
func (g *generator) printType(t *checker.Type, enclosingDeclaration *ast.Node, flags nodebuilder.Flags) *ast.Node {
	return g.checker.TypeToTypeNode(t, enclosingDeclaration, flags, g.idToSymbol)
}

// ---- controllerGenerator.ts ----

type controllerGenerator struct {
	g               *generator
	node            *ast.Node
	path            *string
	tags            any
	security        []any
	isHidden        bool
	commonResponses []any
	produces        []any
}

func (g *generator) newControllerGenerator(node *ast.Node) *controllerGenerator {
	c := &controllerGenerator{g: g, node: node}
	c.path = c.getPath()
	c.tags = c.getTags()
	c.security = c.getSecurity()
	c.isHidden = c.getIsHidden()
	c.commonResponses = c.getCommonResponses()
	c.produces = c.getProduces()
	return c
}

func (c *controllerGenerator) isValid() bool { return c.path != nil }

func (c *controllerGenerator) className() string {
	if name := c.node.Name(); name != nil {
		return name.Text()
	}
	return ""
}

func (c *controllerGenerator) generate() Obj {
	if c.node.Parent == nil {
		panic(&MetadataError{Message: "Controller node doesn't have a valid parent source file."})
	}
	if c.node.Name() == nil {
		panic(&MetadataError{Message: "Controller node doesn't have a valid name."})
	}
	path := ""
	if c.path != nil {
		path = *c.path
	}
	return Obj{
		"location": string(ast.GetSourceFileOfNode(c.node).FileName()),
		"methods":  c.buildMethods(),
		"name":     c.className(),
		"path":     path,
		"produces": nilIfNoItems(c.produces),
	}
}

func (c *controllerGenerator) buildMethods() []any {
	methods := []any{}
	for _, member := range c.node.Members() {
		if !ast.IsMethodDeclaration(member) {
			continue
		}
		method := c.g.newMethodGenerator(member, c.commonResponses, c.path, c.tags, c.security, c.isHidden)
		if method.isValid() {
			methods = append(methods, method.generate())
		}
	}
	return methods
}

func (c *controllerGenerator) getPath() *string {
	decorators := decoratorsNamed(c.node, "Route")
	if len(decorators) == 0 {
		return nil
	}
	if len(decorators) > 1 {
		panic(&MetadataError{Message: fmt.Sprintf("Only one Route decorator allowed in '%s' class.", c.className())})
	}
	path := ""
	if arguments := decorators[0].Parent.Arguments(); len(arguments) > 0 {
		path = literalText(arguments[0])
	}
	return &path
}

func literalText(node *ast.Node) string {
	switch node.Kind {
	case ast.KindStringLiteral, ast.KindNoSubstitutionTemplateLiteral, ast.KindNumericLiteral, ast.KindIdentifier:
		return node.Text()
	}
	return "undefined"
}

func (c *controllerGenerator) getCommonResponses() []any {
	responses := []any{}
	for _, decorator := range decoratorsNamed(c.node, "Response") {
		expression := decorator.Parent
		values := c.g.getDecoratorValues(decorator)
		name, description, example := valueAt(values, 0), valueAt(values, 1), valueAt(values, 2)
		if !truthy(name) {
			panic(&MetadataError{Message: "Controller's responses should have an explicit name."})
		}
		var examples any
		if example != nil {
			examples = []any{example}
		}
		var schema any
		if typeArguments := expression.TypeArguments(); len(typeArguments) > 0 && !c.isHidden {
			schema = c.g.newTypeResolver(typeArguments[0]).resolve()
		}
		responses = append(responses, Obj{
			"description": orEmpty(description),
			"examples":    examples,
			"name":        name,
			"schema":      schema,
			"headers":     c.g.getHeaderType(expression.TypeArguments(), 1),
		})
	}
	return responses
}

func (c *controllerGenerator) getTags() any {
	decorators := decoratorsNamed(c.node, "Tags")
	if len(decorators) == 0 {
		return nil
	}
	if len(decorators) > 1 {
		panic(&MetadataError{Message: fmt.Sprintf("Only one Tags decorator allowed in '%s' class.", c.className())})
	}
	tags := []any{}
	for _, argument := range decorators[0].Parent.Arguments() {
		tags = append(tags, literalValueOrUndefined(argument))
	}
	return tags
}

// literalValueOrUndefined is `(node as any).text`: the text of literals and identifiers, undefined otherwise.
func literalValueOrUndefined(node *ast.Node) any {
	switch node.Kind {
	case ast.KindStringLiteral, ast.KindNoSubstitutionTemplateLiteral, ast.KindNumericLiteral, ast.KindIdentifier:
		return node.Text()
	}
	return nil
}

func (c *controllerGenerator) getSecurity() []any {
	noSecurity := decoratorsNamed(c.node, "NoSecurity")
	security := decoratorsNamed(c.node, "Security")
	if len(noSecurity) > 0 && len(security) > 0 {
		panic(&MetadataError{Message: fmt.Sprintf("NoSecurity decorator cannot be used in conjunction with Security decorator in '%s' class.", c.className())})
	}
	if len(noSecurity) > 0 {
		return []any{}
	}
	if len(security) == 0 {
		return c.g.rootSecurity
	}
	out := []any{}
	for _, decorator := range security {
		out = append(out, c.g.getSecurities(decorator))
	}
	return out
}

func (c *controllerGenerator) getIsHidden() bool {
	hidden := decoratorsNamed(c.node, "Hidden")
	if len(hidden) > 1 {
		panic(&MetadataError{Message: fmt.Sprintf("Only one Hidden decorator allowed in '%s' class.", c.className())})
	}
	return len(hidden) == 1
}

func (c *controllerGenerator) getProduces() []any {
	return c.g.getProduces(c.node)
}

func nilIfNoItems(items []any) any {
	if len(items) == 0 {
		return nil
	}
	return items
}

func orEmpty(value any) any {
	if truthy(value) {
		return value
	}
	return ""
}

// ---- methodGenerator.ts ----

type methodGenerator struct {
	g               *generator
	node            *ast.Node
	commonResponses []any
	parentPath      *string
	parentTags      any
	parentSecurity  []any
	isParentHidden  bool

	method   string
	path     *string
	produces any
	consumes any
}

var httpMethods = []string{"options", "get", "post", "put", "patch", "delete", "head"}

func (g *generator) newMethodGenerator(node *ast.Node, commonResponses []any, parentPath *string, parentTags any, parentSecurity []any, isParentHidden bool) *methodGenerator {
	m := &methodGenerator{g: g, node: node, commonResponses: commonResponses, parentPath: parentPath, parentTags: parentTags, parentSecurity: parentSecurity, isParentHidden: isParentHidden}
	m.processMethodDecorators()
	return m
}

func (m *methodGenerator) isValid() bool { return m.method != "" && m.path != nil }

func (m *methodGenerator) currentLocation() string {
	controller := ""
	if name := m.node.Parent.Name(); name != nil {
		controller = name.Text()
	}
	return fmt.Sprintf("%s.%s", controller, m.node.Name().Text())
}

func (m *methodGenerator) processMethodDecorators() {
	pathDecorators := getDecorators(m.node, func(identifier *ast.Node) bool {
		return containsString(httpMethods, strings.ToLower(identifier.Text()))
	})
	if len(pathDecorators) == 0 {
		return
	}
	if len(pathDecorators) > 1 {
		names := make([]string, len(pathDecorators))
		for i, d := range pathDecorators {
			names[i] = d.Text()
		}
		panic(&MetadataError{Message: fmt.Sprintf("Only one path decorator in '%s' method, Found: %s", m.currentLocation(), strings.Join(names, ", "))})
	}
	decorator := pathDecorators[0]
	m.method = strings.ToLower(decorator.Text())
	path := m.g.getPath(decorator)
	m.path = &path
	if produces := m.g.getProduces(m.node); len(produces) > 0 {
		m.produces = produces
	}
	m.consumes = m.getConsumes()
}

func (m *methodGenerator) getConsumes() any {
	decorators := decoratorsNamed(m.node, "Consumes")
	if len(decorators) == 0 {
		return nil
	}
	if len(decorators) > 1 {
		names := make([]string, len(decorators))
		for i, d := range decorators {
			names[i] = d.Text()
		}
		panic(&MetadataError{Message: fmt.Sprintf("Only one Consumes decorator in '%s' method, Found: %s", m.currentLocation(), strings.Join(names, ", "))})
	}
	return valueAt(m.g.getDecoratorValues(decorators[0]), 0)
}

func (m *methodGenerator) generate() Obj {
	if !m.isValid() {
		panic(&MetadataError{Message: "This isn't a valid a controller method."})
	}
	nodeType := m.node.Type()
	if nodeType == nil {
		c := m.g.checker
		implicitType := c.GetReturnTypeOfSignature(c.GetSignatureFromDeclaration(m.node))
		nodeType = m.g.printType(implicitType, nil, nodebuilder.FlagsNoTruncation)
	}
	typ := m.g.newTypeResolver(nodeType).resolve()
	responses := append(append([]any{}, m.commonResponses...), m.getMethodResponses()...)
	successResponse, successStatus := m.getMethodSuccessResponse(typ)
	responses = append(responses, successResponse)
	parameters := m.buildParameters()
	for _, parameter := range parameters {
		if parameter.(Obj)["in"] == "res" {
			responses = append(responses, parameter)
		}
	}

	var consumes any = m.consumes
	if consumes == nil {
		for _, parameter := range parameters {
			p := parameter.(Obj)
			if p["in"] == "body" && p["type"].(Obj)["dataType"] == "binary" {
				consumes = "application/octet-stream"
			}
		}
	}
	var description any
	if text, ok := getJSDocDescription(m.node); ok {
		description = text
	}
	var summary any
	if text, ok := getJSDocComment(m.node, "summary"); ok {
		summary = text
	}
	return Obj{
		"extensions":    m.getExtensions(),
		"deprecated":    m.getIsDeprecated(),
		"description":   description,
		"isHidden":      m.getIsHidden(),
		"method":        m.method,
		"name":          m.node.Name().Text(),
		"operationId":   m.getOperationId(),
		"parameters":    parameters,
		"path":          *m.path,
		"produces":      m.produces,
		"consumes":      consumes,
		"responses":     responses,
		"successStatus": successStatus,
		"security":      m.getSecurity(),
		"summary":       summary,
		"tags":          m.getTags(),
		"type":          typ,
	}
}

func (m *methodGenerator) buildParameters() []any {
	parentPath := ""
	if m.parentPath != nil {
		parentPath = *m.parentPath
	}
	fullPath := nodePathJoin(parentPath, *m.path)
	parameters := []any{}
	for _, p := range m.node.Parameters() {
		parameters = append(parameters, m.generateParameter(p, fullPath)...)
	}
	m.validateBodyParameters(parameters)
	m.validateQueryParameters(parameters)
	return parameters
}

func (m *methodGenerator) generateParameter(p *ast.Node, fullPath string) (parameters []any) {
	defer func() {
		if r := recover(); r != nil {
			message := fmt.Sprint(r)
			if metadataError, ok := r.(*MetadataError); ok {
				message = metadataError.Message
			} else if err, ok := r.(error); ok {
				message = err.Error()
			}
			panic(&MetadataError{Message: fmt.Sprintf("%s \n in '%s'", message, m.currentLocation())})
		}
	}()
	return m.g.newParameterGenerator(p, m.method, fullPath, m.currentLocation()).generate()
}

func countIn(parameters []any, in string) int {
	count := 0
	for _, p := range parameters {
		if p.(Obj)["in"] == in {
			count++
		}
	}
	return count
}

func (m *methodGenerator) validateBodyParameters(parameters []any) {
	body, bodyProps, formData := countIn(parameters, "body"), countIn(parameters, "body-prop"), countIn(parameters, "formData")
	if body > 1 {
		panic(&MetadataError{Message: fmt.Sprintf("Only one body parameter allowed in '%s' method.", m.currentLocation())})
	}
	if body > 0 && bodyProps > 0 {
		panic(&MetadataError{Message: fmt.Sprintf("Choose either during @Body or @BodyProp in '%s' method.", m.currentLocation())})
	}
	if body+bodyProps > 0 && formData > 0 {
		panic(fmt.Errorf("@Body or @BodyProp cannot be used with @FormField, @UploadedFile, or @UploadedFiles in '%s' method.", m.currentLocation()))
	}
}

func (m *methodGenerator) validateQueryParameters(parameters []any) {
	query, queries := countIn(parameters, "query"), countIn(parameters, "queries")
	if queries > 1 {
		panic(&MetadataError{Message: fmt.Sprintf("Only one queries parameter allowed in '%s' method.", m.currentLocation())})
	}
	if queries > 0 && query > 0 {
		panic(&MetadataError{Message: fmt.Sprintf("Choose either during @Query or @Queries in '%s' method.", m.currentLocation())})
	}
}

func (m *methodGenerator) getExtensions() []any {
	decorators := decoratorsNamed(m.node, "Extension")
	if len(decorators) == 0 {
		return []any{}
	}
	return m.g.getExtensions(decorators)
}

func (m *methodGenerator) getMethodResponses() []any {
	responseExamplesByName := map[string][]any{}
	responses := []any{}
	for _, decorator := range decoratorsNamed(m.node, "Response") {
		values := m.g.getDecoratorValues(decorator)
		name, description, example, produces := valueAt(values, 0), valueAt(values, 1), valueAt(values, 2), valueAt(values, 3)
		key := jsString(name)
		if example != nil {
			responseExamplesByName[key] = append(responseExamplesByName[key], example)
		}
		var examples any
		if items, ok := responseExamplesByName[key]; ok {
			examples = append([]any{}, items...)
		}
		responseName := name
		if !truthy(responseName) {
			responseName = "200"
		}
		responses = append(responses, Obj{
			"description": orEmpty(description),
			"examples":    examples,
			"name":        responseName,
			"produces":    producesAdapter(produces),
			"schema":      m.getSchemaFromDecorator(decorator, 0),
			"headers":     m.getHeadersFromDecorator(decorator, 1),
		})
	}
	return responses
}

func (m *methodGenerator) getMethodSuccessResponse(typ Obj) (Obj, any) {
	decorators := decoratorsNamed(m.node, "SuccessResponse")
	examples, labels := m.getMethodSuccessExamples()
	if len(decorators) == 0 {
		returnsDescription, ok := getJSDocComment(m.node, "returns")
		if !ok || returnsDescription == "" {
			returnsDescription = "Ok"
		}
		description, name := returnsDescription, "200"
		if isVoidType(typ) {
			description, name = "No content", "204"
		}
		return Obj{"description": description, "examples": examples, "exampleLabels": labels, "name": name, "produces": m.produces, "schema": typ}, nil
	}
	if len(decorators) > 1 {
		panic(&MetadataError{Message: fmt.Sprintf("Only one SuccessResponse decorator allowed in '%s' method.", m.currentLocation())})
	}
	values := m.g.getDecoratorValues(decorators[0])
	name, description, produces := valueAt(values, 0), valueAt(values, 1), valueAt(values, 2)
	headers := m.getHeadersFromDecorator(decorators[0], 0)
	responseName := name
	if !truthy(responseName) {
		responseName = "200"
	}
	var status any
	if text, ok := name.(string); ok && regexp.MustCompile(`^\d+$`).MatchString(text) {
		value, _ := strconv.Atoi(text)
		status = float64(value)
	} else if number, ok := name.(float64); ok && number == float64(int(number)) && number >= 0 {
		status = number
	}
	return Obj{
		"description":   orEmpty(description),
		"examples":      examples,
		"exampleLabels": labels,
		"name":          responseName,
		"produces":      producesAdapter(produces),
		"schema":        typ,
		"headers":       headers,
	}, status
}

func (m *methodGenerator) getHeadersFromDecorator(decorator *ast.Node, index int) any {
	if decorator.Parent == nil || !ast.IsCallExpression(decorator.Parent) {
		return nil
	}
	return m.g.getHeaderType(decorator.Parent.TypeArguments(), index)
}

func (m *methodGenerator) getSchemaFromDecorator(decorator *ast.Node, index int) any {
	if decorator.Parent == nil || !ast.IsCallExpression(decorator.Parent) {
		return nil
	}
	typeArguments := decorator.Parent.TypeArguments()
	if len(typeArguments) == 0 {
		return nil
	}
	if index >= len(typeArguments) {
		panic(fmt.Errorf("Cannot read properties of undefined"))
	}
	return m.g.newTypeResolver(typeArguments[index]).resolve()
}

func (m *methodGenerator) getMethodSuccessExamples() (any, any) {
	decorators := decoratorsNamed(m.node, "Example")
	if len(decorators) == 0 {
		return nil, nil
	}
	examples, labels := []any{}, []any{}
	for _, decorator := range decorators {
		values := m.g.getDecoratorValues(decorator)
		examples = append(examples, valueAt(values, 0))
		labels = append(labels, valueAt(values, 1))
	}
	return examples, labels
}

func (m *methodGenerator) getIsDeprecated() bool {
	if hasJSDocTag(m.node, "deprecated") {
		return true
	}
	decorators := decoratorsNamed(m.node, "Deprecated")
	if len(decorators) > 1 {
		panic(&MetadataError{Message: fmt.Sprintf("Only one Deprecated decorator allowed in '%s' method.", m.currentLocation())})
	}
	return len(decorators) == 1
}

func (m *methodGenerator) getOperationId() any {
	decorators := decoratorsNamed(m.node, "OperationId")
	if len(decorators) == 0 {
		return nil
	}
	if len(decorators) > 1 {
		panic(&MetadataError{Message: fmt.Sprintf("Only one OperationId decorator allowed in '%s' method.", m.currentLocation())})
	}
	return valueAt(m.g.getDecoratorValues(decorators[0]), 0)
}

func (m *methodGenerator) getTags() any {
	decorators := decoratorsNamed(m.node, "Tags")
	if len(decorators) == 0 {
		return m.parentTags
	}
	if len(decorators) > 1 {
		panic(&MetadataError{Message: fmt.Sprintf("Only one Tags decorator allowed in '%s' method.", m.currentLocation())})
	}
	tags := m.g.getDecoratorValues(decorators[0])
	if parentTags, ok := m.parentTags.([]any); ok {
		tags = append(tags, parentTags...)
	}
	return tags
}

func (m *methodGenerator) getSecurity() []any {
	noSecurity := decoratorsNamed(m.node, "NoSecurity")
	security := decoratorsNamed(m.node, "Security")
	if len(noSecurity) > 1 {
		panic(&MetadataError{Message: fmt.Sprintf("Only one NoSecurity decorator allowed in '%s' method.", m.currentLocation())})
	}
	if len(noSecurity) > 0 && len(security) > 0 {
		panic(&MetadataError{Message: fmt.Sprintf("NoSecurity decorator cannot be used in conjunction with Security decorator in '%s' method.", m.currentLocation())})
	}
	if len(noSecurity) > 0 {
		return []any{}
	}
	if len(security) == 0 {
		if m.parentSecurity == nil {
			return []any{}
		}
		return m.parentSecurity
	}
	out := []any{}
	for _, decorator := range security {
		out = append(out, m.g.getSecurities(decorator))
	}
	return out
}

func (m *methodGenerator) getIsHidden() bool {
	hidden := decoratorsNamed(m.node, "Hidden")
	if len(hidden) == 0 {
		return m.isParentHidden
	}
	if m.isParentHidden {
		panic(&MetadataError{Message: fmt.Sprintf("Hidden decorator cannot be set on '%s' it is already defined on the controller", m.currentLocation())})
	}
	if len(hidden) > 1 {
		panic(&MetadataError{Message: fmt.Sprintf("Only one Hidden decorator allowed in '%s' method.", m.currentLocation())})
	}
	return true
}

func producesAdapter(produces any) any {
	switch p := produces.(type) {
	case []any:
		return p
	case string:
		return []any{p}
	}
	return nil
}

// ---- headerTypeHelpers.ts ----

func (g *generator) getHeaderType(typeArguments []*ast.Node, index int) any {
	if index >= len(typeArguments) || typeArguments[index] == nil {
		return nil
	}
	candidate := g.newTypeResolver(typeArguments[index]).resolve()
	if candidate == nil {
		return nil
	}
	if dataType := candidate["dataType"]; dataType == "nestedObjectLiteral" || dataType == "refObject" {
		return candidate
	}
	throwError(fmt.Sprintf("Unable to parse Header Type %s", nodeText(typeArguments[index])), typeArguments[index])
	return nil
}

func jsonText(value any) string {
	out, _ := json.Marshal(value)
	return string(out)
}

// nodePathJoin is Node's posix `path.join`: it keeps a trailing separator and gives "." for an empty path.
func nodePathJoin(parts ...string) string {
	var nonEmpty []string
	for _, part := range parts {
		if part != "" {
			nonEmpty = append(nonEmpty, part)
		}
	}
	if len(nonEmpty) == 0 {
		return "."
	}
	joined := path.Clean(strings.Join(nonEmpty, "/"))
	if strings.HasSuffix(nonEmpty[len(nonEmpty)-1], "/") && joined != "/" {
		joined += "/"
	}
	return joined
}
