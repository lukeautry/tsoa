import * as ts from 'typescript';
import {MetadataGenerator, Type, ReferenceType, Property} from './metadataGenerator';

const syntaxKindMap: { [kind: number]: string } = {};
syntaxKindMap[ts.SyntaxKind.NumberKeyword] = 'number';
syntaxKindMap[ts.SyntaxKind.StringKeyword] = 'string';
syntaxKindMap[ts.SyntaxKind.BooleanKeyword] = 'boolean';
syntaxKindMap[ts.SyntaxKind.VoidKeyword] = 'void';

const localReferenceTypeCache: { [typeName: string]: ReferenceType } = {};

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
    if (typeReference.typeName.text === 'Date') {
        return 'datetime';
    }

    if (typeReference.typeName.text === 'Promise') {
        typeReference = typeReference.typeArguments[0];
        return ResolveType(typeReference);
    }

    return generateReferenceType(typeReference.typeName.text);
}

function generateReferenceType(typeName: string, cacheReferenceType = true): ReferenceType {
    const existingType = localReferenceTypeCache[typeName];
    if (existingType) { return existingType; }

    const interfaces = MetadataGenerator.current.nodes
        .filter(node => {
            if (node.kind !== ts.SyntaxKind.InterfaceDeclaration || !MetadataGenerator.IsExportedNode(node)) { return false; }
            return (node as ts.InterfaceDeclaration).name.text.toLowerCase() === typeName.toLowerCase();
        }) as ts.InterfaceDeclaration[];

    if (!interfaces.length) { throw new Error(`No matching model found for referenced type ${typeName}`); }
    if (interfaces.length > 1) { throw new Error(`Multiple matching models found for referenced type ${typeName}; please make model names unique.`); }

    const interfaceDeclaration = interfaces[0];

    const referenceType: ReferenceType = {
        description: getModelDescription(interfaceDeclaration),
        name: typeName,
        properties: interfaceDeclaration.members
            .filter(member => member.kind === ts.SyntaxKind.PropertySignature)
            .map((property: any) => {
                const propertyDeclaration = property as ts.PropertyDeclaration;
                const identifier = propertyDeclaration.name as ts.Identifier;

                if (!propertyDeclaration.type) { throw new Error('No valid type found for property declaration.'); }

                return {
                    description: getPropertyDescription(propertyDeclaration),
                    name: identifier.text,
                    required: !property.questionToken,
                    type: ResolveType(propertyDeclaration.type)
                };
            })
    };

    const extendedProperties = getExtendedProperties(interfaceDeclaration);
    referenceType.properties = referenceType.properties.concat(extendedProperties);

    if (cacheReferenceType) {
        MetadataGenerator.current.AddReferenceType(referenceType);
    }

    localReferenceTypeCache[typeName] = referenceType;
    return referenceType;
}

function getExtendedProperties(interfaceDeclaration: ts.InterfaceDeclaration): Property[] {
    const properties = new Array<Property>();

    const heritageClauses = interfaceDeclaration.heritageClauses;
    if (!heritageClauses) { return properties; }

    heritageClauses.forEach(c => {
        if (!c.types) { return; }

        c.types.forEach(t => {
            const baseInterfaceName = t.expression as ts.Identifier;
            generateReferenceType(baseInterfaceName.text, false).properties
                .forEach(property => properties.push(property));
        });
    });

    return properties;
}

function getModelDescription(interfaceDeclaration: ts.InterfaceDeclaration) {
    return getNodeDescription(interfaceDeclaration);
}

function getPropertyDescription(propertyDeclaration: ts.PropertyDeclaration) {
    return getNodeDescription(propertyDeclaration);
}

function getNodeDescription(node: ts.InterfaceDeclaration | ts.PropertyDeclaration) {
    let symbol = MetadataGenerator.current.typeChecker.getSymbolAtLocation(node.name);

    let comments = symbol.getDocumentationComment();
    if (comments.length) { return ts.displayPartsToString(comments); }

    return '';
}
