import * as ts from 'typescript';
import { Tsoa } from '@tsoa/runtime';

import { Transformer } from './transformer';
import { isExistJSDocTag } from '../../utils/jsDocUtils';

export class EnumTransformer extends Transformer {
  public static mergeMany(many: Tsoa.RefEnumType[]): Tsoa.RefEnumType {
    let merged = this.merge(many[0], many[1]);
    for (let i = 2; i < many.length; ++i) {
      merged = this.merge(merged, many[i]);
    }
    return merged;
  }

  public static merge(first: Tsoa.RefEnumType, second: Tsoa.RefEnumType): Tsoa.RefEnumType {
    const description = first.description ? (second.description ? `${first.description}\n${second.description}` : first.description) : second.description;

    const deprecated = first.deprecated || second.deprecated;

    const enums = first.enums ? (second.enums ? [...first.enums, ...second.enums] : first.enums) : second.enums;

    const enumVarnames = first.enumVarnames ? (second.enumVarnames ? [...first.enumVarnames, ...second.enumVarnames] : first.enumVarnames) : second.enumVarnames;

    return {
      dataType: 'refEnum',
      description,
      enums,
      enumVarnames,
      refName: first.refName,
      deprecated,
    };
  }

  public static transformable(declaration: ts.Node): declaration is ts.EnumDeclaration | ts.EnumMember {
    return ts.isEnumDeclaration(declaration) || ts.isEnumMember(declaration);
  }

  public transform(declaration: ts.EnumDeclaration | ts.EnumMember, enumName: string): Tsoa.RefEnumType {
    if (ts.isEnumDeclaration(declaration)) {
      return this.transformDeclaration(declaration, enumName);
    }
    return this.transformMember(declaration, enumName);
  }

  private transformDeclaration(declaration: ts.EnumDeclaration, enumName: string): Tsoa.RefEnumType {
    const enums = declaration.members.map(e => this.resolver.current.typeChecker.getConstantValue(e)).filter(this.isNotUndefined);
    const enumVarnames = declaration.members.map(e => e.name.getText()).filter(this.isNotUndefined);

    return {
      dataType: 'refEnum',
      description: this.resolver.getNodeDescription(declaration),
      enums,
      enumVarnames,
      refName: enumName,
      deprecated: isExistJSDocTag(declaration, tag => tag.tagName.text === 'deprecated'),
    };
  }

  private transformMember(declaration: ts.EnumMember, enumName: string): Tsoa.RefEnumType {
    return {
      dataType: 'refEnum',
      refName: enumName,
      enums: [this.resolver.current.typeChecker.getConstantValue(declaration)!],
      enumVarnames: [declaration.name.getText()],
      deprecated: isExistJSDocTag(declaration, tag => tag.tagName.text === 'deprecated'),
    }
  }

  private isNotUndefined<T>(item: T): item is Exclude<T, undefined> {
    return item === undefined ? false : true;
  }
}
