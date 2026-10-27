import { Tsoa } from '@tsoa/runtime';

import { Transformer } from './transformer';

export class EnumTransformer extends Transformer {
  public static mergeMany(many: Tsoa.RefEnumType[]): Tsoa.RefEnumType {
    let merged = this.merge(many[0], many[1]);
    for (let i = 2; i < many.length; ++i) {
      merged = this.merge(merged, many[i]);
    }
    return merged;
  }

  public static merge(first: Tsoa.RefEnumType, second: Tsoa.RefEnumType): Tsoa.RefEnumType {
    if (!first) return second;
    if (!second) return first;

    const description = first.description ? (second.description ? `${first.description}\n${second.description}` : first.description) : second.description;

    const deprecated = first.deprecated || second.deprecated;

    const enums = first.enums ? (second.enums ? [...first.enums, ...second.enums] : first.enums) : second.enums;

    const enumVarnames = first.enumVarnames ? (second.enumVarnames ? [...first.enumVarnames, ...second.enumVarnames] : first.enumVarnames) : second.enumVarnames;

    const example = first.example ?? second.example;
    const title = first.title || second.title;

    return {
      dataType: 'refEnum',
      description,
      enums,
      enumVarnames,
      refName: first.refName,
      deprecated,
      example,
      ...(title && { title }),
    };
  }
}
