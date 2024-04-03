import * as ts from 'typescript';
import { Tsoa, assertNever } from '@tsoa/runtime';

import { Transformer } from './transformer';
import { getJSDocTagNames } from '../../utils/jsDocUtils';

export class PrimitiveTransformer extends Transformer {
  public static attemptToResolveKindToPrimitive(syntaxKind: ts.SyntaxKind): ResolvesToPrimitive | DoesNotResolveToPrimitive {
    switch (syntaxKind) {
      case ts.SyntaxKind.NumberKeyword:
        return { foundMatch: true, resolvedType: 'number' };
      case ts.SyntaxKind.StringKeyword:
        return { foundMatch: true, resolvedType: 'string' };
      case ts.SyntaxKind.BooleanKeyword:
        return { foundMatch: true, resolvedType: 'boolean' };
      case ts.SyntaxKind.VoidKeyword:
        return { foundMatch: true, resolvedType: 'void' };
      case ts.SyntaxKind.UndefinedKeyword:
        return { foundMatch: true, resolvedType: 'undefined' };
      default:
        return { foundMatch: false };
    }
  };

  public transform(typeNode: ts.TypeNode, parentNode?: ts.Node): Tsoa.PrimitiveType | undefined {
    const resolution = PrimitiveTransformer.attemptToResolveKindToPrimitive(typeNode.kind);
    if (!resolution.foundMatch) {
      return;
    }

    const defaultNumberType = this.resolver.current.defaultNumberType;

    switch (resolution.resolvedType) {
      case 'number':
        return this.transformNumber(defaultNumberType, parentNode);
      case 'string':
      case 'boolean':
      case 'void':
      case 'undefined':
        return { dataType: resolution.resolvedType };
      default:
        return assertNever(resolution.resolvedType);
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

interface ResolvesToPrimitive {
  foundMatch: true;
  resolvedType: 'number' | 'string' | 'boolean' | 'void' | 'undefined';
}

interface DoesNotResolveToPrimitive {
  foundMatch: false;
}
