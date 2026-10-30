import { SyntaxKind } from '../../compiler/index';
import { Tsoa } from '@tsoa/runtime';

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

  /** The number format selected by `@isInt`/`@isLong`/`@isFloat`/`@isDouble`, else the default. */
  public static numberType(defaultNumberType: DefaultNumberType, jsDocTagNames?: string[]): Tsoa.PrimitiveType {
    if (!jsDocTagNames || jsDocTagNames.length === 0) {
      return { dataType: defaultNumberType };
    }

    const tags = jsDocTagNames.filter(name => {
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
