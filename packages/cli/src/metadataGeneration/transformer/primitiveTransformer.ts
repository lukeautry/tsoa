import type { TypeNode, Node } from 'typescript';
import { SyntaxKind } from 'typescript';
import { Tsoa, assertNever } from '@tsoa/runtime';

import { Transformer } from './transformer';
import { getJSDocTagNames } from '../../utils/jsDocUtils';

export class PrimitiveTransformer extends Transformer {
  public static resolveKindToPrimitive(syntaxKind: SyntaxKind): ResolvesToPrimitive {
    switch (syntaxKind) {
      case SyntaxKind.NumberKeyword:
        return 'number';
      case SyntaxKind.StringKeyword:
        return 'string';
      case SyntaxKind.BooleanKeyword:
        return 'boolean';
      case SyntaxKind.VoidKeyword:
        return 'void';
      case SyntaxKind.UndefinedKeyword:
        return 'undefined';
      case SyntaxKind.NullKeyword:
        return 'null';
      default:
        return undefined;
    }
  }

  public transform(typeNode: TypeNode, parentNode?: Node): Tsoa.Type | undefined {
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
      case 'null':
        return {
          dataType: 'enum',
          enums: [null],
        };
      default:
        return assertNever(resolvedType);
    }
  }

  private transformNumber(defaultNumberType: NonNullable<'double' | 'float' | 'integer' | 'long' | undefined>, parentNode?: Node): Tsoa.PrimitiveType {
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

type ResolvesToPrimitive = 'number' | 'string' | 'boolean' | 'void' | 'undefined' | 'null' | undefined;
