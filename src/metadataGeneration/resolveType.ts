import * as ts from 'typescript';
import { MetadataGenerator, Type, ReferenceType, Property } from './metadataGenerator';
import * as _ from 'lodash';

const syntaxKindMap: { [kind: number]: string } = {};
syntaxKindMap[ts.SyntaxKind.NumberKeyword] = 'number';
syntaxKindMap[ts.SyntaxKind.StringKeyword] = 'string';
syntaxKindMap[ts.SyntaxKind.BooleanKeyword] = 'boolean';
syntaxKindMap[ts.SyntaxKind.VoidKeyword] = 'void';

const localReferenceTypeCache: { [typeName: string]: ReferenceType } = {};
const inProgressTypes: { [typeName: string]: boolean } = {};

type UsableDeclaration = ts.InterfaceDeclaration | ts.ClassDeclaration | ts.TypeAliasDeclaration;
export function ResolveType(typeNode: ts.TypeNode): Type {
  const primitiveType = syntaxKindMap[typeNode.kind];
  if (primitiveType) {
    return primitiveType;
  }

  if (typeNode.kind === ts.SyntaxKind.ArrayType) {
    const arrayType = typeNode as ts.ArrayTypeNode;
    return {
      elementType: ResolveType(arrayType.elementType)
    };
  }

  if (typeNode.kind === ts.SyntaxKind.UnionType) {
    return 'object';
  }

  if (typeNode.kind !== ts.SyntaxKind.TypeReference) {
    throw new Error(`Unknown type: ${ts.SyntaxKind[typeNode.kind]}`);
  }
  let typeReference: any = typeNode;
  if (typeReference.typeName.text === 'Date') { return 'datetime'; }
  if (typeReference.typeName.text === 'Buffer') { return 'buffer'; }

  if (typeReference.typeName.text === 'Promise') {
    typeReference = typeReference.typeArguments[0];
    return ResolveType(typeReference);
  }

  let referenceType: ReferenceType;

  if (typeReference.typeArguments && typeReference.typeArguments.length === 1) {
    let typeT: ts.TypeNode[] = typeReference.typeArguments as ts.TypeNode[];
    referenceType = generateReferenceType(typeReference.typeName.text, typeT);
  } else {
    referenceType = generateReferenceType(typeReference.typeName.text);
  }

  MetadataGenerator.current.AddReferenceType(referenceType);
  return referenceType;
}

function generateReferenceType(typeName: string, genericTypes?: ts.TypeNode[]): ReferenceType {
  try {

    const typeNameWithGenerics = getTypeName(typeName, genericTypes);
    const existingType = localReferenceTypeCache[typeNameWithGenerics];
    if (existingType) { return existingType; }

    if (inProgressTypes[typeNameWithGenerics]) {
      return createCircularDependencyResolver(typeNameWithGenerics);
    }

    inProgressTypes[typeNameWithGenerics] = true;

    const modelTypeDeclaration = getModelTypeDeclaration(typeName);


    const properties = getModelTypeProperties(modelTypeDeclaration, genericTypes);

    const referenceType: ReferenceType = {
      description: getModelDescription(modelTypeDeclaration),
      name: typeNameWithGenerics,
      properties: properties
    };
    if (modelTypeDeclaration.kind === ts.SyntaxKind.TypeAliasDeclaration) {
      const innerType = modelTypeDeclaration.type;
      if (innerType.kind === ts.SyntaxKind.UnionType && (innerType as any).types) {
        const unionTypes = (innerType as any).types;
        referenceType.enum = unionTypes.map((unionNode: any) => unionNode.literal.text as string);
      }
    }

    const extendedProperties = getInheritedProperties(modelTypeDeclaration);
    referenceType.properties = referenceType.properties.concat(extendedProperties);

    localReferenceTypeCache[typeNameWithGenerics] = referenceType;

    return referenceType;
  } catch (err) {
    console.error(`There was a problem resolving type of '${getTypeName(typeName, genericTypes)}'.`);
    throw err;
  }
}

function getTypeName(typeName: string, genericTypes?: ts.TypeNode[]): string {
  if (!genericTypes || !genericTypes.length) {
    return typeName;
  }
  let names = genericTypes.map((t) => {
    return getAnyTypeName(t);
  });

  return typeName + names.join('');
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
    throw new Error(`Unknown type: ${ts.SyntaxKind[typeNode.kind]}`);
  }

  const typeReference = typeNode as ts.TypeReferenceNode;
  try {
    return (typeReference.typeName as ts.Identifier).text;
  } catch (e) {
    // idk what would hit this? probably needs more testing
    console.error(e);
    return typeNode.toString();
  }

}

function createCircularDependencyResolver(typeName: string) {
  const referenceType = {
    description: '',
    name: typeName,
    properties: new Array<Property>()
  };

  MetadataGenerator.current.OnFinish(referenceTypes => {
    const realReferenceType = referenceTypes[typeName];
    if (!realReferenceType) { return; }
    referenceType.description = realReferenceType.description;
    referenceType.name = realReferenceType.name;
    referenceType.properties = realReferenceType.properties;
  });

  return referenceType;
}

