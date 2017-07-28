"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var decoratorUtils_1 = require("./../utils/decoratorUtils");
var jsDocUtils_1 = require("./../utils/jsDocUtils");
var exceptions_1 = require("./exceptions");
var parameterGenerator_1 = require("./parameterGenerator");
var resolveType_1 = require("./resolveType");
var MethodGenerator = (function () {
    function MethodGenerator(node) {
        this.node = node;
        this.processMethodDecorators();
    }
    MethodGenerator.prototype.IsValid = function () {
        return !!this.method;
    };
    MethodGenerator.prototype.Generate = function () {
        if (!this.IsValid()) {
            throw new exceptions_1.GenerateMetadataError('This isn\'t a valid a controller method.');
        }
        if (!this.node.type) {
            throw new exceptions_1.GenerateMetadataError('Controller methods must have a return type.');
        }
        var identifier = this.node.name;
        var type = resolveType_1.ResolveType(this.node.type);
        var responses = this.getMethodResponses();
        responses.push(this.getMethodSuccessResponse(type));
        return {
            deprecated: jsDocUtils_1.isExistJSDocTag(this.node, function (tag) { return tag.tagName.text === 'deprecated'; }),
            description: jsDocUtils_1.getJSDocDescription(this.node),
            method: this.method,
            name: identifier.text,
            parameters: this.buildParameters(),
            path: this.path,
            responses: responses,
            security: this.getMethodSecurity(),
            summary: jsDocUtils_1.getJSDocComment(this.node, 'summary'),
            tags: this.getMethodTags(),
            type: type,
        };
    };
    MethodGenerator.prototype.buildParameters = function () {
        var _this = this;
        var parameters = this.node.parameters.map(function (p) {
            try {
                return new parameterGenerator_1.ParameterGenerator(p, _this.method, _this.path).Generate();
            }
            catch (e) {
                var methodId = _this.node.name;
                var controllerId = _this.node.parent.name;
                throw new exceptions_1.GenerateMetadataError(e.message + " \n in '" + controllerId.text + "." + methodId.text + "'");
            }
        });
        var bodyParameters = parameters.filter(function (p) { return p.in === 'body'; });
        var bodyProps = parameters.filter(function (p) { return p.in === 'body-prop'; });
        if (bodyParameters.length > 1) {
            throw new exceptions_1.GenerateMetadataError("Only one body parameter allowed in '" + this.getCurrentLocation() + "' method.");
        }
        if (bodyParameters.length > 0 && bodyProps.length > 0) {
            throw new exceptions_1.GenerateMetadataError("Choose either during @Body or @BodyProp in '" + this.getCurrentLocation() + "' method.");
        }
        return parameters;
    };
    MethodGenerator.prototype.getCurrentLocation = function () {
        var methodId = this.node.name;
        var controllerId = this.node.parent.name;
        return controllerId.text + "." + methodId.text;
    };
    MethodGenerator.prototype.processMethodDecorators = function () {
        var _this = this;
        var pathDecorators = decoratorUtils_1.getDecorators(this.node, function (identifier) { return _this.supportsPathMethod(identifier.text); });
        if (!pathDecorators || !pathDecorators.length) {
            return;
        }
        if (pathDecorators.length > 1) {
            throw new exceptions_1.GenerateMetadataError("Only one path decorator in '" + this.getCurrentLocation + "' method, Found: " + pathDecorators.map(function (d) { return d.text; }).join(', '));
        }
        var decorator = pathDecorators[0];
        var expression = decorator.parent;
        var decoratorArgument = expression.arguments[0];
        this.method = decorator.text.toLowerCase();
        // if you don't pass in a path to the method decorator, we'll just use the base route
        // todo: what if someone has multiple no argument methods of the same type in a single controller?
        // we need to throw an error there
        this.path = decoratorArgument ? "/" + decoratorArgument.text : '';
    };
    MethodGenerator.prototype.getMethodResponses = function () {
        var _this = this;
        var decorators = decoratorUtils_1.getDecorators(this.node, function (identifier) { return identifier.text === 'Response'; });
        if (!decorators || !decorators.length) {
            return [];
        }
        return decorators.map(function (decorator) {
            var expression = decorator.parent;
            var description = '';
            var name = '200';
            var examples;
            if (expression.arguments.length > 0 && expression.arguments[0].text) {
                name = expression.arguments[0].text;
            }
            if (expression.arguments.length > 1 && expression.arguments[1].text) {
                description = expression.arguments[1].text;
            }
            if (expression.arguments.length > 2 && expression.arguments[2].text) {
                var argument = expression.arguments[2];
                examples = _this.getExamplesValue(argument);
            }
            return {
                description: description,
                examples: examples,
                name: name,
                schema: (expression.typeArguments && expression.typeArguments.length > 0)
                    ? resolveType_1.ResolveType(expression.typeArguments[0])
                    : undefined,
            };
        });
    };
    MethodGenerator.prototype.getMethodSuccessResponse = function (type) {
        var decorators = decoratorUtils_1.getDecorators(this.node, function (identifier) { return identifier.text === 'SuccessResponse'; });
        if (!decorators || !decorators.length) {
            return {
                description: type.dataType === 'void' ? 'No content' : 'Ok',
                examples: this.getMethodSuccessExamples(),
                name: type.dataType === 'void' ? '204' : '200',
                schema: type,
            };
        }
        if (decorators.length > 1) {
            throw new exceptions_1.GenerateMetadataError("Only one SuccessResponse decorator allowed in '" + this.getCurrentLocation + "' method.");
        }
        var decorator = decorators[0];
        var expression = decorator.parent;
        var description = '';
        var name = '200';
        var examples = undefined;
        if (expression.arguments.length > 0 && expression.arguments[0].text) {
            name = expression.arguments[0].text;
        }
        if (expression.arguments.length > 1 && expression.arguments[1].text) {
            description = expression.arguments[1].text;
        }
        return {
            description: description,
            examples: examples,
            name: name,
            schema: type,
        };
    };
    MethodGenerator.prototype.getMethodSuccessExamples = function () {
        var exampleDecorators = decoratorUtils_1.getDecorators(this.node, function (identifier) { return identifier.text === 'Example'; });
        if (!exampleDecorators || !exampleDecorators.length) {
            return undefined;
        }
        if (exampleDecorators.length > 1) {
            throw new exceptions_1.GenerateMetadataError("Only one Example decorator allowed in '" + this.getCurrentLocation + "' method.");
        }
        var decorator = exampleDecorators[0];
        var expression = decorator.parent;
        var argument = expression.arguments[0];
        return this.getExamplesValue(argument);
    };
    MethodGenerator.prototype.supportsPathMethod = function (method) {
        return ['get', 'post', 'put', 'patch', 'delete'].some(function (m) { return m === method.toLowerCase(); });
    };
    MethodGenerator.prototype.getExamplesValue = function (argument) {
        var example = {};
        argument.properties.forEach(function (p) {
            example[p.name.text] = decoratorUtils_1.getInitializerValue(p.initializer);
        });
        return example;
    };
    MethodGenerator.prototype.getMethodTags = function () {
        var tagsDecorators = decoratorUtils_1.getDecorators(this.node, function (identifier) { return identifier.text === 'Tags'; });
        if (!tagsDecorators || !tagsDecorators.length) {
            return [];
        }
        if (tagsDecorators.length > 1) {
            throw new exceptions_1.GenerateMetadataError("Only one Tags decorator allowed in '" + this.getCurrentLocation + "' method.");
        }
        var decorator = tagsDecorators[0];
        var expression = decorator.parent;
        return expression.arguments.map(function (a) { return a.text; });
    };
    MethodGenerator.prototype.getMethodSecurity = function () {
        var securityDecorators = decoratorUtils_1.getDecorators(this.node, function (identifier) { return identifier.text === 'Security'; });
        if (!securityDecorators || !securityDecorators.length) {
            return undefined;
        }
        if (securityDecorators.length > 1) {
            throw new exceptions_1.GenerateMetadataError("Only one Security decorator allowed in '" + this.getCurrentLocation + "' method.");
        }
        var decorator = securityDecorators[0];
        var expression = decorator.parent;
        return {
            name: expression.arguments[0].text,
            scopes: expression.arguments[1] ? expression.arguments[1].elements.map(function (e) { return e.text; }) : undefined,
        };
    };
    return MethodGenerator;
}());
exports.MethodGenerator = MethodGenerator;
//# sourceMappingURL=methodGenerator.js.map