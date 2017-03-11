import * as ts from 'typescript';

export function getDecorators(node: ts.Node, isMatching: (identifier: ts.Identifier) => boolean) {
    const decorators = node.decorators;
    if (!decorators || !decorators.length) { return; }

    return decorators
        .map(d => d.expression as ts.CallExpression)
        .map(e => e.expression as ts.Identifier)
        .filter(isMatching);
}

export function getDecoratorName(node: ts.Node, isMatching: (identifier: ts.Identifier) => boolean) {
    const decorators = getDecorators(node, isMatching);
    if (!decorators || !decorators.length) { return; }

    return decorators[0].text;
}

export function getDecoratorTextValue(node: ts.Node, isMatching: (identifier: ts.Identifier) => boolean) {
    const decorators = getDecorators(node, isMatching);
    if (!decorators || !decorators.length) { return; }


    const expression = decorators[0].parent as ts.CallExpression;
    const expArguments = expression.arguments;
    if (!expArguments || !expArguments.length) { return; }
    return (expArguments[0] as ts.StringLiteral).text;
}
export function isDecorator(node: ts.Node, isMatching: (identifier: ts.Identifier) => boolean) {
    const decorators = getDecorators(node, isMatching);
    if (!decorators || !decorators.length) {
        return false;
    }
    return  true;
}
