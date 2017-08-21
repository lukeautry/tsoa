"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var resolveType_1 = require("./../metadataGeneration/resolveType");
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
    return resolveType_1.getInitializerValue(expArguments[0]);
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
//# sourceMappingURL=decoratorUtils.js.map