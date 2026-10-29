package main

import (
	"fmt"
	"math"
	"strconv"
	"strings"

	"github.com/microsoft/TypeScript/tsc/internal/ast"
	"github.com/microsoft/TypeScript/tsc/internal/checker"
)

// check is a validation the JavaScript side performs with JavaScript's own semantics, in the order they were found:
// `@pattern` sources are JavaScript regular expressions and `@minDate`/`@maxDate` use the `validator` package.
type check struct {
	Kind     string `json:"kind"`
	Name     string `json:"name,omitempty"`
	Value    string `json:"value"`
	Location string `json:"location,omitempty"`
	Suffix   string `json:"suffix,omitempty"`
}

// ---- initializer-value.ts ----

func hasInitializer(node *ast.Node) bool {
	switch node.Kind {
	case ast.KindVariableDeclaration, ast.KindParameter, ast.KindBindingElement, ast.KindPropertyDeclaration, ast.KindPropertySignature,
		ast.KindPropertyAssignment, ast.KindEnumMember:
		return node.Initializer() != nil
	}
	return false
}

func extractInitializer(declaration *ast.Node) *ast.Node {
	if declaration != nil && hasInitializer(declaration) {
		return declaration.Initializer()
	}
	return nil
}

func extractImportSpecifier(symbol *ast.Symbol) *ast.Node {
	if symbol == nil || len(symbol.Declarations()) == 0 || !ast.IsImportSpecifier(symbol.Declarations()[0]) {
		return nil
	}
	return symbol.Declarations()[0]
}

// jsNumber is JavaScript's Number() of a numeric literal's text.
func jsNumber(text string) any {
	cleaned := strings.ReplaceAll(text, "_", "")
	if value, err := strconv.ParseFloat(cleaned, 64); err == nil {
		return jsonNumber(value)
	}
	if value, err := strconv.ParseInt(cleaned, 0, 64); err == nil {
		return jsonNumber(float64(value))
	}
	return nil
}

func jsonNumber(value float64) any {
	if math.IsNaN(value) || math.IsInf(value, 0) {
		// JSON has no NaN or Infinity; JSON.stringify writes null.
		return Null
	}
	return value
}

// getInitializerValue is the value an initializer evaluates to, as far as it is a literal: nil is `undefined`.
func (g *generator) getInitializerValue(initializer *ast.Node, dataType string) any {
	if initializer == nil {
		return nil
	}
	c := g.checker
	switch initializer.Kind {
	case ast.KindArrayLiteralExpression:
		values := []any{}
		for _, element := range initializer.AsArrayLiteralExpression().Elements.Nodes {
			if ast.IsSpreadElement(element) {
				spread := g.getInitializerValue(element.Expression(), "")
				if text, isString := spread.(string); isString {
					// A string spreads into its characters.
					for _, character := range text {
						values = append(values, string(character))
					}
					continue
				}
				items, ok := spread.([]any)
				if !ok {
					panic(fmt.Errorf("%s is not iterable", jsTypeOf(spread)))
				}
				values = append(values, items...)
			} else {
				values = append(values, g.getInitializerValue(element, ""))
			}
		}
		return values
	case ast.KindStringLiteral, ast.KindNoSubstitutionTemplateLiteral:
		return initializer.Text()
	case ast.KindTrueKeyword:
		return true
	case ast.KindFalseKeyword:
		return false
	case ast.KindPrefixUnaryExpression:
		prefix := initializer.AsPrefixUnaryExpression()
		switch prefix.Operator {
		case ast.KindPlusToken:
			return jsNumber(prefix.Operand.Text())
		case ast.KindMinusToken:
			return jsNumber("-" + prefix.Operand.Text())
		}
		panic(fmt.Errorf("Unsupport prefix operator token: %d", prefix.Operator))
	case ast.KindNumericLiteral:
		return jsNumber(initializer.Text())
	case ast.KindNewExpression:
		newExpression := initializer.AsNewExpression()
		if ast.IsIdentifier(newExpression.Expression) && newExpression.Expression.Text() == "Date" {
			// The date is computed on the JavaScript side, with JavaScript's Date.
			args := []any{}
			if newExpression.Arguments != nil {
				for _, argument := range newExpression.Arguments.Nodes {
					args = append(args, g.getInitializerValue(argument, ""))
				}
			}
			return Obj{"$tsoaDate": args, "dateOnly": dataType == "date"}
		}
		return nil
	case ast.KindNullKeyword:
		return Null
	case ast.KindObjectLiteralExpression:
		nested := Obj{}
		for _, property := range initializer.AsObjectLiteralExpression().Properties.Nodes {
			if ast.IsSpreadAssignment(property) {
				spread := g.getInitializerValue(property.Expression(), "")
				if truthy(spread) {
					switch value := spread.(type) {
					case Obj:
						for k, v := range value {
							nested[k] = v
						}
					case []any:
						// An array is an object too: it spreads its indexes.
						for i, v := range value {
							nested[strconv.Itoa(i)] = v
						}
					default:
						panic(fmt.Errorf("Spread types may only be created from object types."))
					}
				}
			} else if name := property.Name(); name != nil {
				var value any
				if ast.IsPropertyAssignment(property) {
					value = g.getInitializerValue(property.Initializer(), "")
				}
				nested[name.Text()] = value
			}
		}
		return nested
	case ast.KindImportSpecifier:
		importSymbol := c.GetSymbolAtLocation(initializer.Name())
		if importSymbol == nil {
			return nil
		}
		aliased := c.GetAliasedSymbol(importSymbol)
		var declaration *ast.Node
		if declarations := aliased.Declarations(); len(declarations) > 0 {
			declaration = declarations[0]
		}
		return g.getInitializerValue(extractInitializer(declaration), "")
	default:
		var symbol *ast.Symbol
		if !isSynthetic(initializer) {
			symbol = c.GetSymbolAtLocation(initializer)
		}
		var next *ast.Node
		if symbol != nil {
			next = extractInitializer(symbol.ValueDeclaration())
		}
		if next == nil {
			next = extractImportSpecifier(symbol)
		}
		return g.getInitializerValue(next, "")
	}
}

