"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
var exceptions_1 = require("./exceptions");
var methodGenerator_1 = require("./methodGenerator");
var ControllerGenerator = (function () {
    function ControllerGenerator(node) {
        this.node = node;
        this.pathValue = this.getControllerRouteValue(node);
    }
    ControllerGenerator.prototype.IsValid = function () {
        return !!this.pathValue || this.pathValue === '';
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
            path: this.pathValue || '',
        };
    };
    ControllerGenerator.prototype.buildMethods = function () {
        return this.node.members
            .filter(function (m) { return m.kind === ts.SyntaxKind.MethodDeclaration; })
            .map(function (m) { return new methodGenerator_1.MethodGenerator(m); })
            .filter(function (generator) { return generator.IsValid(); })
            .map(function (generator) { return generator.Generate(); });
    };
    ControllerGenerator.prototype.getControllerRouteValue = function (node) {
        return this.getControllerDecoratorValue(node, 'Route', '');
    };
    ControllerGenerator.prototype.getControllerDecoratorValue = function (node, decoratorName, defaultValue) {
        if (!node.decorators) {
            return undefined;
        }
        var matchedAttributes = node.decorators
            .map(function (d) { return d.expression; })
            .filter(function (expression) {
            var subExpression = expression.expression;
            return subExpression.text === decoratorName;
        });
        if (!matchedAttributes.length) {
            return undefined;
        }
        if (matchedAttributes.length > 1) {
            throw new exceptions_1.GenerateMetadataError("A controller can only have a single 'decoratorName' decorator in `" + this.node.name.text + "` class.");
        }
        var value = matchedAttributes[0].arguments[0];
        return value ? value.text : defaultValue;
    };
    return ControllerGenerator;
}());
exports.ControllerGenerator = ControllerGenerator;
//# sourceMappingURL=controllerGenerator.js.map