import {Swagger} from './swagger';
import * as ts from 'typescript';

const referencedTypes: { [typeName: string]: boolean} = {};

const typeMap: { [kind: number]: Swagger.Schema } = {};
typeMap[ts.SyntaxKind.NumberKeyword] = { format: 'int64', type: 'integer' };
typeMap[ts.SyntaxKind.StringKeyword] = { type: 'string' };
typeMap[ts.SyntaxKind.BooleanKeyword] = { type: 'boolean' };
typeMap[ts.SyntaxKind.VoidKeyword] = null;

/**
 * Get a path parameter compatible swagger type from a type node
 */
export function getPathableSwaggerType(type: ts.TypeNode) {
    const swaggerType = typeMap[type.kind];
    if (swaggerType) {
        return swaggerType.type;
    }

    throw new Error('Not a type that can be used as a path or query parameter.');
}

export function getSwaggerType(propertyType: ts.TypeNode): Swagger.Schema {
    const swaggerType = typeMap[propertyType.kind];
    if (swaggerType !== undefined) { return swaggerType; }

    if (propertyType.kind === ts.SyntaxKind.ArrayType) {
        const arrayType = propertyType as ts.ArrayTypeNode;
        if (arrayType.elementType.kind === ts.SyntaxKind.TypeReference) {
            const typeReference = (arrayType.elementType as any).typeName.text;
            cacheReferencedType(typeReference);

            return {
                items: {
                    $ref: `#/definitions/${typeReference}`
                },
                type: 'array'
            };
        }

        const primitiveArrayType = typeMap[arrayType.elementType.kind];
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
        cacheReferencedType(typeName);

        return {
            $ref: `#/definitions/${typeName}`
        };
    }

    return getSwaggerType(typeReference);
}

export function getReferencedTypes() {
    return Object.keys(referencedTypes);
}

/**
 * Store this type name as a model that needs to later be crawled
 */
function cacheReferencedType(typeName: string) {
    referencedTypes[typeName] = true;
}
