import * as indexOf from 'lodash.indexof';
import * as map from 'lodash.map';
import * as ts from 'typescript';
import { getJSDocComment, getJSDocTagNames, isExistJSDocTag } from './../utils/jsDocUtils';
import { getPropertyValidators } from './../utils/validatorUtils';
import { GenerateMetadataError } from './exceptions';
import { MetadataGenerator } from './metadataGenerator';
import { Tsoa } from './tsoa';

const syntaxKindMap: { [kind: number]: string } = {};
syntaxKindMap[ts.SyntaxKind.NumberKeyword] = 'number';
syntaxKindMap[ts.SyntaxKind.StringKeyword] = 'string';
syntaxKindMap[ts.SyntaxKind.BooleanKeyword] = 'boolean';
syntaxKindMap[ts.SyntaxKind.VoidKeyword] = 'void';

const localReferenceTypeCache: { [typeName: string]: Tsoa.ReferenceType } = {};
const inProgressTypes: { [typeName: string]: boolean } = {};

type UsableDeclaration = ts.InterfaceDeclaration
  | ts.ClassDeclaration
  | ts.TypeAliasDeclaration;

export function resolveType(typeNode: ts.TypeNode, parentNode?: ts.Node, extractEnum = true): Tsoa.Type {
  const primitiveType = getPrimitiveType(typeNode, parentNode);
  if (primitiveType) {
    return primitiveType;
  }

  if (typeNode.kind === ts.SyntaxKind.ArrayType) {
    return {
      dataType: 'array',
      elementType: resolveType((typeNode as ts.ArrayTypeNode).elementType),
    } as Tsoa.ArrayType;
  }

  if (typeNode.kind === ts.SyntaxKind.UnionType) {
    const unionType = typeNode as ts.UnionTypeNode;
    const supportType = unionType.types.some((type) => type.kind === ts.SyntaxKind.LiteralType);
    if (supportType) {
      return {
        dataType: 'enum',
        enums: unionType.types.map((type) => {
          const literalType = (type as ts.LiteralTypeNode).literal;
          switch (literalType.kind) {
            case ts.SyntaxKind.TrueKeyword: return 'true';
            case ts.SyntaxKind.FalseKeyword: return 'false';
            default: return String((literalType as any).text);
          }
        }),
      } as Tsoa.EnumerateType;
    } else {
      return { dataType: 'object' } as Tsoa.Type;
    }
  }

  if (typeNode.kind === ts.SyntaxKind.AnyKeyword) {
    return { dataType: 'any' } as Tsoa.Type;
  }

  if (typeNode.kind === ts.SyntaxKind.TypeLiteral) {
    return { dataType: 'any' } as Tsoa.Type;
  }

  if (typeNode.kind !== ts.SyntaxKind.TypeReference) {
    throw new GenerateMetadataError(`Unknown type: ${ts.SyntaxKind[typeNode.kind]}`);
  }

  const typeReference = typeNode as ts.TypeReferenceNode;
  if (typeReference.typeName.kind === ts.SyntaxKind.Identifier) {
    if (typeReference.typeName.text === 'Date') {
      return getDateType(typeNode, parentNode);
    }

    if (typeReference.typeName.text === 'Buffer') {
      return { dataType: 'buffer' } as Tsoa.Type;
    }

    if (typeReference.typeName.text === 'Array' && typeReference.typeArguments && typeReference.typeArguments.length === 1) {
      return {
        dataType: 'array',
        elementType: resolveType(typeReference.typeArguments[0]),
      } as Tsoa.ArrayType;
    }

    if (typeReference.typeName.text === 'Promise' && typeReference.typeArguments && typeReference.typeArguments.length === 1) {
      return resolveType(typeReference.typeArguments[0]);
    }

    if (typeReference.typeName.text === 'String') {
      return { dataType: 'string' } as Tsoa.Type;
    }
  }

  if (!extractEnum) {
    const enumType = getEnumerateType(typeReference.typeName, extractEnum);
    if (enumType) { return enumType; }
  }

  const literalType = getLiteralType(typeReference.typeName);
  if (literalType) { return literalType; }

  let referenceType: Tsoa.ReferenceType;
  if (typeReference.typeArguments && typeReference.typeArguments.length === 1) {
    const typeT: ts.NodeArray<ts.TypeNode> = typeReference.typeArguments as ts.NodeArray<ts.TypeNode>;
    referenceType = getReferenceType(typeReference.typeName as ts.EntityName, extractEnum, typeT);
  } else {
    referenceType = getReferenceType(typeReference.typeName as ts.EntityName, extractEnum);
  }

  MetadataGenerator.current.AddReferenceType(referenceType);
  return referenceType;
}

