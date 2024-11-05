import { type TypeNode, SyntaxKind } from 'typescript';
import { Tsoa, assertNever } from '@tsoa/runtime';

import { Transformer } from './transformer';

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

  public transform(defaultNumberType: DefaultNumberType, typeNode: TypeNode, partentJsDocTagNames?: string[]): Tsoa.Type | undefined {
    const resolvedType = PrimitiveTransformer.resolveKindToPrimitive(typeNode.kind);
    if (!resolvedType) {
      return;
    }

    switch (resolvedType) {
      case 'number':
        return this.transformNumber(defaultNumberType, partentJsDocTagNames);
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

  private transformNumber(defaultNumberType: DefaultNumberType, partentJsDocTagNames?: string[]): Tsoa.PrimitiveType {
    if (!partentJsDocTagNames || partentJsDocTagNames.length === 0) {
      return { dataType: defaultNumberType };
    }

    const tags = partentJsDocTagNames.filter(name => {
      return ['isInt', 'isLong', 'isFloat', 'isDouble'].some(m => m === name);
    });

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

type DefaultNumberType = NonNullable<'double' | 'float' | 'integer' | 'long' | undefined>;
type ResolvesToPrimitive = 'number' | 'string' | 'boolean' | 'void' | 'undefined' | 'null' | undefined;
