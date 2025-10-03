import type { Node, EnumDeclaration, EnumMember } from 'typescript';
import { isEnumDeclaration, isEnumMember } from 'typescript';
import { Tsoa } from '@tsoa/runtime';

import { Transformer } from './transformer';
import { isExistJSDocTag } from '../../utils/jsDocUtils';
import { TypeResolver } from '../typeResolver';

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

    const example = first.example || second.example;

    return {
      dataType: 'refEnum',
      description,
      enums,
      enumVarnames,
      refName: first.refName,
      deprecated,
      example,
    };
  }

  public static transformable(declaration: Node): declaration is EnumDeclaration | EnumMember {
    return isEnumDeclaration(declaration) || isEnumMember(declaration);
  }

  public transform(resolver: TypeResolver, declaration: EnumDeclaration | EnumMember, enumName: string): Tsoa.RefEnumType {
    if (isEnumDeclaration(declaration)) {
      return this.transformDeclaration(resolver, declaration, enumName);
    }
    return this.transformMember(resolver, declaration, enumName);
  }

  private transformDeclaration(resolver: TypeResolver, declaration: EnumDeclaration, enumName: string): Tsoa.RefEnumType {
    const isNotUndefined = <T>(item: T): item is Exclude<T, undefined> => {
      return item === undefined ? false : true;
    };
    const enums = declaration.members.map(e => resolver.current.typeChecker.getConstantValue(e)).filter(isNotUndefined);
    const enumVarnames = declaration.members.map(e => e.name.getText()).filter(isNotUndefined);

    return {
      dataType: 'refEnum',
      description: resolver.getNodeDescription(declaration),
      example: resolver.getNodeExample(declaration),
      enums,
      enumVarnames,
      refName: enumName,
      deprecated: isExistJSDocTag(declaration, tag => tag.tagName.text === 'deprecated'),
    };
  }

  private transformMember(resolver: TypeResolver, declaration: EnumMember, enumName: string): Tsoa.RefEnumType {
    return {
      dataType: 'refEnum',
      refName: enumName,
      enums: [resolver.current.typeChecker.getConstantValue(declaration)!],
      enumVarnames: [declaration.name.getText()],
      deprecated: isExistJSDocTag(declaration, tag => tag.tagName.text === 'deprecated'),
    };
  }
}