export function getInitializerValue(initializer?: ts.Expression, type?: Tsoa.Type) {
  if (!initializer) { return; }

  switch (initializer.kind as ts.SyntaxKind) {
    case ts.SyntaxKind.ArrayLiteralExpression:
      const arrayLiteral = initializer as ts.ArrayLiteralExpression;
      return arrayLiteral.elements.map((element) => getInitializerValue(element));
    case ts.SyntaxKind.StringLiteral:
      return (initializer as ts.StringLiteral).text;
    case ts.SyntaxKind.TrueKeyword:
      return true;
    case ts.SyntaxKind.FalseKeyword:
      return false;
    case ts.SyntaxKind.NumberKeyword:
    case ts.SyntaxKind.FirstLiteralToken:
      return Number((initializer as ts.NumericLiteral).text);
    case ts.SyntaxKind.NewExpression:
      const newExpression = initializer as ts.NewExpression;
      const ident = newExpression.expression as ts.Identifier;

      if (ident.text === 'Date') {
        let date = new Date();
        if (newExpression.arguments) {
          const newArguments = newExpression.arguments.filter(args => args.kind !== undefined);
          const argsValue = newArguments.map(args => getInitializerValue(args));
          if (argsValue.length > 0) {
            date = new Date(argsValue as any);
          }
        }
        const dateString = date.toISOString();
        if (type && type.dataType === 'date') {
          return dateString.split('T')[0];
        }
        return dateString;
      }
      return;
    case ts.SyntaxKind.ObjectLiteralExpression:
      const objectLiteral = initializer as ts.ObjectLiteralExpression;
      const nestedObject: any = {};
      objectLiteral.properties.forEach((p: any) => {
        nestedObject[p.name.text] = getInitializerValue(p.initializer);
      });
      return nestedObject;
    default:
      return;
  }
}

