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
  Declaration,
  Symbol,
  TypeNode,
} from 'typescript';
import {
  NodeFlags,
  NodeBuilderFlags,
  SyntaxKind,
  isInterfaceDeclaration,
  isPropertyDeclaration,
  isConstructorDeclaration,
  isPropertySignature,
  SymbolFlags,
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

  public transformFromDeclaration(declaration: PropertyDeclaration | ParameterDeclaration, overrideToken?: OverrideToken): Tsoa.Property {
    const identifier = declaration.name as Identifier;
    let typeNode = declaration.type;

    const tsType = this.resolver.current.typeChecker.getTypeAtLocation(declaration);

    if (!typeNode) {
      // Type is from initializer
      typeNode = this.resolver.current.typeChecker.typeToTypeNode(tsType, undefined, NodeBuilderFlags.NoTruncation)!;
    }

    const type = new TypeResolver(typeNode, this.resolver.current, declaration, this.resolver.context, tsType).resolve();

    let required = !declaration.questionToken && !declaration.initializer;
    if (overrideToken && overrideToken.kind === SyntaxKind.MinusToken) {
      required = true;
    } else if (overrideToken && overrideToken.kind === SyntaxKind.QuestionToken) {
      required = false;
    }

    let def = getInitializerValue(declaration.initializer, this.resolver.current.typeChecker);
    if (def === undefined) {
      def = TypeResolver.getDefault(declaration);
    }

    const property: Tsoa.Property = {
      default: def,
      description: this.resolver.getNodeDescription(declaration),
      example: this.resolver.getNodeExample(declaration),
      format: this.resolver.getNodeFormat(declaration),
      name: identifier.text,
      required,
      type,
      validators: getPropertyValidators(declaration) || {},
      // class properties and constructor parameters may be deprecated either via jsdoc annotation or decorator
      deprecated: isExistJSDocTag(declaration, tag => tag.tagName.text === 'deprecated') || isDecorator(declaration, identifier => identifier.text === 'Deprecated'),
      extensions: this.resolver.getNodeExtension(declaration),
    };
    return property;
  }

  public transformFromSymbol(node: TypeNode, symbol: Symbol): Tsoa.Property {
    const declaration = this.getOneOrigDeclaration(symbol);

    const propertyType = this.resolver.current.typeChecker.getTypeOfSymbolAtLocation(symbol, node);
    const typeNode = this.resolver.current.typeChecker.typeToTypeNode(propertyType, undefined, NodeBuilderFlags.NoTruncation)!;
    const type = new TypeResolver(typeNode, this.resolver.current, declaration, this.resolver.context, propertyType).resolve();

    const required = !(this.resolver.hasFlag(symbol, SymbolFlags.Optional));

    const initializer = (declaration as any)?.initializer;
    const def = initializer
      ? getInitializerValue(initializer, this.resolver.current.typeChecker)
      : declaration
        ? TypeResolver.getDefault(declaration) : undefined;

    // Push property
    return {
      name: symbol.getName(),
      required,
      deprecated: declaration ? isExistJSDocTag(declaration, tag => tag.tagName.text === 'deprecated') || isDecorator(declaration, identifier => identifier.text === 'Deprecated') : false,
      type,
      default: def,
      // validators are disjunct via types, so it is now OK.
      // if a type not changes while mapping, we need validators
      // if a type changes, then the validators will be not relevant
      validators: (declaration ? getPropertyValidators(declaration) : {}) || {},
      description: this.resolver.getSymbolDescription(symbol),
      format: declaration ? this.resolver.getNodeFormat(declaration) : undefined,
      example: declaration ? this.resolver.getNodeExample(declaration) : undefined,
      extensions: declaration ? this.resolver.getNodeExtension(declaration) : undefined,
    };
  }

  private getOneOrigDeclaration(prop: Symbol): Declaration | undefined {
    if (prop.declarations) {
      return prop.declarations[0];
    }

    const syntheticOrigin: Symbol = (prop as any).links?.syntheticOrigin;
    if (syntheticOrigin && syntheticOrigin.name === prop.name) {
      //Otherwise losts jsDoc like in intellisense
      return syntheticOrigin.declarations?.[0];
    }
    return undefined;
  };
}
