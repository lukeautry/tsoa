import * as ts from 'typescript';
import { Tsoa } from '@tsoa/runtime';

import { Transformer } from './transformer';
import { GenerateMetadataError } from '../exceptions';
import { TypeResolver } from '../typeResolver';
import { getInitializerValue } from '../initializer-value';
import { getPropertyValidators } from '../../utils/validatorUtils';
import { isExistJSDocTag } from '../../utils/jsDocUtils';
import { isDecorator } from '../../utils/decoratorUtils';

type OverrideToken = ts.Token<ts.SyntaxKind.QuestionToken> | ts.Token<ts.SyntaxKind.PlusToken> | ts.Token<ts.SyntaxKind.MinusToken> | undefined;

export class PropertyTransformer extends Transformer {
  public transform(node: ts.InterfaceDeclaration | ts.ClassDeclaration, overrideToken?: OverrideToken): Tsoa.Property[] {
    const isIgnored = (e: ts.TypeElement | ts.ClassElement) => {
      let ignore = isExistJSDocTag(e, tag => tag.tagName.text === 'ignore');
      ignore = ignore || (e.flags & ts.NodeFlags.ThisNodeHasError) > 0;
      return ignore;
    };

    // Interface model
    if (ts.isInterfaceDeclaration(node)) {
      return node.members
        .filter((member): member is ts.PropertySignature => !isIgnored(member) && ts.isPropertySignature(member))
        .map((member: ts.PropertySignature) => this.propertyFromSignature(member, overrideToken));
    }

    const properties: Array<ts.PropertyDeclaration | ts.ParameterDeclaration> = [];
    for (const member of node.members) {
      if (!isIgnored(member) && ts.isPropertyDeclaration(member) && !this.hasStaticModifier(member) && this.hasPublicModifier(member)) {
        properties.push(member);
      }
    }

    const classConstructor = node.members.find(member => ts.isConstructorDeclaration(member)) as ts.ConstructorDeclaration;

    if (classConstructor && classConstructor.parameters) {
      const constructorProperties = classConstructor.parameters.filter(parameter => this.isAccessibleParameter(parameter));

      properties.push(...constructorProperties);
    }

    return properties.map(property => this.propertyFromDeclaration(property, overrideToken));
  }

  private propertyFromSignature(propertySignature: ts.PropertySignature, overrideToken?: OverrideToken): Tsoa.Property {
    const identifier = propertySignature.name as ts.Identifier;

    if (!propertySignature.type) {
      throw new GenerateMetadataError(`No valid type found for property declaration.`);
    }

    let required = !propertySignature.questionToken;
    if (overrideToken && overrideToken.kind === ts.SyntaxKind.MinusToken) {
      required = true;
    } else if (overrideToken && overrideToken.kind === ts.SyntaxKind.QuestionToken) {
      required = false;
    }

    const def = TypeResolver.getDefault(propertySignature);

    const property: Tsoa.Property = {
      default: def,
      description: this.resolver.getNodeDescription(propertySignature),
      example: this.resolver.getNodeExample(propertySignature),
      format: this.resolver.getNodeFormat(propertySignature),
      name: identifier.text,
      required,
      type: new TypeResolver(propertySignature.type, this.resolver.current, propertySignature.type.parent, this.resolver.context).resolve(),
      validators: getPropertyValidators(propertySignature) || {},
      deprecated: isExistJSDocTag(propertySignature, tag => tag.tagName.text === 'deprecated'),
      extensions: this.resolver.getNodeExtension(propertySignature),
    };
    return property;
  }

  private propertyFromDeclaration(propertyDeclaration: ts.PropertyDeclaration | ts.ParameterDeclaration, overrideToken?: OverrideToken): Tsoa.Property {
    const identifier = propertyDeclaration.name as ts.Identifier;
    let typeNode = propertyDeclaration.type;

    const tsType = this.resolver.current.typeChecker.getTypeAtLocation(propertyDeclaration);

    if (!typeNode) {
      // Type is from initializer
      typeNode = this.resolver.current.typeChecker.typeToTypeNode(tsType, undefined, ts.NodeBuilderFlags.NoTruncation)!;
    }

    const type = new TypeResolver(typeNode, this.resolver.current, propertyDeclaration, this.resolver.context, tsType).resolve();

    let required = !propertyDeclaration.questionToken && !propertyDeclaration.initializer;
    if (overrideToken && overrideToken.kind === ts.SyntaxKind.MinusToken) {
      required = true;
    } else if (overrideToken && overrideToken.kind === ts.SyntaxKind.QuestionToken) {
      required = false;
    }
    let def = getInitializerValue(propertyDeclaration.initializer, this.resolver.current.typeChecker);
    if (def === undefined) {
      def = TypeResolver.getDefault(propertyDeclaration);
    }

    const property: Tsoa.Property = {
      default: def,
      description: this.resolver.getNodeDescription(propertyDeclaration),
      example: this.resolver.getNodeExample(propertyDeclaration),
      format: this.resolver.getNodeFormat(propertyDeclaration),
      name: identifier.text,
      required,
      type,
      validators: getPropertyValidators(propertyDeclaration) || {},
      // class properties and constructor parameters may be deprecated either via jsdoc annotation or decorator
      deprecated: isExistJSDocTag(propertyDeclaration, tag => tag.tagName.text === 'deprecated') || isDecorator(propertyDeclaration, identifier => identifier.text === 'Deprecated'),
      extensions: this.resolver.getNodeExtension(propertyDeclaration),
    };
    return property;
  }
}
