import * as ts from 'typescript';
import { assertNever } from '../utils/assertNever';
import { getJSDocComment, getJSDocTagNames, isExistJSDocTag } from './../utils/jsDocUtils';
import { getPropertyValidators } from './../utils/validatorUtils';
import { GenerateMetadataError } from './exceptions';
import { getInitializerValue } from './initializer-value';
import { MetadataGenerator } from './metadataGenerator';
import { Tsoa } from './tsoa';

const localReferenceTypeCache: { [typeName: string]: Tsoa.ReferenceType } = {};
const inProgressTypes: { [typeName: string]: boolean } = {};

type UsableDeclaration = ts.InterfaceDeclaration | ts.ClassDeclaration | ts.PropertySignature | ts.TypeAliasDeclaration;
interface Context {
  [name: string]: ts.TypeReferenceNode | ts.TypeNode;
}

export class TypeResolver {
  constructor(
    private readonly typeNode: ts.TypeNode,
    private readonly current: MetadataGenerator,
    private readonly parentNode?: ts.Node,
    private readonly extractEnum = true,
    private context: Context = {},
  ) {}

  public static clearCache() {
    Object.keys(localReferenceTypeCache).forEach(key => {
      delete localReferenceTypeCache[key];
    });

    Object.keys(inProgressTypes).forEach(key => {
      delete inProgressTypes[key];
    });
  }

