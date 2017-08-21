"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
var decoratorUtils_1 = require("./../utils/decoratorUtils");
var exceptions_1 = require("./exceptions");
var methodGenerator_1 = require("./methodGenerator");
var ControllerGenerator = (function () {
    function ControllerGenerator(node) {
        this.node = node;
        this.path = this.getPath();
        this.tags = this.getTags();
        this.security = this.getSecurity();
    }
    ControllerGenerator.prototype.IsValid = function () {
        return !!this.path || this.path === '';
    };
    ControllerGenerator.prototype.Generate = function () {
        if (!this.node.parent) {
            throw new exceptions_1.GenerateMetadataError('Controller node doesn\'t have a valid parent source file.');
        }
        if (!this.node.name) {
            throw new exceptions_1.GenerateMetadataError('Controller node doesn\'t have a valid name.');
        }
        var sourceFile = this.node.parent.getSourceFile();
        return {
            location: sourceFile.fileName,
            methods: this.buildMethods(),
            name: this.node.name.text,
            path: this.path || '',
        };
    };
    ControllerGenerator.prototype.buildMethods = function () {
        var _this = this;
        return this.node.members
            .filter(function (m) { return m.kind === ts.SyntaxKind.MethodDeclaration; })
            .map(function (m) { return new methodGenerator_1.MethodGenerator(m, _this.tags, _this.security); })
            .filter(function (generator) { return generator.IsValid(); })
            .map(function (generator) { return generator.Generate(); });
    };
    ControllerGenerator.prototype.getPath = function () {
        var decorators = decoratorUtils_1.getDecorators(this.node, function (identifier) { return identifier.text === 'Route'; });
        if (!decorators || !decorators.length) {
            return;
        }
        if (decorators.length > 1) {
            throw new exceptions_1.GenerateMetadataError("Only one Route decorator allowed in '" + this.node.name.text + "' class.");
        }
        var decorator = decorators[0];
        var expression = decorator.parent;
        var decoratorArgument = expression.arguments[0];
        return decoratorArgument ? "" + decoratorArgument.text : '';
    };
    ControllerGenerator.prototype.getTags = function () {
        var decorators = decoratorUtils_1.getDecorators(this.node, function (identifier) { return identifier.text === 'Tags'; });
        if (!decorators || !decorators.length) {
            return;
        }
        if (decorators.length > 1) {
            throw new exceptions_1.GenerateMetadataError("Only one Tags decorator allowed in '" + this.node.name.text + "' class.");
        }
        var decorator = decorators[0];
        var expression = decorator.parent;
        return expression.arguments.map(function (a) { return a.text; });
    };
    ControllerGenerator.prototype.getSecurity = function () {
        var securityDecorators = decoratorUtils_1.getDecorators(this.node, function (identifier) { return identifier.text === 'Security'; });
        if (!securityDecorators || !securityDecorators.length) {
            return [];
        }
        var security = [];
        for (var _i = 0, securityDecorators_1 = securityDecorators; _i < securityDecorators_1.length; _i++) {
            var sec = securityDecorators_1[_i];
            var expression = sec.parent;
            security.push({
                name: expression.arguments[0].text,
                scopes: expression.arguments[1] ? expression.arguments[1].elements.map(function (e) { return e.text; }) : undefined,
            });
        }
        return security;
    };
    return ControllerGenerator;
}());
exports.ControllerGenerator = ControllerGenerator;
//# sourceMappingURL=controllerGenerator.js.map