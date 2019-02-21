import * as ts from 'typescript';
import { getInitializerValue } from './initializer-value';
import { Tsoa } from './tsoa';

export function getSecurities(decorators: ts.Identifier[]): Tsoa.Security[] {
  const securities: Tsoa.Security[] = [];
  for (const sec of decorators) {
    const expression = sec.parent as ts.CallExpression;
    const security: Tsoa.Security = {};

    if (expression.arguments[0].kind === ts.SyntaxKind.StringLiteral) {
      const name = (expression.arguments[0] as any).text;
      security[name] = expression.arguments[1] ? (expression.arguments[1] as any).elements.map((e: any) => e.text) : [];
    } else {
      const properties = (expression.arguments[0] as any).properties;

      for (const property of properties) {
        const name = property.name.text;
        const scopes = getInitializerValue(property.initializer);
        security[name] = scopes;
      }
    }

    securities.push(security);
  }

  return securities;
}