  public resolve(): Tsoa.Type {
    const primitiveType = this.getPrimitiveType(this.typeNode, this.parentNode);
    if (primitiveType) {
      return primitiveType;
    }

    if (this.typeNode.kind === ts.SyntaxKind.ArrayType) {
      const arrayMetaType: Tsoa.ArrayType = {
        dataType: 'array',
        elementType: new TypeResolver((this.typeNode as ts.ArrayTypeNode).elementType, this.current, this.parentNode, this.extractEnum, this.context).resolve(),
      };
      return arrayMetaType;
    }

    if (ts.isUnionTypeNode(this.typeNode)) {
      const supportType = this.typeNode.types.every(type => ts.isLiteralTypeNode(type));

      if (supportType) {
        const enumMetaType: Tsoa.EnumType = {
          dataType: 'enum',
          enums: (this.typeNode.types as ts.NodeArray<ts.LiteralTypeNode>).map(type => {
            switch (type.literal.kind) {
              case ts.SyntaxKind.TrueKeyword:
                return 'true';
              case ts.SyntaxKind.FalseKeyword:
                return 'false';
              default:
                return String((type.literal as ts.LiteralExpression).text);
            }
          }),
        };
        return enumMetaType;
      } else {
        const types = this.typeNode.types.map(type => {
          return new TypeResolver(type, this.current, this.parentNode, this.extractEnum, this.context).resolve();
        });

        const unionMetaType: Tsoa.UnionType = {
          dataType: 'union',
          types,
        };
        return unionMetaType;
      }
    }

    if (ts.isIntersectionTypeNode(this.typeNode)) {
      const types = this.typeNode.types.map(type => {
        return new TypeResolver(type, this.current, this.parentNode, this.extractEnum, this.context).resolve();
      });

      const intersectionMetaType: Tsoa.IntersectionType = {
        dataType: 'intersection',
        types,
      };

      return intersectionMetaType;
    }

    if (this.typeNode.kind === ts.SyntaxKind.AnyKeyword) {
      const literallyAny: Tsoa.AnyType = {
        dataType: 'any',
      };
      return literallyAny;
    }

    if (ts.isTypeLiteralNode(this.typeNode)) {
      const properties = this.typeNode.members
        .filter(member => ts.isPropertySignature(member))
        .reduce((res, propertySignature: ts.PropertySignature) => {
          const type = new TypeResolver(propertySignature.type as ts.TypeNode, this.current, propertySignature, this.extractEnum, this.context).resolve();
          const property: Tsoa.Property = {
            default: getJSDocComment(propertySignature, 'default'),
            description: this.getNodeDescription(propertySignature),
            format: this.getNodeFormat(propertySignature),
            name: (propertySignature.name as ts.Identifier).text,
            required: !propertySignature.questionToken,
            type,
            validators: getPropertyValidators(propertySignature) || {},
          };

          return [property, ...res];
        }, []);

      const indexMember = this.typeNode.members.find(member => ts.isIndexSignatureDeclaration(member));
      let additionalType: Tsoa.Type | undefined;

      if (indexMember) {
        const indexSignatureDeclaration = indexMember as ts.IndexSignatureDeclaration;
        const indexType = new TypeResolver(indexSignatureDeclaration.parameters[0].type as ts.TypeNode, this.current, this.parentNode, this.extractEnum, this.context).resolve();
        if (indexType.dataType !== 'string') {
          throw new GenerateMetadataError(`Only string indexers are supported.`, this.typeNode);
        }

        additionalType = new TypeResolver(indexSignatureDeclaration.type as ts.TypeNode, this.current, this.parentNode, this.extractEnum, this.context).resolve();
      }

      const objLiteral: Tsoa.NestedObjectLiteralType = {
        additionalProperties: indexMember && additionalType,
        dataType: 'nestedObjectLiteral',
        properties,
      };
      return objLiteral;
    }

    if (this.typeNode.kind === ts.SyntaxKind.ObjectKeyword) {
      return { dataType: 'object' };
    }

    if (this.typeNode.kind !== ts.SyntaxKind.TypeReference) {
      throw new GenerateMetadataError(`Unknown type: ${ts.SyntaxKind[this.typeNode.kind]}`, this.typeNode);
    }

    const typeReference = this.typeNode as ts.TypeReferenceNode;
    if (typeReference.typeName.kind === ts.SyntaxKind.Identifier) {
      if (typeReference.typeName.text === 'Date') {
        return this.getDateType(this.parentNode);
      }

      if (typeReference.typeName.text === 'Buffer') {
        const bufferMetaType: Tsoa.BufferType = { dataType: 'buffer' };
        return bufferMetaType;
      }

      if (typeReference.typeName.text === 'Array' && typeReference.typeArguments && typeReference.typeArguments.length === 1) {
        const arrayMetaType: Tsoa.ArrayType = {
          dataType: 'array',
          elementType: new TypeResolver(typeReference.typeArguments[0], this.current, this.parentNode, this.extractEnum, this.context).resolve(),
        };
        return arrayMetaType;
      }

      if (typeReference.typeName.text === 'Promise' && typeReference.typeArguments && typeReference.typeArguments.length === 1) {
        return new TypeResolver(typeReference.typeArguments[0], this.current, this.parentNode, this.extractEnum, this.context).resolve();
      }

      if (typeReference.typeName.text === 'String') {
        const stringMetaType: Tsoa.StringType = { dataType: 'string' };
        return stringMetaType;
      }

      if (this.context[typeReference.typeName.text]) {
        return new TypeResolver(this.context[typeReference.typeName.text], this.current, this.parentNode, this.extractEnum, this.context).resolve();
      }
    }

    if (!this.extractEnum) {
      const enumType = this.getEnumerateType(typeReference.typeName, this.extractEnum);
      if (enumType) {
        return enumType;
      }
    }

    const literalType = this.getLiteralType(typeReference.typeName);
    if (literalType) {
      return literalType;
    }

    const enumOrReferenceType = this.getReferenceTypeOrEnumType(typeReference);

    if (enumOrReferenceType.dataType === 'refEnum' || enumOrReferenceType.dataType === 'refObject' || enumOrReferenceType.dataType === 'refAlias') {
      this.current.AddReferenceType(enumOrReferenceType);
      return enumOrReferenceType;
    } else if (enumOrReferenceType.dataType === 'enum') {
      // then there is no reference to add to the reference type map
      // but we should still return it (if they want it)
      if (!this.extractEnum) {
        return enumOrReferenceType;
      }
    } else {
      assertNever(enumOrReferenceType);
    }

    return enumOrReferenceType;
  }

