import type { Token, InterfaceDeclaration, ClassDeclaration, PropertyDeclaration, ParameterDeclaration, ConstructorDeclaration, TypeElement, ClassElement, PropertySignature } from 'typescript';
import { NodeFlags, NodeBuilderFlags, SyntaxKind, isInterfaceDeclaration, isPropertyDeclaration, isConstructorDeclaration, isPropertySignature } from 'typescript';
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
  public transform(resolver: TypeResolver, node: InterfaceDeclaration | ClassDeclaration, overrideToken?: OverrideToken): Tsoa.Property[] {
    const isIgnored = (e: TypeElement | ClassElement) => {
      let ignore = isExistJSDocTag(e, tag => tag.tagName.text === 'ignore');
      ignore = ignore || (e.flags & NodeFlags.ThisNodeHasError) > 0;
      return ignore;
    };

    // Interface model
    if (isInterfaceDeclaration(node)) {
      return node.members
        .filter((member): member is PropertySignature => !isIgnored(member) && isPropertySignature(member))
        .map((member: PropertySignature) => this.propertyFromSignature(resolver, member, overrideToken));
    }

    const properties: Array<PropertyDeclaration | ParameterDeclaration> = [];
    for (const member of node.members) {
      if (!isIgnored(member) && isPropertyDeclaration(member) && !this.hasStaticModifier(member) && this.hasPublicModifier(member)) {
        properties.push(member);
      }
    }

    const classConstructor = node.members.find(member => isConstructorDeclaration(member)) as ConstructorDeclaration;

    if (classConstructor && classConstructor.parameters) {
      const constructorProperties = classConstructor.parameters.filter(parameter => this.isAccessibleParameter(parameter));

      properties.push(...constructorProperties);
    }

    return properties.map(property => this.propertyFromDeclaration(resolver, property, overrideToken));
  }

  private propertyFromSignature(resolver: TypeResolver, propertySignature: PropertySignature, overrideToken?: OverrideToken): Tsoa.Property {
    throwUnless(propertySignature.type, new GenerateMetadataError(`No valid type found for property declaration.`));

    let required = !propertySignature.questionToken;
    if (overrideToken && overrideToken.kind === SyntaxKind.MinusToken) {
      required = true;
    } else if (overrideToken && overrideToken.kind === SyntaxKind.QuestionToken) {
      required = false;
    }

    const def = TypeResolver.getDefault(propertySignature);

    const property: Tsoa.Property = {
      default: def,
      description: resolver.getNodeDescription(propertySignature),
      example: resolver.getNodeExample(propertySignature),
      format: resolver.getNodeFormat(propertySignature),
      name: resolver.getPropertyName(propertySignature),
      required,
      type: new TypeResolver(propertySignature.type, resolver.current, propertySignature.type.parent, resolver.context).resolve(),
      validators: getPropertyValidators(propertySignature) || {},
      deprecated: isExistJSDocTag(propertySignature, tag => tag.tagName.text === 'deprecated'),
      title: resolver.getNodeTitle(propertySignature),
      extensions: resolver.getNodeExtension(propertySignature),
    };
    return property;
  }

  private propertyFromDeclaration(resolver: TypeResolver, propertyDeclaration: PropertyDeclaration | ParameterDeclaration, overrideToken?: OverrideToken): Tsoa.Property {
    let typeNode = propertyDeclaration.type;

    const tsType = resolver.current.typeChecker.getTypeAtLocation(propertyDeclaration);

    if (!typeNode) {
      // Type is from initializer
      typeNode = resolver.current.typeChecker.typeToTypeNode(tsType, undefined, NodeBuilderFlags.NoTruncation)!;
    }

    const type = new TypeResolver(typeNode, resolver.current, propertyDeclaration, resolver.context, tsType).resolve();

    let required = !propertyDeclaration.questionToken && !propertyDeclaration.initializer;
    if (overrideToken && overrideToken.kind === SyntaxKind.MinusToken) {
      required = true;
    } else if (overrideToken && overrideToken.kind === SyntaxKind.QuestionToken) {
      required = false;
    }
    let def = getInitializerValue(propertyDeclaration.initializer, resolver.current.typeChecker);
    if (def === undefined) {
      def = TypeResolver.getDefault(propertyDeclaration);
    }

    const property: Tsoa.Property = {
      default: def,
      description: resolver.getNodeDescription(propertyDeclaration),
      example: resolver.getNodeExample(propertyDeclaration),
      format: resolver.getNodeFormat(propertyDeclaration),
      name: resolver.getPropertyName(propertyDeclaration),
      required,
      type,
      validators: getPropertyValidators(propertyDeclaration) || {},
      // class properties and constructor parameters may be deprecated either via jsdoc annotation or decorator
      deprecated: isExistJSDocTag(propertyDeclaration, tag => tag.tagName.text === 'deprecated') || isDecorator(propertyDeclaration, identifier => identifier.text === 'Deprecated'),
      title: resolver.getNodeTitle(propertyDeclaration),
      extensions: resolver.getNodeExtension(propertyDeclaration),
    };
    return property;
  }
}