func jsTypeOf(value any) string {
	switch value.(type) {
	case nil:
		return "undefined"
	case string:
		return "string"
	case bool:
		return "boolean"
	case float64:
		return "number"
	}
	return "object"
}

func isNonUndefinedInitializerValue(value any) bool {
	if items, ok := value.([]any); ok {
		for _, item := range items {
			if !isNonUndefinedInitializerValue(item) {
				return false
			}
		}
		return true
	}
	return value != nil
}

// ---- decoratorUtils.ts ----

func (g *generator) getDecoratorValues(decorator *ast.Node) []any {
	expression := decorator.Parent
	if expression == nil || !ast.IsCallExpression(expression) {
		return []any{}
	}
	arguments := expression.Arguments()
	values := make([]any, len(arguments))
	for i, argument := range arguments {
		values[i] = g.getInitializerValue(argument, "")
	}
	return values
}

func valueAt(values []any, index int) any {
	if index < len(values) {
		return values[index]
	}
	return nil
}

func (g *generator) getNodeFirstDecoratorValue(node *ast.Node, name string) any {
	decorators := decoratorsNamed(node, name)
	if len(decorators) == 0 {
		return nil
	}
	return valueAt(g.getDecoratorValues(decorators[0]), 0)
}

func (g *generator) getSecurities(decorator *ast.Node) Obj {
	values := g.getDecoratorValues(decorator)
	first, second := valueAt(values, 0), valueAt(values, 1)
	security, isObject := first.(Obj)
	if !isObject {
		scopes := second
		if !truthy(scopes) {
			scopes = []any{}
		}
		security = Obj{jsString(first): scopes}
	}
	var argument *ast.Node
	if arguments := decorator.Parent.Arguments(); len(arguments) > 0 {
		argument = arguments[0]
	}
	kept := false
	if len(security) > 0 {
		kept = true
		for name, scopes := range security {
			if _, isArray := scopes.([]any); name == "__proto__" || !isArray {
				kept = false
			}
		}
	} else {
		kept = argument != nil && ast.IsObjectLiteralExpression(argument) && len(argument.AsObjectLiteralExpression().Properties.Nodes) == 0
	}
	if !kept {
		throwError("Invalid @Security: name each scheme (not '__proto__') and give it an array of scopes. Only a literal {} may be empty.", decorator)
	}
	return security
}

func (g *generator) getPath(decorator *ast.Node) string {
	path := valueAt(g.getDecoratorValues(decorator), 0)
	if path == nil {
		return ""
	}
	return jsString(path)
}

func (g *generator) getProduces(node *ast.Node) []any {
	produces := []any{}
	for _, decorator := range decoratorsNamed(node, "Produces") {
		produces = append(produces, valueAt(g.getDecoratorValues(decorator), 0))
	}
	return produces
}

// truthy is JavaScript's truthiness of a metadata value.
func truthy(value any) bool {
	switch v := value.(type) {
	case nil, jsonNull:
		return false
	case bool:
		return v
	case string:
		return v != ""
	case float64:
		return v != 0 && !math.IsNaN(v)
	}
	return true
}

