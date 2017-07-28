"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
function getDecorators(node, isMatching) {
    var decorators = node.decorators;
    if (!decorators || !decorators.length) {
        return [];
    }
    return decorators
        .map(function (d) { return d.expression; })
        .map(function (e) { return e.expression; })
        .filter(isMatching);
}
exports.getDecorators = getDecorators;
function getDecoratorName(node, isMatching) {
    var decorators = getDecorators(node, isMatching);
    if (!decorators || !decorators.length) {
        return;
    }
    return decorators[0].text;
}
exports.getDecoratorName = getDecoratorName;
function getDecoratorTextValue(node, isMatching) {
    var decorators = getDecorators(node, isMatching);
    if (!decorators || !decorators.length) {
        return;
    }
    var expression = decorators[0].parent;
    var expArguments = expression.arguments;
    if (!expArguments || !expArguments.length) {
        return;
    }
    return expArguments[0].text;
}
exports.getDecoratorTextValue = getDecoratorTextValue;
function getDecoratorOptionValue(node, isMatching) {
    var decorators = getDecorators(node, isMatching);
    if (!decorators || !decorators.length) {
        return;
    }
    var expression = decorators[0].parent;
    var expArguments = expression.arguments;
    if (!expArguments || !expArguments.length) {
        return;
    }
    return getInitializerValue(expArguments[0]);
}
exports.getDecoratorOptionValue = getDecoratorOptionValue;
function isDecorator(node, isMatching) {
    var decorators = getDecorators(node, isMatching);
    if (!decorators || !decorators.length) {
        return false;
    }
    return true;
}
exports.isDecorator = isDecorator;
function getInitializerValue(initializer) {
    switch (initializer.kind) {
        case ts.SyntaxKind.ArrayLiteralExpression:
            return initializer.elements.map(function (e) { return getInitializerValue(e); });
        case ts.SyntaxKind.StringLiteral:
            return initializer.text;
        case ts.SyntaxKind.TrueKeyword:
            return true;
        case ts.SyntaxKind.FalseKeyword:
            return false;
        case ts.SyntaxKind.NumberKeyword:
        case ts.SyntaxKind.FirstLiteralToken:
            return parseInt(initializer.text, 10);
        case ts.SyntaxKind.ObjectLiteralExpression:
            var nestedObject_1 = {};
            initializer.properties.forEach(function (p) {
                nestedObject_1[p.name.text] = getInitializerValue(p.initializer);
            });
            return nestedObject_1;
        default:
            return undefined;
    }
}
exports.getInitializerValue = getInitializerValue;
//# sourceMappingURL=decoratorUtils.js.map