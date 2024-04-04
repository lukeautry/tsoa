import * as ts from 'typescript';
import { Tsoa, assertNever } from '@tsoa/runtime';

import { Transformer } from './transformer';
import { getJSDocTagNames } from '../../utils/jsDocUtils';

export class PrimitiveTransformer extends Transformer {
  public static resolveKindToPrimitive(syntaxKind: ts.SyntaxKind): ResolvesToPrimitive {
    switch (syntaxKind) {
      case ts.SyntaxKind.NumberKeyword:
        return 'number';
      case ts.SyntaxKind.StringKeyword:
        return 'string';
      case ts.SyntaxKind.BooleanKeyword:
        return 'boolean';
      case ts.SyntaxKind.VoidKeyword:
        return 'void';
      case ts.SyntaxKind.UndefinedKeyword:
        return 'undefined';
      default:
        return undefined;
    }
  };

  public transform(typeNode: ts.TypeNode, parentNode?: ts.Node): Tsoa.PrimitiveType | undefined {
    const resolvedType = PrimitiveTransformer.resolveKindToPrimitive(typeNode.kind);
    if (!resolvedType) {
      return;
    }

    const defaultNumberType = this.resolver.current.defaultNumberType;

    switch (resolvedType) {
      case 'number':
        return this.transformNumber(defaultNumberType, parentNode);
      case 'string':
      case 'boolean':
      case 'void':
      case 'undefined':
        return { dataType: resolvedType };
      default:
        return assertNever(resolvedType);
    }
  }

  private transformNumber(
    defaultNumberType: NonNullable<"double" | "float" | "integer" | "long" | undefined>,
    parentNode?: ts.Node,
  ): Tsoa.PrimitiveType {
    if (!parentNode) {
      return { dataType: defaultNumberType };
    }

    const tags = getJSDocTagNames(parentNode).filter(name => {
      return ['isInt', 'isLong', 'isFloat', 'isDouble'].some(m => m === name);
    });
    if (tags.length === 0) {
      return { dataType: defaultNumberType };
    }

    switch (tags[0]) {
      case 'isInt':
        return { dataType: 'integer' };
      case 'isLong':
        return { dataType: 'long' };
      case 'isFloat':
        return { dataType: 'float' };
      case 'isDouble':
        return { dataType: 'double' };
      default:
        return { dataType: defaultNumberType };
    }
  }
}

type ResolvesToPrimitive = 'number' | 'string' | 'boolean' | 'void' | 'undefined' | undefined;
