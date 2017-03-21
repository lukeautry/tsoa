import * as ts from 'typescript';

function parseBinary(expression: ts.BinaryExpression): any {
  const left = parseExpression(expression.left);
  const right = parseExpression(expression.right);
  switch (expression.operatorToken.kind) {
    case ts.SyntaxKind.PlusToken: return left + right;
    case ts.SyntaxKind.MinusToken: return left - right;
    case ts.SyntaxKind.AsteriskToken: return left * right;
    case ts.SyntaxKind.SlashToken: return left / right;
    case ts.SyntaxKind.PercentToken: return left % right;
    case ts.SyntaxKind.LessThanLessThanToken: return left << right;
    case ts.SyntaxKind.GreaterThanGreaterThanToken: return left >> right;
    case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken: return left >>> right;
    case ts.SyntaxKind.AmpersandToken: return left & right;
    case ts.SyntaxKind.BarToken: return left | right;
    case ts.SyntaxKind.CaretToken: return left ^ right;
    default: throw new Error('Expression parsing error: not implemented');
  }
}

function parseUnaryPrefix(expression: ts.PrefixUnaryExpression): any {
  const operand = parseExpression(expression.operand);
  switch (expression.operator) {
    case ts.SyntaxKind.PlusToken:  return + operand;
    case ts.SyntaxKind.MinusToken: return - operand;
    case ts.SyntaxKind.TildeToken: return ~ operand;
    default: throw new Error('Expression parsing error: not implemented');
  }
}

export function parseExpression(expression: ts.Expression): any  {
  switch (expression.kind) {
    case ts.SyntaxKind.PrefixUnaryExpression: return parseUnaryPrefix(expression as ts.PrefixUnaryExpression);
    case ts.SyntaxKind.BinaryExpression:      return parseBinary(expression as ts.BinaryExpression);
    case ts.SyntaxKind.NumericLiteral:        return parseInt((expression as ts.NumericLiteral).text, 10);
    case ts.SyntaxKind.StringLiteral:         return (expression as ts.StringLiteral).text;
    case ts.SyntaxKind.NullKeyword:           return null;
    case ts.SyntaxKind.TrueKeyword:           return true;
    case ts.SyntaxKind.FalseKeyword:          return false;
    default: throw new Error('Expression parsing error: not implemented');
  }
}
