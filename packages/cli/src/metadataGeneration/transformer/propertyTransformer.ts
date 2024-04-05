import type {
  Token,
  Identifier,
  InterfaceDeclaration,
  ClassDeclaration,
  PropertyDeclaration,
  ParameterDeclaration,
  ConstructorDeclaration,
  TypeElement,
  ClassElement,
  PropertySignature,
} from 'typescript';
import {
  NodeFlags,
  NodeBuilderFlags,
  SyntaxKind,
  isInterfaceDeclaration,
  isPropertyDeclaration,
  isConstructorDeclaration,
  isPropertySignature,
} from 'typescript';
import { Tsoa } from '@tsoa/runtime';

import { Transformer } from './transformer';
import { GenerateMetadataError } from '../exceptions';
import { TypeResolver } from '../typeResolver';
import { getInitializerValue } from '../initializer-value';
import { getPropertyValidators } from '../../utils/validatorUtils';
import { isExistJSDocTag } from '../../utils/jsDocUtils';
import { isDecorator } from '../../utils/decoratorUtils';
import { throwUnless } from '../../utils/flowUtils';

type OverrideToken = Token<SyntaxKind.QuestionToken> | Token<SyntaxKind.PlusToken> | Token<SyntaxKind.MinusToken> | undefined;

export class PropertyTransformer extends Transformer {
  public transform(node: InterfaceDeclaration | ClassDeclaration, overrideToken?: OverrideToken): Tsoa.Property[] {
    const isIgnored = (e: TypeElement | ClassElement) => {
      let ignore = isExistJSDocTag(e, tag => tag.tagName.text === 'ignore');
      ignore = ignore || (e.flags & NodeFlags.ThisNodeHasError) > 0;
      return ignore;
    };

    // Interface model
    if (isInterfaceDeclaration(node)) {
      return node.members
        .filter((member): member is PropertySignature => !isIgnored(member) && isPropertySignature(member))
        .map((member: PropertySignature) => this.transformFromSignature(member, overrideToken));
    }

    const properties: Array<PropertyDeclaration | ParameterDeclaration> = [];
    properties.push(
      ...node.members
        .filter((member): member is PropertyDeclaration =>
          !isIgnored(member)
          && isPropertyDeclaration(member)
          && !this.hasStaticModifier(member)
          && this.hasPublicModifier(member)
        ),
    );

    const constructorDeclaration = node.members
      .find((member): member is ConstructorDeclaration =>
        isConstructorDeclaration(member)
        && member.parameters !== undefined
      );
    if (constructorDeclaration) {
      properties.push(
        ...constructorDeclaration
          .parameters
          .filter((parameter) => this.isAccessibleParameter(parameter))
      );
    }

    return properties.map(property => this.transformFromDeclaration(property, overrideToken));
  }

  public transformFromSignature(propertySignature: PropertySignature, overrideToken?: OverrideToken): Tsoa.Property {
    const identifier = propertySignature.name as Identifier;

    throwUnless(
      propertySignature.type,
      new GenerateMetadataError(`No valid type found for property declaration.`),
    );

    let required = !propertySignature.questionToken;
    if (overrideToken && overrideToken.kind === SyntaxKind.MinusToken) {
      required = true;
    } else if (overrideToken && overrideToken.kind === SyntaxKind.QuestionToken) {
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

  public transformFromDeclaration(propertyDeclaration: PropertyDeclaration | ParameterDeclaration, overrideToken?: OverrideToken): Tsoa.Property {
    const identifier = propertyDeclaration.name as Identifier;
    let typeNode = propertyDeclaration.type;

    const tsType = this.resolver.current.typeChecker.getTypeAtLocation(propertyDeclaration);

    if (!typeNode) {
      // Type is from initializer
      typeNode = this.resolver.current.typeChecker.typeToTypeNode(tsType, undefined, NodeBuilderFlags.NoTruncation)!;
    }

    const type = new TypeResolver(typeNode, this.resolver.current, propertyDeclaration, this.resolver.context, tsType).resolve();

    let required = !propertyDeclaration.questionToken && !propertyDeclaration.initializer;
    if (overrideToken && overrideToken.kind === SyntaxKind.MinusToken) {
      required = true;
    } else if (overrideToken && overrideToken.kind === SyntaxKind.QuestionToken) {
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