function getModelTypeDeclaration(typeName: string) {
  const nodeIsNotUsable = (node: ts.Node) => {
    switch (node.kind) {
      case ts.SyntaxKind.InterfaceDeclaration:
      case ts.SyntaxKind.ClassDeclaration:
      case ts.SyntaxKind.TypeAliasDeclaration:
        return false;
      default: return true;
    }
  };
  const modelTypes = MetadataGenerator.current.nodes
    .filter(node => {
      if (nodeIsNotUsable(node) || !MetadataGenerator.current.IsExportedNode(node)) {
        return false;
      }

      const modelTypeDeclaration = node as UsableDeclaration;
      return (modelTypeDeclaration.name as ts.Identifier).text.toLowerCase() === typeName.toLowerCase();
    }) as Array<UsableDeclaration>;

  if (!modelTypes.length) { throw new Error(`No matching model found for referenced type ${typeName}`); }
  if (modelTypes.length > 1) { throw new Error(`Multiple matching models found for referenced type ${typeName}; please make model names unique.`); }

  return modelTypes[0];
}

function getModelTypeProperties(node: UsableDeclaration, genericTypes?: ts.TypeNode[]) {
  if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
    const interfaceDeclaration = node as ts.InterfaceDeclaration;
    return interfaceDeclaration.members
      .filter(member => member.kind === ts.SyntaxKind.PropertySignature)
      .map((property: any) => {

        const propertyDeclaration = property as ts.PropertyDeclaration;
        const identifier = propertyDeclaration.name as ts.Identifier;

        if (!propertyDeclaration.type) { throw new Error('No valid type found for property declaration.'); }

        // Declare a variable that can be overridden if needed
        let aType = propertyDeclaration.type;

        // aType.kind will always be a TypeReference when the property of Interface<T> is of type T
        if (aType.kind === ts.SyntaxKind.TypeReference && genericTypes && genericTypes.length && node.typeParameters) {

          // The type definitions are conviently located on the object which allow us to map -> to the genericTypes
          let typeParams = _.map(node.typeParameters, (typeParam: ts.TypeParameterDeclaration) => {
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
          const indexOfType = _.indexOf<string>(typeParams, typeIdentifierName);
          if (indexOfType >= 0) {
            aType = genericTypes[indexOfType] as ts.TypeNode;
          }
        }

        return {
          description: getNodeDescription(propertyDeclaration),
          name: identifier.text,
          required: !property.questionToken,
          type: ResolveType(aType)
        };
      });
  }

  if (node.kind === ts.SyntaxKind.TypeAliasDeclaration) {
    /**
     * TOOD
     *
     * Flesh this out so that we can properly support Type Alii instead of just assuming
     * string literal enums
    */
    return [];
  }

  const classDeclaration = node as ts.ClassDeclaration;

  let properties = classDeclaration.members.filter((member: any) => {
    if (member.kind !== ts.SyntaxKind.PropertyDeclaration) { return false; }

    const propertySignature = member as ts.PropertySignature;
    return propertySignature && hasPublicModifier(propertySignature);
  }) as Array<ts.PropertyDeclaration | ts.ParameterDeclaration>;

  const classConstructor = classDeclaration.members.find((member: any) => member.kind === ts.SyntaxKind.Constructor) as ts.ConstructorDeclaration;
  if (classConstructor && classConstructor.parameters) {
    properties = properties.concat(classConstructor.parameters.filter(parameter => hasPublicModifier(parameter)) as any);
  }

  return properties
    .map(declaration => {
      const identifier = declaration.name as ts.Identifier;

      if (!declaration.type) { throw new Error('No valid type found for property declaration.'); }

      return {
        description: getNodeDescription(declaration),
        name: identifier.text,
        required: !declaration.questionToken,
        type: ResolveType(declaration.type)
      };
    });
}

function hasPublicModifier(node: ts.Node) {
  return !node.modifiers || node.modifiers.every(modifier => {
    return modifier.kind !== ts.SyntaxKind.ProtectedKeyword && modifier.kind !== ts.SyntaxKind.PrivateKeyword;
  });
}

function getInheritedProperties(modelTypeDeclaration: UsableDeclaration): Property[] {
  const properties = new Array<Property>();
  if (modelTypeDeclaration.kind === ts.SyntaxKind.TypeAliasDeclaration) {
    return [];
  }
  const heritageClauses = modelTypeDeclaration.heritageClauses;
  if (!heritageClauses) { return properties; }

  heritageClauses.forEach(clause => {
    if (!clause.types) { return; }

    clause.types.forEach(t => {
      const baseIdentifier = t.expression as ts.Identifier;
      generateReferenceType(baseIdentifier.text).properties
        .forEach(property => properties.push(property));
    });
  });

  return properties;
}

function getModelDescription(modelTypeDeclaration: UsableDeclaration) {
  return getNodeDescription(modelTypeDeclaration);
}

function getNodeDescription(node: UsableDeclaration | ts.PropertyDeclaration | ts.ParameterDeclaration) {
  let symbol = MetadataGenerator.current.typeChecker.getSymbolAtLocation(node.name as ts.Node);

  /**
  * TODO: Workaround for what seems like a bug in the compiler
  * Warrants more investigation and possibly a PR against typescript
  */
  //
  if (node.kind === ts.SyntaxKind.Parameter) {
    // TypeScript won't parse jsdoc if the flag is 4, i.e. 'Property'
    symbol.flags = 0;
  }

  let comments = symbol.getDocumentationComment();
  if (comments.length) { return ts.displayPartsToString(comments); }

  return '';
}
