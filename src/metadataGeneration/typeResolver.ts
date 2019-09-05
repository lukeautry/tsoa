import * as ts from 'typescript';
import { getJSDocComment, getJSDocTagNames, isExistJSDocTag } from './../utils/jsDocUtils';
import { getPropertyValidators } from './../utils/validatorUtils';
import { GenerateMetadataError } from './exceptions';
import { getInitializerValue } from './initializer-value';
import { MetadataGenerator } from './metadataGenerator';
import { Tsoa } from './tsoa';

const syntaxKindMap: { [kind: number]: string } = {};
syntaxKindMap[ts.SyntaxKind.NumberKeyword] = 'number';
syntaxKindMap[ts.SyntaxKind.StringKeyword] = 'string';
syntaxKindMap[ts.SyntaxKind.BooleanKeyword] = 'boolean';
syntaxKindMap[ts.SyntaxKind.VoidKeyword] = 'void';

const localReferenceTypeCache: { [typeName: string]: Tsoa.ReferenceType } = {};
const inProgressTypes: { [typeName: string]: boolean } = {};

type UsableDeclaration = ts.InterfaceDeclaration | ts.ClassDeclaration | ts.TypeAliasDeclaration | ts.PropertySignature;

export class TypeResolver {
  constructor(
    private readonly typeNode: ts.TypeNode,
    private readonly current: MetadataGenerator,
    private readonly parentNode?: ts.Node,
    private readonly extractEnum = true,
    private context: { [name: string]: ts.TypeReferenceNode | ts.TypeNode } = {},
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
      return {
        dataType: 'array',
        elementType: new TypeResolver((this.typeNode as ts.ArrayTypeNode).elementType, this.current, this.parentNode, this.extractEnum, this.context).resolve(),
      } as Tsoa.ArrayType;
    }

    if (ts.isUnionTypeNode(this.typeNode)) {
      const supportType = this.typeNode.types.every(type => ts.isLiteralTypeNode(type));

      if (supportType) {
        return {
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
        } as Tsoa.EnumerateType;
      } else {
        const types = this.typeNode.types.map(type => {
          return new TypeResolver(type, this.current, this.parentNode, this.extractEnum, this.context).resolve();
        });

        return {
          dataType: 'union',
          types,
        } as Tsoa.UnionType;
      }
    }

    if (ts.isIntersectionTypeNode(this.typeNode)) {
      const types = this.typeNode.types.map(type => {
        return new TypeResolver(type, this.current, this.parentNode, this.extractEnum, this.context).resolve();
      });

      return {
        dataType: 'intersection',
        types,
      } as Tsoa.IntersectionType;
    }

    if (this.typeNode.kind === ts.SyntaxKind.AnyKeyword) {
      return { dataType: 'any' } as Tsoa.Type;
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
          throw new GenerateMetadataError(`Only string indexers are supported.`);
        }

