import type {
  Token,
  InterfaceDeclaration,
  ClassDeclaration,
  PropertyDeclaration,
  ParameterDeclaration,
  ConstructorDeclaration,
  TypeElement,
  ClassElement,
  PropertySignatureDeclaration,
} from '../../ts';
import { hasQuestionToken, map, NodeFlags, SyntaxKind, isInterfaceDeclaration, isPropertyDeclaration, isConstructorDeclaration, isPropertySignatureDeclaration, type Op } from '../../ts';
import { Tsoa } from '@tsoa/runtime';
import { printType } from '../syntheticChildType';

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
  public *transform(resolver: TypeResolver, node: InterfaceDeclaration | ClassDeclaration, overrideToken?: OverrideToken): Op<Tsoa.Property[]> {
    const isIgnored = (e: TypeElement | ClassElement) => {
      let ignore = isExistJSDocTag(e, tag => tag.tagName.text === 'ignore');
      ignore = ignore || (e.flags & NodeFlags.ThisNodeHasError) > 0;
      return ignore;
    };

    // Interface model
    if (isInterfaceDeclaration(node)) {
      const members = node.members.filter((member): member is PropertySignatureDeclaration => !isIgnored(member) && isPropertySignatureDeclaration(member));
      return yield* map(members, member => this.propertyFromSignature(resolver, member, overrideToken));
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

    return yield* map(properties, property => this.propertyFromDeclaration(resolver, property, overrideToken));
  }

  private *propertyFromSignature(resolver: TypeResolver, propertySignature: PropertySignatureDeclaration, overrideToken?: OverrideToken): Op<Tsoa.Property> {
    throwUnless(propertySignature.type, new GenerateMetadataError(`No valid type found for property declaration.`));

    let required = !hasQuestionToken(propertySignature);
    if (overrideToken && overrideToken.kind === SyntaxKind.MinusToken) {
      required = true;
    } else if (overrideToken && overrideToken.kind === SyntaxKind.QuestionToken) {
      required = false;
    }

    const def = TypeResolver.getDefault(propertySignature);

    const property: Tsoa.Property = {
      default: def,
      description: yield* resolver.getNodeDescription(propertySignature),
      example: yield* resolver.getNodeExample(propertySignature),
      format: resolver.getNodeFormat(propertySignature),
      name: yield* resolver.getPropertyName(propertySignature),
      required,
      type: yield* new TypeResolver(propertySignature.type, resolver.current, propertySignature.type.parent, resolver.context, undefined, undefined, resolver.ancestors).resolve(),
      validators: getPropertyValidators(propertySignature) || {},
      deprecated: isExistJSDocTag(propertySignature, tag => tag.tagName.text === 'deprecated'),
      title: resolver.getNodeTitle(propertySignature),
      extensions: yield* resolver.getNodeExtension(propertySignature),
    };
    return property;
  }

  private *propertyFromDeclaration(resolver: TypeResolver, propertyDeclaration: PropertyDeclaration | ParameterDeclaration, overrideToken?: OverrideToken): Op<Tsoa.Property> {
    let typeNode = propertyDeclaration.type;

    const tsType = yield* resolver.current.typeChecker.getTypeAtLocation.gen(propertyDeclaration);

    if (!typeNode) {
      // Type is from initializer
      typeNode = (yield* printType(resolver.current.typeChecker, tsType))!;
    }

    const type = yield* new TypeResolver(typeNode, resolver.current, propertyDeclaration, resolver.context, tsType, undefined, resolver.ancestors).resolve();

    let required = !hasQuestionToken(propertyDeclaration) && !propertyDeclaration.initializer;
    if (overrideToken && overrideToken.kind === SyntaxKind.MinusToken) {
      required = true;
    } else if (overrideToken && overrideToken.kind === SyntaxKind.QuestionToken) {
      required = false;
    }
    let def = yield* getInitializerValue(propertyDeclaration.initializer, resolver.current.typeChecker);
    if (def === undefined) {
      def = TypeResolver.getDefault(propertyDeclaration);
    }

    const property: Tsoa.Property = {
      default: def,
      description: yield* resolver.getNodeDescription(propertyDeclaration),
      example: yield* resolver.getNodeExample(propertyDeclaration),
      format: resolver.getNodeFormat(propertyDeclaration),
      name: yield* resolver.getPropertyName(propertyDeclaration),
      required,
      type,
      validators: getPropertyValidators(propertyDeclaration) || {},
      // class properties and constructor parameters may be deprecated either via jsdoc annotation or decorator
      deprecated: isExistJSDocTag(propertyDeclaration, tag => tag.tagName.text === 'deprecated') || isDecorator(propertyDeclaration, identifier => identifier.text === 'Deprecated'),
      title: resolver.getNodeTitle(propertyDeclaration),
      extensions: yield* resolver.getNodeExtension(propertyDeclaration),
    };
    return property;
  }
}