// jsString is JavaScript's String() of a metadata value.
func jsString(value any) string {
	switch v := value.(type) {
	case nil:
		return "undefined"
	case jsonNull:
		return "null"
	case string:
		return v
	case bool:
		return strconv.FormatBool(v)
	case float64:
		return strconv.FormatFloat(v, 'f', -1, 64)
	case []any:
		parts := make([]string, len(v))
		for i, item := range v {
			if item != nil && item != Null {
				parts[i] = jsString(item)
			}
		}
		return strings.Join(parts, ",")
	}
	return "[object Object]"
}

// ---- extension.ts ----

func (g *generator) getExtensions(decorators []*ast.Node) []any {
	extensions := []any{}
	for _, decorator := range decorators {
		if decorator.Parent == nil || !ast.IsCallExpression(decorator.Parent) {
			panic(&MetadataError{Message: "The parent of the @Extension is not a CallExpression. Are you using it in the right place?"})
		}
		arguments := decorator.Parent.Arguments()
		var keyArgument, valueArgument *ast.Node
		if len(arguments) > 0 {
			keyArgument = arguments[0]
		}
		if len(arguments) > 1 {
			valueArgument = arguments[1]
		}
		if keyArgument == nil || (!ast.IsStringLiteral(keyArgument) && !ast.IsIdentifier(keyArgument)) {
			panic(&MetadataError{Message: "The first argument of @Extension must be a string"})
		}
		var key any = keyArgument.Text()
		if ast.IsIdentifier(keyArgument) {
			key = g.getInitializerValue(keyArgument, "")
		}
		keyString, ok := key.(string)
		if !ok {
			panic(&MetadataError{Message: "The first argument of @Extension must be a string"})
		}
		if valueArgument == nil {
			panic(&MetadataError{Message: fmt.Sprintf("Extension '%s' must contain a value", keyString)})
		}
		assertValidExtensionKey(keyString)
		value := g.getInitializerValue(valueArgument, "")
		if !isNonUndefinedInitializerValue(value) {
			panic(&MetadataError{Message: fmt.Sprintf("Extension '%s' cannot have an undefined initializer value", keyString)})
		}
		extensions = append(extensions, Obj{"key": keyString, "value": value})
	}
	return extensions
}

func getExtensionsFromJSDocComments(comments []string) []any {
	extensions := []any{}
	for _, comment := range comments {
		data, ok := safeFromJSON(comment)
		object, isObject := data.(Obj)
		if !ok || !isObject {
			continue
		}
		for _, key := range orderedKeys(comment, object) {
			assertValidExtensionKey(key)
			extensions = append(extensions, Obj{"key": key, "value": object[key]})
		}
	}
	return extensions
}

func assertValidExtensionKey(key string) {
	if !strings.HasPrefix(key, "x-") {
		panic(&MetadataError{Message: "Extensions must begin with \"x-\" to be valid. Please see the following link for more information: https://swagger.io/docs/specification/openapi-extensions/"})
	}
}

// orderedKeys lists an object's keys in the order the JSON text gives them, as JSON.parse keeps them.
func orderedKeys(text string, object Obj) []string {
	type positioned struct {
		key string
		at  int
	}
	var keys []positioned
	for key := range object {
		quoted := strconv.Quote(key)
		at := strings.Index(text, quoted)
		if at < 0 {
			at = math.MaxInt
		}
		keys = append(keys, positioned{key, at})
	}
	for i := 1; i < len(keys); i++ {
		for j := i; j > 0 && keys[j].at < keys[j-1].at; j-- {
			keys[j], keys[j-1] = keys[j-1], keys[j]
		}
	}
	out := make([]string, len(keys))
	for i, k := range keys {
		out[i] = k.key
	}
	return out
}

// ---- validatorUtils.ts ----

var parameterTagSupport = []string{"isString", "isBoolean", "isInt", "isLong", "isFloat", "isDouble", "isDate", "isDateTime", "minItems", "maxItems",
	"uniqueItems", "minLength", "maxLength", "pattern", "minimum", "maximum", "minDate", "maxDate", "title"}

func firstWord(comment string) string {
	return strings.Split(comment, " ")[0]
}

func errorMessageAfterValue(comment string) any {
	if index := strings.Index(comment, " "); index > 0 {
		return comment[index+1:]
	}
	return nil
}

// jsIsNaN is JavaScript's isNaN() of a string.
func jsIsNaN(value string) bool {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return false
	}
	return jsNumber(trimmed) == nil || jsNumber(trimmed) == Null
}

func (g *generator) numberValidator(name, value string, errorMsg any) Obj {
	if jsIsNaN(value) {
		panic(&MetadataError{Message: name + " parameter use number."})
	}
	number := jsNumber(strings.TrimSpace(value))
	if strings.TrimSpace(value) == "" {
		number = 0.0
	}
	return Obj{"errorMsg": errorMsg, "value": number}
}

func (g *generator) dateValidator(name, value string, errorMsg any) Obj {
	g.checks = append(g.checks, check{Kind: "isoDate", Name: name, Value: value})
	return Obj{"errorMsg": errorMsg, "value": value}
}

