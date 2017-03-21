import * as ts from 'typescript';
import { MetadataGenerator } from './metadataGenerator';

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

function parsePropertyAccessExpression(ex: ts.PropertyAccessExpression): any {
  const type = MetadataGenerator.current.nodes.find(node => {
    if (node.kind === ts.SyntaxKind.ClassDeclaration || ts.SyntaxKind.EnumDeclaration) {
      const classNode = node as any;
      return !!(classNode.name && (classNode.name.text === (ex.expression as any).text));
    }
    return false;
  }) as any;
  if (type) {
    const found = type.members.find((n: any) => {
      if (n.name && n.name.kind === ts.SyntaxKind.Identifier) {
        return (n.name as ts.Identifier).text === ex.name.text;
      }
      return false;
    }) as any;
    if (found && found.initializer) {
      return parseExpression(found.initializer);
    }
  }

  throw new Error('Expression parsing error: not implemented');
}
function parseNewExpression(expression: ts.NewExpression): any {
  const ex = expression as any;
  if (ex.expression) {
    switch (ex.expression.text) {
      case 'Date': return new (Function.prototype.bind.apply(Date, ex.arguments.map((e: ts.Expression) => parseExpression(e))));
      case 'Number': return new (Function.prototype.bind.apply(Number, ex.arguments.map((e: ts.Expression) => parseExpression(e))));
      case 'String': return new (Function.prototype.bind.apply(String, ex.arguments.map((e: ts.Expression) => parseExpression(e))));
      default: throw new Error('Expression parsing error: not implemented');
    }
  }
  throw new Error('Expression parsing error: not implemented');
}

function parseObjectLiteralExpression(expression: ts.ObjectLiteralExpression): any {
  const nestedObject: any = {};
  expression.properties.forEach((p: any) => {
    nestedObject[p.name.text] = parseExpression(p.initializer);
  });
  return nestedObject;
}

export function parseExpression(expression: ts.Expression): any  {
  switch (expression.kind) {
    case ts.SyntaxKind.PrefixUnaryExpression:    return parseUnaryPrefix(expression as ts.PrefixUnaryExpression);
    case ts.SyntaxKind.BinaryExpression:         return parseBinary(expression as ts.BinaryExpression);
    case ts.SyntaxKind.NumericLiteral:           return parseInt((expression as ts.NumericLiteral).text, 10);
    case ts.SyntaxKind.FirstLiteralToken:        return parseInt((expression as ts.NumericLiteral).text, 10);
    case ts.SyntaxKind.StringLiteral:            return (expression as ts.StringLiteral).text;
    case ts.SyntaxKind.NullKeyword:              return null;
    case ts.SyntaxKind.TrueKeyword:              return true;
    case ts.SyntaxKind.FalseKeyword:             return false;
    case ts.SyntaxKind.ArrayLiteralExpression:   return (expression as ts.ArrayLiteralExpression).elements.map(e => parseExpression(e));
    case ts.SyntaxKind.ObjectLiteralExpression:  return parseObjectLiteralExpression(expression as ts.ObjectLiteralExpression);
    case ts.SyntaxKind.NewExpression:            return parseNewExpression(expression as ts.NewExpression);
    case ts.SyntaxKind.PropertyAccessExpression: return parsePropertyAccessExpression(expression  as ts.PropertyAccessExpression);
    default:                                     throw new Error('Expression parsing error: not implemented');
  }
}
