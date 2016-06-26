import {Generator} from './generator';
import {Swagger} from './swagger';
import * as ts from 'typescript';

const referencedTypes: { [typeName: string]: Swagger.Schema } = {};

/**
 * Get a path parameter compatible swagger type from a type node
 */
export function GetPathableSwaggerType(type: ts.TypeNode) {
    const swaggerType = getSchemaFromSyntaxKind(type.kind);
    if (swaggerType) {
        return swaggerType.type;
    }

    throw new Error(`${(type as any).typeName.text} isn't a type that can be used as a path or query parameter.`);
}

export function GetSwaggerType(propertyType: ts.TypeNode): Swagger.Schema {
    const swaggerType = getSchemaFromSyntaxKind(propertyType.kind);
    if (swaggerType !== undefined) { return swaggerType; }

    if (propertyType.kind === ts.SyntaxKind.ArrayType) {
        const arrayType = propertyType as ts.ArrayTypeNode;
        if (arrayType.elementType.kind === ts.SyntaxKind.TypeReference) {
            const typeName = (arrayType.elementType as any).typeName.text;

            const definitionSchema = generateReferencedType(typeName);
            Generator.Current().AddDefinition(typeName, definitionSchema);

            return {
                items: { $ref: `#/definitions/${typeName}` },
                type: 'array'
            };
        }

        const primitiveArrayType = getSchemaFromSyntaxKind(arrayType.elementType.kind);
        if (!primitiveArrayType) { throw new Error('Property was an array type, but it wasn\'t a type reference or a primitive.'); }

        return {
            items: primitiveArrayType,
            type: 'array'
        };
    }

    let typeReference = propertyType as any;
    if (typeReference.kind !== ts.SyntaxKind.TypeReference) {
        throw new Error('Unable to convert TypeScript type to a Swagger type metadata.');
    }

    if (typeReference.typeName.text === 'Promise') {
        typeReference = typeReference.typeArguments[0] as any;
    }

    if (typeReference.kind === ts.SyntaxKind.TypeReference) {
        const typeName = typeReference.typeName.text;

        const definitionSchema = generateReferencedType(typeName);
        Generator.Current().AddDefinition(typeName, definitionSchema);

        return {
            $ref: `#/definitions/${typeName}`
        };
    }

    return GetSwaggerType(typeReference);
}

function generateReferencedType(typeName: string): Swagger.Schema {
    const existingType = referencedTypes[typeName];
    if (referencedTypes[typeName]) { return existingType; }

    const interfaces = Generator.Current().Nodes()
        .filter(node => {
            if (node.kind !== ts.SyntaxKind.InterfaceDeclaration || !Generator.IsExportedNode(node)) { return false; }
            return (node as ts.InterfaceDeclaration).name.text.toLowerCase() === typeName.toLowerCase();
        }) as ts.InterfaceDeclaration[];

    if (!interfaces.length) { throw new Error(`No matching model found for referenced type ${typeName}`); }
    if (interfaces.length > 1) { throw new Error(`Multiple matching models found for referenced type ${typeName}; please make model names unique.`); }

    const interfaceDeclaration = interfaces[0];
    const requiredProperties = new Array<string>();
    const properties: { [propertyName: string]: Swagger.Schema } = {};

    interfaceDeclaration.members
        .filter(m => m.kind === ts.SyntaxKind.PropertySignature)
        .forEach((m: any) => {
            const propertyDeclaration = m as ts.PropertyDeclaration;
            const propertyName = (propertyDeclaration.name as ts.Identifier).text;

            const isRequired = !m.questionToken;
            if (isRequired) { requiredProperties.push(propertyName); }

            const property = GetSwaggerType(propertyDeclaration.type);
            const description = getPropertyDescription(propertyDeclaration);
            if (description) {
                property.description = description;
            }

            properties[propertyName] = property;
        });

    getExtendedProperties(interfaceDeclaration, requiredProperties, properties);

    const definitionSchema = {
        description: getModelDescription(interfaceDeclaration),
        properties: properties,
        required: requiredProperties,
        type: 'object'
    };

    cacheReferencedType(typeName, definitionSchema);
    return definitionSchema;
}

function getExtendedProperties(
    interfaceDeclaration: ts.InterfaceDeclaration,
    requiredProperties: string[],
    properties: { [propertyName: string]: Swagger.Schema }
) {
    const heritageClauses = interfaceDeclaration.heritageClauses;
    if (!heritageClauses) { return; }

    heritageClauses.forEach(c => {
        c.types.forEach(t => {
            const baseInterfaceName = t.expression as ts.Identifier;
            const baseInterfaceSchema = generateReferencedType(baseInterfaceName.text);

            Object.assign(properties, baseInterfaceSchema.properties);
            Object.assign(requiredProperties, baseInterfaceSchema.required);
        });
    });
}

function cacheReferencedType(typeName: string, schema: Swagger.Schema) {
    referencedTypes[typeName] = schema;
}

function getModelDescription(interfaceDeclaration: ts.InterfaceDeclaration) {
    return getNodeDescription(interfaceDeclaration);
}

function getPropertyDescription(propertyDeclaration: ts.PropertyDeclaration) {
    return getNodeDescription(propertyDeclaration);
}

function getNodeDescription(node: ts.InterfaceDeclaration | ts.PropertyDeclaration) {
    let symbol = Generator.Current().TypeChecker().getSymbolAtLocation(node.name);

    let comments = symbol.getDocumentationComment();
    if (comments.length) { return ts.displayPartsToString(comments); }

    return '';
}

function getSchemaFromSyntaxKind(kind: ts.SyntaxKind) {
    const typeMap: { [kind: number]: Swagger.Schema } = {};
    typeMap[ts.SyntaxKind.NumberKeyword] = { format: 'int64', type: 'integer' };
    typeMap[ts.SyntaxKind.StringKeyword] = { type: 'string' };
    typeMap[ts.SyntaxKind.BooleanKeyword] = { type: 'boolean' };
    typeMap[ts.SyntaxKind.VoidKeyword] = null;

    return typeMap[kind];
}