func (g *generator) getParameterValidators(parameter *ast.Node, parameterName string) Obj {
	validators := Obj{}
	if parameter.Parent == nil {
		return validators
	}
	tags := getJSDocTags(parameter.Parent, func(tag *ast.Node) bool {
		comment, ok := commentToString(tagComment(tag))
		return ok && comment != "" && containsString(parameterTagSupport, tagName(tag)) && firstWord(comment) == parameterName
	})
	for _, tag := range tags {
		full, ok := commentToString(tagComment(tag))
		if !ok {
			continue
		}
		name := tagName(tag)
		// `comment.indexOf(' ') || -1`: a leading space counts as none.
		space := strings.Index(full, " ")
		if space <= 0 {
			space = -1
		}
		comment := strings.TrimSpace(full[space+1:])
		value := firstWord(comment)
		switch name {
		case "uniqueItems":
			validators[name] = Obj{"errorMsg": nonEmpty(comment), "value": nil}
		case "minimum", "maximum", "minItems", "maxItems", "minLength", "maxLength":
			validators[name] = g.numberValidator(name, value, errorMessageAfterValue(comment))
		case "minDate", "maxDate":
			validators[name] = g.dateValidator(name, value, errorMessageAfterValue(comment))
		case "pattern":
			validators[name] = g.parsePattern(comment, true, tag)
		default:
			if strings.HasPrefix(name, "is") && comment != "" {
				validators[name] = Obj{"errorMsg": comment, "value": nil}
			}
		}
	}
	return validators
}

func nonEmpty(text string) any {
	if text == "" {
		return nil
	}
	return text
}

func (g *generator) getPropertyValidators(property *ast.Node) Obj {
	validators := Obj{}
	tags := getJSDocTags(property, func(tag *ast.Node) bool { return containsString(parameterTagSupport, tagName(tag)) })
	for _, tag := range tags {
		name := tagName(tag)
		comment, hasComment := commentToString(tagComment(tag))
		value := ""
		if hasComment {
			value = firstWord(comment)
		}
		var errorMsg any
		if hasComment && comment != "" {
			errorMsg = errorMessageAfterValue(comment)
		}
		switch name {
		case "uniqueItems":
			validators[name] = Obj{"errorMsg": nonEmpty(comment), "value": nil}
		case "minimum", "maximum", "minItems", "maxItems", "minLength", "maxLength":
			if !hasComment || comment == "" {
				panic(&MetadataError{Message: name + " parameter use number."})
			}
			validators[name] = g.numberValidator(name, value, errorMsg)
		case "minDate", "maxDate":
			if !hasComment || comment == "" {
				// String(undefined)
				value = "undefined"
			}
			validators[name] = g.dateValidator(name, value, errorMsg)
		case "pattern":
			validators[name] = g.parsePattern(comment, hasComment && comment != "", tag)
		case "title":
			if !hasComment || comment == "" {
				panic(&MetadataError{Message: name + " parameter use string."})
			}
			fullValue := comment
			if index := strings.Index(comment, "\n"); index >= 0 {
				fullValue = comment[:index]
			}
			validators[name] = Obj{"errorMsg": errorMsg, "value": fullValue}
		default:
			if strings.HasPrefix(name, "is") && hasComment && comment != "" {
				validators[name] = Obj{"errorMsg": comment, "value": nil}
			}
		}
	}
	return validators
}

func (g *generator) parsePattern(comment string, hasComment bool, node *ast.Node) Obj {
	if !hasComment {
		throwError("pattern parameter use string.", node)
	}
	separator := strings.Index(comment, " ")
	if strings.HasPrefix(comment, "`") && !strings.HasPrefix(comment, "``") {
		// /^`(?!`)[^\r\n]*?`(?= |$)/
		for end := 1; end < len(comment); end++ {
			if comment[end] == '\r' || comment[end] == '\n' {
				break
			}
			if comment[end] == '`' && (end+1 == len(comment) || comment[end+1] == ' ') {
				separator = end + 1
				break
			}
		}
	}
	source := comment
	if separator != -1 {
		source = comment[:separator]
	}
	value := source
	if strings.HasPrefix(source, "`") && strings.HasSuffix(source, "`") && len(source) >= 2 {
		value = source[1 : len(source)-1]
	}
	var errorMsg any
	if separator > 0 && separator < len(comment) {
		errorMsg = comment[separator+1:]
	}
	g.checks = append(g.checks, check{Kind: "pattern", Value: value, Location: prettyLocationOfNode(node) + "\n" + prettyTroubleCause(node, false)})
	return Obj{"value": value, "errorMsg": errorMsg}
}

var _ = checker.TypeFlagsAny