  private getPrimitiveType(typeNode: ts.TypeNode, parentNode?: ts.Node): Tsoa.PrimitiveType | undefined {
    const resolution = this.attemptToResolveKindToPrimitive(typeNode.kind);
    if (!resolution.foundMatch) {
      return;
    }

    if (resolution.resolvedType === 'number') {
      if (!parentNode) {
        return { dataType: 'double' };
      }

      const tags = getJSDocTagNames(parentNode).filter(name => {
        return ['isInt', 'isLong', 'isFloat', 'isDouble'].some(m => m === name);
      });
      if (tags.length === 0) {
        return { dataType: 'double' };
      }

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
          return { dataType: 'double' };
      }
    } else if (resolution.resolvedType === 'string') {
      return {
        dataType: 'string',
      };
    } else if (resolution.resolvedType === 'boolean') {
      return {
        dataType: 'boolean',
      };
    } else if (resolution.resolvedType === 'void') {
      return {
        dataType: 'void',
      };
    } else {
      return assertNever(resolution.resolvedType);
    }
  }

  private getDateType(parentNode?: ts.Node): Tsoa.DateType | Tsoa.DateTimeType {
    if (!parentNode) {
      return { dataType: 'datetime' };
    }
    const tags = getJSDocTagNames(parentNode).filter(name => {
      return ['isDate', 'isDateTime'].some(m => m === name);
    });

    if (tags.length === 0) {
      return { dataType: 'datetime' };
    }
    switch (tags[0]) {
      case 'isDate':
        return { dataType: 'date' };
      case 'isDateTime':
        return { dataType: 'datetime' };
      default:
        return { dataType: 'datetime' };
    }
  }

  private getEnumerateType(typeName: ts.EntityName, extractEnum = true): Tsoa.EnumType | Tsoa.RefEnumType | undefined {
    const enumName = (typeName as ts.Identifier).text;
    const enumNodes = this.current.nodes.filter(node => node.kind === ts.SyntaxKind.EnumDeclaration).filter(node => (node as any).name.text === enumName);

    if (!enumNodes.length) {
      return;
    }
    if (enumNodes.length > 1) {
      throw new GenerateMetadataError(`Multiple matching enum found for enum ${enumName}; please make enum names unique.`);
    }

    const enumDeclaration = enumNodes[0] as ts.EnumDeclaration;

    const typeChecker = this.current.typeChecker;
    function getEnumValue(member: any) {
      const constantValue = typeChecker.getConstantValue(member);
      if (constantValue != null) {
        return constantValue;
      }
      const initializer = member.initializer;
      if (initializer) {
        if (initializer.expression) {
          return initializer.expression.text;
        }
        return initializer.text;
      }
      return;
    }

    if (extractEnum) {
      const enums = enumDeclaration.members.map((member: any, index) => {
        const enumValue = getEnumValue(member);
        if (enumValue !== 0 && enumValue !== '' && !enumValue) {
          return String(index);
        }
        return enumValue;
      });
      return {
        dataType: 'refEnum',
        description: this.getNodeDescription(enumDeclaration),
        enums,
        refName: enumName,
      };
    } else {
      return {
        dataType: 'enum',
        enums: enumDeclaration.members.map((member: any, index) => {
          return getEnumValue(member) || String(index);
        }),
      };
    }
  }

  private getLiteralType(typeName: ts.EntityName): Tsoa.EnumType | Tsoa.AnyType | undefined {
    const literalName = (typeName as ts.Identifier).text;
    const literalTypes = this.current.nodes
      .filter(node => node.kind === ts.SyntaxKind.TypeAliasDeclaration)
      .filter(node => {
        const innerType = (node as any).type;
        return innerType.kind === ts.SyntaxKind.UnionType && (innerType as any).types;
      })
      .filter(node => (node as any).name.text === literalName);

    if (!literalTypes.length) {
      return;
    }
    if (literalTypes.length > 1) {
      throw new GenerateMetadataError(`Multiple matching enum found for enum ${literalName}; please make enum names unique.`);
    }

    const unionTypes = (literalTypes[0] as any).type.types as any[];
    if (unionTypes.some(t => !t.literal || t.literal.text === null || t.literal.text === undefined)) {
      // resolve the union
      return;
    }

    return {
      dataType: 'enum',
      enums: unionTypes.map(unionNode => unionNode.literal.text as string),
    } as Tsoa.EnumType;
  }

  private getReferenceTypeOrEnumType(node: ts.TypeReferenceNode | ts.ExpressionWithTypeArguments): Tsoa.ReferenceType | Tsoa.EnumType {
    let type: ts.EntityName;
    if (ts.isTypeReferenceNode(node)) {
      type = node.typeName;
    } else if (ts.isExpressionWithTypeArguments(node)) {
      type = node.expression as ts.EntityName;
    } else {
      throw new GenerateMetadataError(`Can't resolve Reference type.`);
    }

    const name = this.contextualizedName(node.getText());

    if (node.typeArguments && node.typeArguments.length > 0) {
      this.typeArgumentsToContext(node, type, this.context);
    }

    try {
      const existingType = localReferenceTypeCache[name];
      if (existingType) {
        return existingType;
      }

      const enumOrRefEnum = this.getEnumerateType(type, true);
      if (enumOrRefEnum) {
        if (enumOrRefEnum.dataType === 'refEnum') {
          localReferenceTypeCache[name] = enumOrRefEnum;
          return enumOrRefEnum;
        } else if (enumOrRefEnum.dataType === 'enum') {
          // Since an enum that is not reusable can't be referenced, we don't put it in the cache.
          // Also it doesn't qualify as a ref type, so might want to return it (if they've asked for it)
          if (!this.extractEnum) {
            return enumOrRefEnum;
          }
        } else {
          assertNever(enumOrRefEnum);
        }
      }

      if (inProgressTypes[name]) {
        return this.createCircularDependencyResolver(name);
      }

      inProgressTypes[name] = true;

      const declaration = this.getModelTypeDeclaration(type);

      let referenceType: Tsoa.ReferenceType;
      if (ts.isTypeAliasDeclaration(declaration)) {
        referenceType = this.getTypeAliasReference(declaration, name);
      } else {
        referenceType = this.getModelReference(declaration, name);
      }

      localReferenceTypeCache[name] = referenceType;

      return referenceType;
    } catch (err) {
      // tslint:disable-next-line:no-console
      console.error(`There was a problem resolving type of '${name}'.`);
      throw err;
    }
  }

  private getTypeAliasReference(declaration: ts.TypeAliasDeclaration, name: string): Tsoa.ReferenceType {
    const example = this.getNodeExample(declaration);

    return {
      dataType: 'refAlias',
      description: this.getNodeDescription(declaration),
      refName: this.getRefTypeName(name),
      type: new TypeResolver(declaration.type, this.current, declaration, this.extractEnum, this.context).resolve(),
      validators: getPropertyValidators(declaration) || {},
      ...(example && { example }),
    };
  }

  private getModelReference(modelType: ts.InterfaceDeclaration | ts.ClassDeclaration, name: string) {
    const properties = this.getModelProperties(modelType);
    const additionalProperties = this.getModelAdditionalProperties(modelType);
    const inheritedProperties = this.getModelInheritedProperties(modelType) || [];
    const example = this.getNodeExample(modelType);

    const referenceType: Tsoa.ReferenceType = {
      additionalProperties,
      dataType: 'refObject',
      description: this.getNodeDescription(modelType),
      properties: inheritedProperties,
      refName: this.getRefTypeName(name),
      ...(example && { example }),
    };

    referenceType.properties = referenceType.properties.concat(properties);

    return referenceType;
  }

  private getRefTypeName(name: string): string {
    return encodeURIComponent(
      name
        .replace(/<|>/g, '_')
        .replace(/ /g, '')
        .replace(/,/g, '.')
        .replace(/\'(.*)\'|\"(.*)\'/g, '$1')
        .replace(/&/g, '~AND')
        .replace(/\[\]/g, 'Array'),
    );
  }

  private attemptToResolveKindToPrimitive = (syntaxKind: ts.SyntaxKind): ResolvesToPrimitive | DoesNotResolveToPrimitive => {
    if (syntaxKind === ts.SyntaxKind.NumberKeyword) {
      return {
        foundMatch: true,
        resolvedType: 'number',
      };
    } else if (syntaxKind === ts.SyntaxKind.StringKeyword) {
      return {
        foundMatch: true,
        resolvedType: 'string',
      };
    } else if (syntaxKind === ts.SyntaxKind.BooleanKeyword) {
      return {
        foundMatch: true,
        resolvedType: 'boolean',
      };
    } else if (syntaxKind === ts.SyntaxKind.VoidKeyword) {
      return {
        foundMatch: true,
        resolvedType: 'void',
      };
    } else {
      return {
        foundMatch: false,
      };
    }
  };

  private contextualizedName(name: string): string {
    return Object.entries(this.context).reduce((acc, [key, entry]) => {
      return acc
        .replace(new RegExp(`<\s*${key}\s*>`, 'g'), `<${entry.getText()}>`)
        .replace(new RegExp(`<\s*${key}\s*,`, 'g'), `<${entry.getText()},`)
        .replace(new RegExp(`,\s*${key}\s*>`, 'g'), `,${entry.getText()}>`)
        .replace(new RegExp(`<\s*${key}\s*<`, 'g'), `<${entry.getText()}<`);
    }, name);
  }

  private createCircularDependencyResolver(refName: string) {
    const referenceType = {
      dataType: 'refObject',
      refName,
    } as Tsoa.ReferenceType;

    this.current.OnFinish(referenceTypes => {
      const realReferenceType = referenceTypes[refName];
      if (!realReferenceType) {
        return;
      }
      referenceType.description = realReferenceType.description;
      if (realReferenceType.dataType === 'refObject' && referenceType.dataType === 'refObject') {
        referenceType.properties = realReferenceType.properties;
      }
      referenceType.dataType = realReferenceType.dataType;
      referenceType.refName = referenceType.refName;
    });

    return referenceType;
  }

  private nodeIsUsable(node: ts.Node) {
    switch (node.kind) {
      case ts.SyntaxKind.InterfaceDeclaration:
      case ts.SyntaxKind.ClassDeclaration:
      case ts.SyntaxKind.TypeAliasDeclaration:
      case ts.SyntaxKind.EnumDeclaration:
        return true;
      default:
        return false;
    }
  }

  private resolveLeftmostIdentifier(type: ts.EntityName): ts.Identifier {
    while (type.kind !== ts.SyntaxKind.Identifier) {
      type = (type as ts.QualifiedName).left;
    }
    return type as ts.Identifier;
  }

  private resolveModelTypeScope(leftmost: ts.EntityName, statements: any): any[] {
    while (leftmost.parent && leftmost.parent.kind === ts.SyntaxKind.QualifiedName) {
      const leftmostName = leftmost.kind === ts.SyntaxKind.Identifier ? (leftmost as ts.Identifier).text : (leftmost as ts.QualifiedName).right.text;
      const moduleDeclarations = statements.filter(node => {
        if (node.kind !== ts.SyntaxKind.ModuleDeclaration || !this.current.IsExportedNode(node)) {
          return false;
        }

        const moduleDeclaration = node as ts.ModuleDeclaration;
        return (moduleDeclaration.name as ts.Identifier).text.toLowerCase() === leftmostName.toLowerCase();
      }) as ts.ModuleDeclaration[];

      if (!moduleDeclarations.length) {
        throw new GenerateMetadataError(`No matching module declarations found for ${leftmostName}.`);
      }
      if (moduleDeclarations.length > 1) {
        throw new GenerateMetadataError(`Multiple matching module declarations found for ${leftmostName}; please make module declarations unique.`);
      }

      const moduleBlock = moduleDeclarations[0].body as ts.ModuleBlock;
      if (moduleBlock === null || moduleBlock.kind !== ts.SyntaxKind.ModuleBlock) {
        throw new GenerateMetadataError(`Module declaration found for ${leftmostName} has no body.`);
      }

      statements = moduleBlock.statements;
      leftmost = leftmost.parent as ts.EntityName;
    }

    return statements;
  }

  private getModelTypeDeclaration(type: ts.EntityName) {
    const leftmostIdentifier = this.resolveLeftmostIdentifier(type);
    const statements: any[] = this.resolveModelTypeScope(leftmostIdentifier, this.current.nodes);

    const typeName = type.kind === ts.SyntaxKind.Identifier ? (type as ts.Identifier).text : (type as ts.QualifiedName).right.text;

    let modelTypes = statements.filter(node => {
      if (!this.nodeIsUsable(node) || !this.current.IsExportedNode(node)) {
        return false;
      }

      const modelTypeDeclaration = node as UsableDeclaration;
      return (modelTypeDeclaration.name as ts.Identifier).text === typeName;
    }) as Array<Exclude<UsableDeclaration, ts.PropertySignature>>;

    if (!modelTypes.length) {
      throw new GenerateMetadataError(
        `No matching model found for referenced type ${typeName}. If ${typeName} comes from a dependency, please create an interface in your own code that has the same structure. Tsoa can not utilize interfaces from external dependencies. Read more at https://github.com/lukeautry/tsoa/blob/master/docs/ExternalInterfacesExplanation.MD`,
      );
    }

    if (modelTypes.length > 1) {
      // remove types that are from typescript e.g. 'Account'
      modelTypes = modelTypes.filter(modelType => {
        if (
          modelType
            .getSourceFile()
            .fileName.replace(/\\/g, '/')
            .toLowerCase()
            .indexOf('node_modules/typescript') > -1
        ) {
          return false;
        }

        return true;
      });

      /**
       * Model is marked with '@tsoaModel', indicating that it should be the 'canonical' model used
       */
      const designatedModels = modelTypes.filter(modelType => {
        const isDesignatedModel = isExistJSDocTag(modelType, tag => tag.tagName.text === 'tsoaModel');
        return isDesignatedModel;
      });

      if (designatedModels.length > 0) {
        if (designatedModels.length > 1) {
          throw new GenerateMetadataError(`Multiple models for ${typeName} marked with '@tsoaModel'; '@tsoaModel' should only be applied to one model.`);
        }

        modelTypes = designatedModels;
      }
    }
    if (modelTypes.length > 1) {
      const conflicts = modelTypes.map(modelType => modelType.getSourceFile().fileName).join('"; "');
      throw new GenerateMetadataError(`Multiple matching models found for referenced type ${typeName}; please make model names unique. Conflicts found: "${conflicts}".`);
    }

    return modelTypes[0];
  }

  private getModelProperties(node: UsableDeclaration): Tsoa.Property[] {
    const isIgnored = (e: ts.TypeElement | ts.ClassElement) => {
      const ignore = isExistJSDocTag(e, tag => tag.tagName.text === 'ignore');
      return ignore;
    };

    // Interface model
    if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
      const interfaceDeclaration = node as ts.InterfaceDeclaration;
      return interfaceDeclaration.members
        .filter(member => {
          const ignore = isIgnored(member);
          return !ignore && member.kind === ts.SyntaxKind.PropertySignature;
        })
        .map((member: any) => {
          const propertyDeclaration = member as ts.PropertyDeclaration;
          const identifier = propertyDeclaration.name as ts.Identifier;

          if (!propertyDeclaration.type) {
            throw new GenerateMetadataError(`No valid type found for property declaration.`);
          }

          return {
            default: getJSDocComment(propertyDeclaration, 'default'),
            description: this.getNodeDescription(propertyDeclaration),
            format: this.getNodeFormat(propertyDeclaration),
            name: identifier.text,
            required: !propertyDeclaration.questionToken,
            type: new TypeResolver(propertyDeclaration.type, this.current, propertyDeclaration.type.parent, this.extractEnum, this.context).resolve(),
            validators: getPropertyValidators(propertyDeclaration),
          } as Tsoa.Property;
        });
    }

    // Class model
    const classDeclaration = node as ts.ClassDeclaration;
    const properties = classDeclaration.members
      .filter(member => {
        const ignore = isIgnored(member);
        return !ignore;
      })
      .filter(member => member.kind === ts.SyntaxKind.PropertyDeclaration)
      .filter(member => this.hasPublicModifier(member)) as Array<ts.PropertyDeclaration | ts.ParameterDeclaration>;

    const classConstructor = classDeclaration.members.find(member => member.kind === ts.SyntaxKind.Constructor) as ts.ConstructorDeclaration;

    if (classConstructor && classConstructor.parameters) {
      const constructorProperties = classConstructor.parameters.filter(parameter => this.isAccessibleParameter(parameter));

      properties.push(...constructorProperties);
    }

    return properties.map(property => {
      const identifier = property.name as ts.Identifier;
      let typeNode = property.type;

      if (!typeNode) {
        const tsType = this.current.typeChecker.getTypeAtLocation(property);
        typeNode = this.current.typeChecker.typeToTypeNode(tsType);
      }

      if (!typeNode) {
        throw new GenerateMetadataError(`No valid type found for property declaration.`);
      }

      const type = new TypeResolver(typeNode, this.current, property, this.extractEnum, this.context).resolve();

      return {
        default: getInitializerValue(property.initializer, type),
        description: this.getNodeDescription(property),
        format: this.getNodeFormat(property),
        name: identifier.text,
        required: !property.questionToken && !property.initializer,
        type,
        validators: getPropertyValidators(property as ts.PropertyDeclaration),
      } as Tsoa.Property;
    });
  }

  private getModelAdditionalProperties(node: UsableDeclaration) {
    if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
      const interfaceDeclaration = node as ts.InterfaceDeclaration;
      const indexMember = interfaceDeclaration.members.find(member => member.kind === ts.SyntaxKind.IndexSignature);
      if (!indexMember) {
        return undefined;
      }

      const indexSignatureDeclaration = indexMember as ts.IndexSignatureDeclaration;
      const indexType = new TypeResolver(indexSignatureDeclaration.parameters[0].type as ts.TypeNode, this.current, this.parentNode, this.extractEnum, this.context).resolve();
      if (indexType.dataType !== 'string') {
        throw new GenerateMetadataError(`Only string indexers are supported.`, this.typeNode);
      }

      return new TypeResolver(indexSignatureDeclaration.type as ts.TypeNode, this.current, this.parentNode, this.extractEnum, this.context).resolve();
    }

    return undefined;
  }

  private typeArgumentsToContext(type: ts.TypeReferenceNode | ts.ExpressionWithTypeArguments, targetEntitiy: ts.EntityName, context: Context): Context {
    this.context = {};

    if (type.typeArguments && type.typeArguments.length > 0) {
      const typeParameters = this.getModelTypeDeclaration(targetEntitiy).typeParameters;

      if (typeParameters) {
        for (let index = 0; index < typeParameters.length; index++) {
          const typeParameter = typeParameters[index];
          const typeArg = type.typeArguments[index];
          let resolvedType: ts.TypeNode;

          // Argument may be a forward reference from context
          if (ts.isTypeReferenceNode(typeArg) && ts.isIdentifier(typeArg.typeName) && context[typeArg.typeName.text]) {
            resolvedType = context[typeArg.typeName.text];
          } else {
            resolvedType = type.typeArguments[index];
          }

          this.context = {
            ...this.context,
            [typeParameter.name.text]: resolvedType,
          };
        }
      }
    }
    return context;
  }

  private getModelInheritedProperties(modelTypeDeclaration: Exclude<UsableDeclaration, ts.PropertySignature | ts.TypeAliasDeclaration>): Tsoa.Property[] {
    const properties = [] as Tsoa.Property[];

    const heritageClauses = modelTypeDeclaration.heritageClauses;
    if (!heritageClauses) {
      return properties;
    }

    heritageClauses.forEach(clause => {
      if (!clause.types) {
        return;
      }

      clause.types.forEach(t => {
        const baseEntityName = t.expression as ts.EntityName;

        // create subContext
        let resetCtx = this.context;
        if (t.typeArguments && t.typeArguments.length > 0) {
          resetCtx = this.typeArgumentsToContext(t, baseEntityName, this.context);
        }

        const referenceType = this.getReferenceTypeOrEnumType(t);
        if (referenceType) {
          if (referenceType.dataType === 'refEnum' || referenceType.dataType === 'refAlias' || referenceType.dataType === 'enum') {
            // since it doesn't have properties to iterate over, then we don't do anything with it
          } else if (referenceType.dataType === 'refObject') {
            referenceType.properties.forEach(property => properties.push(property));
          } else {
            assertNever(referenceType);
          }
        }

        // reset subContext
        this.context = resetCtx;
      });
    });

    return properties;
  }

  private hasPublicModifier(node: ts.Node) {
    return (
      !node.modifiers ||
      node.modifiers.every(modifier => {
        return modifier.kind !== ts.SyntaxKind.ProtectedKeyword && modifier.kind !== ts.SyntaxKind.PrivateKeyword;
      })
    );
  }

  private isAccessibleParameter(node: ts.Node) {
    // No modifiers
    if (!node.modifiers) {
      return false;
    }

    // public || public readonly
    if (node.modifiers.some(modifier => modifier.kind === ts.SyntaxKind.PublicKeyword)) {
      return true;
    }

    // readonly, not private readonly, not public readonly
    const isReadonly = node.modifiers.some(modifier => modifier.kind === ts.SyntaxKind.ReadonlyKeyword);
    const isProtectedOrPrivate = node.modifiers.some(modifier => {
      return modifier.kind === ts.SyntaxKind.ProtectedKeyword || modifier.kind === ts.SyntaxKind.PrivateKeyword;
    });
    return isReadonly && !isProtectedOrPrivate;
  }

  private getNodeDescription(node: UsableDeclaration | ts.PropertyDeclaration | ts.ParameterDeclaration | ts.EnumDeclaration) {
    const symbol = this.current.typeChecker.getSymbolAtLocation(node.name as ts.Node);
    if (!symbol) {
      return undefined;
    }

    /**
     * TODO: Workaround for what seems like a bug in the compiler
     * Warrants more investigation and possibly a PR against typescript
     */
    if (node.kind === ts.SyntaxKind.Parameter) {
      // TypeScript won't parse jsdoc if the flag is 4, i.e. 'Property'
      symbol.flags = 0;
    }

    const comments = symbol.getDocumentationComment(this.current.typeChecker);
    if (comments.length) {
      return ts.displayPartsToString(comments);
    }

    return undefined;
  }

  private getNodeFormat(node: UsableDeclaration | ts.PropertyDeclaration | ts.ParameterDeclaration | ts.EnumDeclaration) {
    return getJSDocComment(node, 'format');
  }

  private getNodeExample(node: UsableDeclaration | ts.PropertyDeclaration | ts.ParameterDeclaration | ts.EnumDeclaration) {
    const example = getJSDocComment(node, 'example');

    if (example) {
      return JSON.parse(example);
    } else {
      return undefined;
    }
  }
}

interface ResolvesToPrimitive {
  foundMatch: true;
  resolvedType: 'number' | 'string' | 'boolean' | 'void';
}
interface DoesNotResolveToPrimitive {
  foundMatch: false;
}