function getPrimitiveType(typeNode: ts.TypeNode, parentNode?: ts.Node): Tsoa.Type | undefined {
  const primitiveType = syntaxKindMap[typeNode.kind];
  if (!primitiveType) { return; }

  if (primitiveType === 'number') {
    if (!parentNode) {
      return { dataType: 'double' };
    }

    const tags = getJSDocTagNames(parentNode).filter((name) => {
      return ['isInt', 'isLong', 'isFloat', 'isDouble'].some((m) => m === name);
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

function getDateType(typeNode: ts.TypeNode, parentNode?: ts.Node): Tsoa.Type {
  if (!parentNode) {
    return { dataType: 'datetime' };
  }
  const tags = getJSDocTagNames(parentNode).filter((name) => {
    return ['isDate', 'isDateTime'].some((m) => m === name);
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

function getEnumerateType(typeName: ts.EntityName, extractEnum = true): Tsoa.Type | undefined {
  const enumName = (typeName as ts.Identifier).text;
  const enumNodes = MetadataGenerator.current.nodes
    .filter((node) => node.kind === ts.SyntaxKind.EnumDeclaration)
    .filter((node) => (node as any).name.text === enumName);

  if (!enumNodes.length) { return; }
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
      description: getNodeDescription(enumDeclaration),
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

function getLiteralType(typeName: ts.EntityName): Tsoa.EnumerateType | undefined {
  const literalName = (typeName as ts.Identifier).text;
  const literalTypes = MetadataGenerator.current.nodes
    .filter((node) => node.kind === ts.SyntaxKind.TypeAliasDeclaration)
    .filter((node) => {
      const innerType = (node as any).type;
      return innerType.kind === ts.SyntaxKind.UnionType && (innerType as any).types;
    })
    .filter((node) => (node as any).name.text === literalName);

  if (!literalTypes.length) { return; }
  if (literalTypes.length > 1) {
    throw new GenerateMetadataError(`Multiple matching enum found for enum ${literalName}; please make enum names unique.`);
  }

  const unionTypes = (literalTypes[0] as any).type.types;
  return {
    dataType: 'enum',
    enums: unionTypes.map((unionNode: any) => unionNode.literal.text as string),
  } as Tsoa.EnumerateType;
}

function getReferenceType(type: ts.EntityName, extractEnum = true, genericTypes?: ts.NodeArray<ts.TypeNode>): Tsoa.ReferenceType {
  const typeName = resolveFqTypeName(type);
  const refNameWithGenerics = getTypeName(typeName, genericTypes);

  try {
    const existingType = localReferenceTypeCache[refNameWithGenerics];
    if (existingType) {
      return existingType;
    }

    const referenceEnumType = getEnumerateType(type, true) as Tsoa.ReferenceType;
    if (referenceEnumType) {
      localReferenceTypeCache[refNameWithGenerics] = referenceEnumType;
      return referenceEnumType;
    }

    if (inProgressTypes[refNameWithGenerics]) {
      return createCircularDependencyResolver(refNameWithGenerics);
    }

    inProgressTypes[refNameWithGenerics] = true;

    const modelType = getModelTypeDeclaration(type);
    const properties = getModelProperties(modelType, genericTypes);
    const additionalProperties = getModelAdditionalProperties(modelType);
    const inheritedProperties = getModelInheritedProperties(modelType) || [];

    const referenceType = {
      additionalProperties,
      dataType: 'refObject',
      description: getNodeDescription(modelType),
      properties: inheritedProperties,
      refName: refNameWithGenerics,
    } as Tsoa.ReferenceType;

    referenceType.properties = (referenceType.properties as Tsoa.Property[]).concat(properties);
    localReferenceTypeCache[refNameWithGenerics] = referenceType;

    return referenceType;
  } catch (err) {
    // tslint:disable-next-line:no-console
    console.error(`There was a problem resolving type of '${getTypeName(typeName, genericTypes)}'.`);
    throw err;
  }
}

function resolveFqTypeName(type: ts.EntityName): string {
  if (type.kind === ts.SyntaxKind.Identifier) {
    return (type as ts.Identifier).text;
  }

  const qualifiedType = type as ts.QualifiedName;
  return resolveFqTypeName(qualifiedType.left) + '.' + (qualifiedType.right as ts.Identifier).text;
}

function getTypeName(typeName: string, genericTypes?: ts.NodeArray<ts.TypeNode>): string {
  if (!genericTypes || !genericTypes.length) { return typeName; }
  return typeName + genericTypes.map((t) => getAnyTypeName(t)).join('');
}

function getAnyTypeName(typeNode: ts.TypeNode): string {
  const primitiveType = syntaxKindMap[typeNode.kind];
  if (primitiveType) {
    return primitiveType;
  }

  if (typeNode.kind === ts.SyntaxKind.ArrayType) {
    const arrayType = typeNode as ts.ArrayTypeNode;
    return getAnyTypeName(arrayType.elementType) + '[]';
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

function createCircularDependencyResolver(refName: string) {
  const referenceType = {
    dataType: 'refObject',
    refName,
  } as Tsoa.ReferenceType;

  MetadataGenerator.current.OnFinish((referenceTypes) => {
    const realReferenceType = referenceTypes[refName];
    if (!realReferenceType) { return; }
    referenceType.description = realReferenceType.description;
    referenceType.properties = realReferenceType.properties;
    referenceType.dataType = realReferenceType.dataType;
    referenceType.refName = referenceType.refName;
  });

  return referenceType;
}

function nodeIsUsable(node: ts.Node) {
  switch (node.kind) {
    case ts.SyntaxKind.InterfaceDeclaration:
    case ts.SyntaxKind.ClassDeclaration:
    case ts.SyntaxKind.TypeAliasDeclaration:
    case ts.SyntaxKind.EnumDeclaration:
      return true;
    default: return false;
  }
}

function resolveLeftmostIdentifier(type: ts.EntityName): ts.Identifier {
  while (type.kind !== ts.SyntaxKind.Identifier) {
    type = (type as ts.QualifiedName).left;
  }
  return type as ts.Identifier;
}

function resolveModelTypeScope(leftmost: ts.EntityName, statements: any): any[] {
  while (leftmost.parent && leftmost.parent.kind === ts.SyntaxKind.QualifiedName) {
    const leftmostName = leftmost.kind === ts.SyntaxKind.Identifier
      ? (leftmost as ts.Identifier).text
      : (leftmost as ts.QualifiedName).right.text;
    const moduleDeclarations = statements
      .filter((node) => {
        if (node.kind !== ts.SyntaxKind.ModuleDeclaration || !MetadataGenerator.current.IsExportedNode(node)) {
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

function getModelTypeDeclaration(type: ts.EntityName) {
  const leftmostIdentifier = resolveLeftmostIdentifier(type);
  const statements: any[] = resolveModelTypeScope(leftmostIdentifier, MetadataGenerator.current.nodes);

  const typeName = type.kind === ts.SyntaxKind.Identifier
    ? (type as ts.Identifier).text
    : (type as ts.QualifiedName).right.text;

  let modelTypes = statements
    .filter((node) => {
      if (!nodeIsUsable(node) || !MetadataGenerator.current.IsExportedNode(node)) {
        return false;
      }

      const modelTypeDeclaration = node as UsableDeclaration;
      return (modelTypeDeclaration.name as ts.Identifier).text === typeName;
    }) as UsableDeclaration[];

  if (!modelTypes.length) {
    throw new GenerateMetadataError(`No matching model found for referenced type ${typeName}.`);
  }

  if (modelTypes.length > 1) {
    // remove types that are from typescript e.g. 'Account'
    modelTypes = modelTypes.filter((modelType) => {
      if (modelType.getSourceFile().fileName.replace(/\\/g, '/').toLowerCase().indexOf('node_modules/typescript') > -1) {
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

function getModelProperties(node: UsableDeclaration, genericTypes?: ts.NodeArray<ts.TypeNode>): Tsoa.Property[] {
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

        // Declare a variable that can be overridden if needed
        let aType = propertyDeclaration.type;

        // aType.kind will always be a TypeReference when the property of Interface<T> is of type T
        if (aType.kind === ts.SyntaxKind.TypeReference && genericTypes && genericTypes.length && node.typeParameters) {

          // The type definitions are conviently located on the object which allow us to map -> to the genericTypes
          const typeParams = map(node.typeParameters, (typeParam: ts.TypeParameterDeclaration) => {
            return typeParam.name.text;
          });

          // I am not sure in what cases
          const typeIdentifier = (aType as ts.TypeReferenceNode).typeName;
          let typeIdentifierName: string;

          // typeIdentifier can either be a Identifier or a QualifiedName
          if ((typeIdentifier as ts.Identifier).text) {
            typeIdentifierName = (typeIdentifier as ts.Identifier).text;
          } else {
            typeIdentifierName = (typeIdentifier as ts.QualifiedName).right.text;
          }

          // I could not produce a situation where this did not find it so its possible this check is irrelevant
          const indexOfType = indexOf(typeParams, typeIdentifierName);
          if (indexOfType >= 0) {
            aType = genericTypes[indexOfType] as ts.TypeNode;
          }
        }

        return {
          description: getNodeDescription(propertyDeclaration),
          format: getNodeFormat(propertyDeclaration),
          name: identifier.text,
          required: !propertyDeclaration.questionToken,
          type: resolveType(aType, aType.parent),
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

      intersectionTypeNode.types.forEach((type) => {
        if (type.kind === ts.SyntaxKind.TypeReference) {
          const typeReferenceNode = type as ts.TypeReferenceNode;
          const modelType = getModelTypeDeclaration(typeReferenceNode.typeName);
          const modelProps = getModelProperties(modelType);
          properties.push(...modelProps);
        }
      });
    }

    if (aliasDeclaration.type.kind === ts.SyntaxKind.TypeReference) {
      const typeReferenceNode = aliasDeclaration.type as ts.TypeReferenceNode;
      const modelType = getModelTypeDeclaration(typeReferenceNode.typeName);
      const modelProps = getModelProperties(modelType);
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
    .filter((member) => member.kind === ts.SyntaxKind.PropertyDeclaration)
    .filter((member) => hasPublicModifier(member)) as Array<ts.PropertyDeclaration | ts.ParameterDeclaration>;

  const classConstructor = classDeclaration
    .members
    .find((member) => member.kind === ts.SyntaxKind.Constructor) as ts.ConstructorDeclaration;

  if (classConstructor && classConstructor.parameters) {
    const constructorProperties = classConstructor.parameters
      .filter((parameter) => hasPublicModifier(parameter));

    properties.push(...constructorProperties);
  }

  return properties
    .map((property) => {
      const identifier = property.name as ts.Identifier;
      let typeNode = property.type;

      if (!typeNode) {
        const tsType = MetadataGenerator.current.typeChecker.getTypeAtLocation(property);
        typeNode = MetadataGenerator.current.typeChecker.typeToTypeNode(tsType);
      }

      if (!typeNode) {
        throw new GenerateMetadataError(`No valid type found for property declaration.`);
      }

      const type = resolveType(typeNode, property);

      return {
        default: getInitializerValue(property.initializer, type),
        description: getNodeDescription(property),
        format: getNodeFormat(property),
        name: identifier.text,
        required: !property.questionToken && !property.initializer,
        type,
        validators: getPropertyValidators(property as ts.PropertyDeclaration),
      } as Tsoa.Property;
    });
}

function getModelAdditionalProperties(node: UsableDeclaration) {
  if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
    const interfaceDeclaration = node as ts.InterfaceDeclaration;
    const indexMember = interfaceDeclaration
      .members
      .find((member) => member.kind === ts.SyntaxKind.IndexSignature);
    if (!indexMember) {
      return undefined;
    }

    const indexSignatureDeclaration = indexMember as ts.IndexSignatureDeclaration;
    const indexType = resolveType(indexSignatureDeclaration.parameters[0].type as ts.TypeNode);
    if (indexType.dataType !== 'string') {
      throw new GenerateMetadataError(`Only string indexers are supported.`);
    }

    return resolveType(indexSignatureDeclaration.type as ts.TypeNode);
  }

  return undefined;
}

function getModelInheritedProperties(modelTypeDeclaration: UsableDeclaration): Tsoa.Property[] {
  const properties = [] as Tsoa.Property[];
  if (modelTypeDeclaration.kind === ts.SyntaxKind.TypeAliasDeclaration) {
    return [];
  }
  const heritageClauses = modelTypeDeclaration.heritageClauses;
  if (!heritageClauses) {
    return properties;
  }

  heritageClauses.forEach((clause) => {
    if (!clause.types) { return; }

    clause.types.forEach((t) => {
      const baseEntityName = t.expression as ts.EntityName;
      const referenceType = getReferenceType(baseEntityName);
      if (referenceType.properties) {
        referenceType.properties.forEach((property) => properties.push(property));
      }
    });
  });

  return properties;
}

function hasPublicModifier(node: ts.Node) {
  return !node.modifiers || node.modifiers.every((modifier) => {
    return modifier.kind !== ts.SyntaxKind.ProtectedKeyword && modifier.kind !== ts.SyntaxKind.PrivateKeyword;
  });
}

function getNodeDescription(node: UsableDeclaration | ts.PropertyDeclaration | ts.ParameterDeclaration | ts.EnumDeclaration) {
  const symbol = MetadataGenerator.current.typeChecker.getSymbolAtLocation(node.name as ts.Node);
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

  const comments = symbol.getDocumentationComment(undefined);
  if (comments.length) { return ts.displayPartsToString(comments); }

  return undefined;
}

function getNodeFormat(node: UsableDeclaration | ts.PropertyDeclaration | ts.ParameterDeclaration | ts.EnumDeclaration) {
  return getJSDocComment(node, 'format');
}