        additionalType = new TypeResolver(indexSignatureDeclaration.type as ts.TypeNode, this.current, this.parentNode, this.extractEnum, this.context).resolve();
      }

      const objLiteral: Tsoa.ObjectLiteralType = {
        additionalProperties: indexMember && additionalType,
        dataType: 'nestedObjectLiteral',
        properties,
      };
      return objLiteral;
    }

    if (this.typeNode.kind === ts.SyntaxKind.ObjectKeyword) {
      return { dataType: 'object' } as Tsoa.Type;
    }

    if (this.typeNode.kind !== ts.SyntaxKind.TypeReference) {
      throw new GenerateMetadataError(`Unknown type: ${ts.SyntaxKind[this.typeNode.kind]}`);
    }

    const typeReference = this.typeNode as ts.TypeReferenceNode;
    if (typeReference.typeName.kind === ts.SyntaxKind.Identifier) {
      if (typeReference.typeName.text === 'Date') {
        return this.getDateType(this.parentNode);
      }

      if (typeReference.typeName.text === 'Buffer') {
        return { dataType: 'buffer' } as Tsoa.Type;
      }

      if (typeReference.typeName.text === 'Array' && typeReference.typeArguments && typeReference.typeArguments.length === 1) {
        return {
          dataType: 'array',
          elementType: new TypeResolver(typeReference.typeArguments[0], this.current, this.parentNode, this.extractEnum, this.context).resolve(),
        } as Tsoa.ArrayType;
      }

      if (typeReference.typeName.text === 'Promise' && typeReference.typeArguments && typeReference.typeArguments.length === 1) {
        return new TypeResolver(typeReference.typeArguments[0], this.current, this.parentNode, this.extractEnum, this.context).resolve();
      }

      if (typeReference.typeName.text === 'String') {
        return { dataType: 'string' } as Tsoa.Type;
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

    let referenceType: Tsoa.ReferenceType;
    if (typeReference.typeArguments && typeReference.typeArguments.length > 0) {
      const typeParameters = this.getModelTypeDeclaration(typeReference.typeName).typeParameters;
      if (typeParameters) {
        for (let index = 0; index < typeParameters.length; index++) {
          const typeParameter = typeParameters[index];
          this.context = { [typeParameter.name.text]: typeReference.typeArguments[index], ...this.context };
        }
      }
    } else {
      this.context = {};
    }

    referenceType = this.getReferenceType(typeReference.typeName as ts.EntityName, this.extractEnum, typeReference.typeArguments);

    this.current.AddReferenceType(referenceType);

    // We do a hard assert in the test mode so we can catch bad ref names (https://github.com/lukeautry/tsoa/issues/398).
    //   The goal is to avoid producing these names before the code is ever merged to master (via extensive test coverage)
    //   and therefore this validation does not have to run for the users
    if (process.env.NODE_ENV === 'tsoa_test') {
      // This regex allows underscore, hyphen, and period since those are valid in SwaggerEditor
      const symbolsRegex = /[!$%^&*()+|~=`{}\[\]:";'<>?,\/]/;
      if (symbolsRegex.test(referenceType.refName)) {
        throw new Error(
          `Problem with creating refName ${referenceType.refName} since we should not allow symbols in ref names ` +
            `because it would cause invalid swagger.yaml to be created. This is due to the swagger rule ` +
            `"ref values must be RFC3986-compliant percent-encoded URIs."`,
        );
      }
    }

    return referenceType;
  }

  private getPrimitiveType(typeNode: ts.TypeNode, parentNode?: ts.Node): Tsoa.Type | undefined {
    const primitiveType = syntaxKindMap[typeNode.kind];
    if (!primitiveType) {
      return;
    }

    if (primitiveType === 'number') {
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
    }
    return { dataType: primitiveType } as Tsoa.Type;
  }

  private getDateType(parentNode?: ts.Node): Tsoa.Type {
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

  private getEnumerateType(typeName: ts.EntityName, extractEnum = true): Tsoa.Type | undefined {
    const enumName = (typeName as ts.Identifier).text;
    const enumNodes = this.current.nodes.filter(node => node.kind === ts.SyntaxKind.EnumDeclaration).filter(node => (node as any).name.text === enumName);

    if (!enumNodes.length) {
      return;
    }
    if (enumNodes.length > 1) {
      throw new GenerateMetadataError(`Multiple matching enum found for enum ${enumName}; please make enum names unique.`);
    }

    const enumDeclaration = enumNodes[0] as ts.EnumDeclaration;

    function getEnumValue(member: any) {
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
        return getEnumValue(member) || String(index);
      });
      return {
        dataType: 'refEnum',
        description: this.getNodeDescription(enumDeclaration),
        enums,
        refName: enumName,
      } as Tsoa.ReferenceType;
    } else {
      return {
        dataType: 'enum',
        enums: enumDeclaration.members.map((member: any, index) => {
          return getEnumValue(member) || String(index);
        }),
      } as Tsoa.EnumerateType;
    }
  }

  private getLiteralType(typeName: ts.EntityName): Tsoa.Type | undefined {
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
    if (unionTypes.some(t => !t.literal || !t.literal.text)) {
      // tagged union types can't be expressed in Swagger terms, probably
      return { dataType: 'any' };
    }

    return {
      dataType: 'enum',
      enums: unionTypes.map(unionNode => unionNode.literal.text as string),
    } as Tsoa.EnumerateType;
  }

  private getReferenceType(type: ts.EntityName, extractEnum = true, genericTypes?: ts.NodeArray<ts.TypeNode>): Tsoa.ReferenceType {
    const typeName = this.resolveFqTypeName(type);
    const refNameWithGenerics = this.getTypeName(typeName, genericTypes);

    try {
      const existingType = localReferenceTypeCache[refNameWithGenerics];
      if (existingType) {
        return existingType;
      }

      const referenceEnumType = this.getEnumerateType(type, true) as Tsoa.ReferenceType;
      if (referenceEnumType) {
        localReferenceTypeCache[refNameWithGenerics] = referenceEnumType;
        return referenceEnumType;
      }

      if (inProgressTypes[refNameWithGenerics]) {
        return this.createCircularDependencyResolver(refNameWithGenerics);
      }

      inProgressTypes[refNameWithGenerics] = true;

      const modelType = this.getModelTypeDeclaration(type);
      const properties = this.getModelProperties(modelType, genericTypes);
      const additionalProperties = this.getModelAdditionalProperties(modelType);
      const inheritedProperties = this.getModelInheritedProperties(modelType) || [];
      const example = this.getNodeExample(modelType);

      const referenceType = {
        additionalProperties,
        dataType: 'refObject',
        description: this.getNodeDescription(modelType),
        properties: inheritedProperties,
        refName: refNameWithGenerics,
      } as Tsoa.ReferenceType;

      referenceType.properties = (referenceType.properties as Tsoa.Property[]).concat(properties);
      localReferenceTypeCache[refNameWithGenerics] = referenceType;

      if (example) {
        referenceType.example = example;
      }
      return referenceType;
    } catch (err) {
      // tslint:disable-next-line:no-console
      console.error(`There was a problem resolving type of '${this.getTypeName(typeName, genericTypes)}'.`);
      throw err;
    }
  }

  private resolveFqTypeName(type: ts.EntityName): string {
    if (type.kind === ts.SyntaxKind.Identifier) {
      return (type as ts.Identifier).text;
    }

    const qualifiedType = type as ts.QualifiedName;
    return this.resolveFqTypeName(qualifiedType.left) + '.' + (qualifiedType.right as ts.Identifier).text;
  }

  private getTypeName(typeName: string, genericTypes?: ts.NodeArray<ts.TypeNode>): string {
    if (!genericTypes || !genericTypes.length) {
      return typeName;
    }

    const resolvedName = genericTypes
      .map(genericType => this.context[genericType.getText()] || genericType)
      .reduce(
        (acc, generic) => {
          if (ts.isTypeReferenceNode(generic) && generic.typeArguments && generic.typeArguments.length > 0) {
            const typeNameSection = this.getTypeName(generic.typeName.getText(), generic.typeArguments);
            acc.push(typeNameSection);
            return acc;
          } else {
            const typeNameSection = this.getAnyTypeName(generic);
            acc.push(typeNameSection);
            return acc;
          }
        },
        [] as string[],
      );

    const finalName = typeName + resolvedName.join('');

    return finalName;
  }

  private getAnyTypeName(typeNode: ts.TypeNode): string {
    const primitiveType = syntaxKindMap[typeNode.kind];
    if (primitiveType) {
      return primitiveType;
    }

    if (typeNode.kind === ts.SyntaxKind.ArrayType) {
      const arrayType = typeNode as ts.ArrayTypeNode;
      return this.getAnyTypeName(arrayType.elementType) + 'Array';
    }

    if (typeNode.kind === ts.SyntaxKind.UnionType) {
      return 'object';
    }

    if (typeNode.kind !== ts.SyntaxKind.TypeReference) {
      throw new GenerateMetadataError(`Unknown type: ${ts.SyntaxKind[typeNode.kind]}.`);
    }

    const typeReference = typeNode as ts.TypeReferenceNode;
    try {
      return (typeReference.typeName as ts.Identifier).text;
    } catch (e) {
      // idk what would hit this? probably needs more testing
      // tslint:disable-next-line:no-console
      console.error(e);
      return typeNode.toString();
    }
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
      referenceType.properties = realReferenceType.properties;
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

  private getModelProperties(node: UsableDeclaration, genericTypes?: ts.NodeArray<ts.TypeNode>): Tsoa.Property[] {
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

    // Type alias model
    if (node.kind === ts.SyntaxKind.TypeAliasDeclaration) {
      const aliasDeclaration = node as ts.TypeAliasDeclaration;
      const properties: Tsoa.Property[] = [];

      if (aliasDeclaration.type.kind === ts.SyntaxKind.IntersectionType) {
        const intersectionTypeNode = aliasDeclaration.type as ts.IntersectionTypeNode;

        intersectionTypeNode.types.forEach(type => {
          if (type.kind === ts.SyntaxKind.TypeReference) {
            const typeReferenceNode = type as ts.TypeReferenceNode;
            const modelType = this.getModelTypeDeclaration(typeReferenceNode.typeName);
            const modelProps = this.getModelProperties(modelType);
            properties.push(...modelProps);
          }
        });
      }

      if (aliasDeclaration.type.kind === ts.SyntaxKind.TypeReference) {
        const typeReferenceNode = aliasDeclaration.type as ts.TypeReferenceNode;
        const modelType = this.getModelTypeDeclaration(typeReferenceNode.typeName);
        const modelProps = this.getModelProperties(modelType);
        properties.push(...modelProps);
      }
      return properties;
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
        throw new GenerateMetadataError(`Only string indexers are supported.`);
      }

      return new TypeResolver(indexSignatureDeclaration.type as ts.TypeNode, this.current, this.parentNode, this.extractEnum, this.context).resolve();
    }

    return undefined;
  }

  private getModelInheritedProperties(modelTypeDeclaration: Exclude<UsableDeclaration, ts.PropertySignature>): Tsoa.Property[] {
    const properties = [] as Tsoa.Property[];
    if (modelTypeDeclaration.kind === ts.SyntaxKind.TypeAliasDeclaration) {
      return [];
    }
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
        const referenceType = this.getReferenceType(baseEntityName);
        if (referenceType.properties) {
          referenceType.properties.forEach(property => properties.push(property));
        }
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
