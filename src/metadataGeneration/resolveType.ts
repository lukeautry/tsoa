import * as ts from 'typescript';
import * as _ from 'lodash';
import { MetadataGenerator } from './metadataGenerator';
import { Type, EnumerateType, ReferenceType, ArrayType, Property } from './types';
import { getJSDocTagNames } from './../utils/jsDocUtils';
import { getPropertyValidators } from './../utils/validatorUtils';
import { GenerateMetadataError } from './exceptions';

const syntaxKindMap: { [kind: number]: string } = {};
syntaxKindMap[ts.SyntaxKind.NumberKeyword] = 'number';
syntaxKindMap[ts.SyntaxKind.StringKeyword] = 'string';
syntaxKindMap[ts.SyntaxKind.BooleanKeyword] = 'boolean';
syntaxKindMap[ts.SyntaxKind.VoidKeyword] = 'void';

const localReferenceTypeCache: { [typeName: string]: ReferenceType } = {};
const inProgressTypes: { [typeName: string]: boolean } = {};

type UsableDeclaration = ts.InterfaceDeclaration | ts.ClassDeclaration | ts.TypeAliasDeclaration;

export function ResolveType(typeNode: ts.TypeNode): Type {
    const primitiveType = getPrimitiveType(typeNode);
    if (primitiveType) {
        return primitiveType;
    }

    if (typeNode.kind === ts.SyntaxKind.ArrayType) {
        const arrayType = typeNode as ts.ArrayTypeNode;
        return <ArrayType>{
            elementType: ResolveType(arrayType.elementType),
            typeName: 'array'
        };
    }

    if (typeNode.kind === ts.SyntaxKind.UnionType) {
        return { typeName: 'object' };
    }

    if (typeNode.kind !== ts.SyntaxKind.TypeReference) {
        throw new GenerateMetadataError(typeNode, `Unknown type: ${ts.SyntaxKind[typeNode.kind]}`);
    }
    let typeReference: any = typeNode;
    if (typeReference.typeName.kind === ts.SyntaxKind.Identifier) {
        if (typeReference.typeName.text === 'Date') { return getDateType(typeNode); }
        if (typeReference.typeName.text === 'Buffer') { return { typeName: 'buffer' }; }

        if (typeReference.typeName.text === 'Promise') {
            typeReference = typeReference.typeArguments[0];
            return ResolveType(typeReference);
        }
    }

    const enumType = getEnumerateType(typeNode);
    if (enumType) {
        return enumType;
    }

    const literalType = getLiteralType(typeNode);
    if (literalType) {
        return literalType;
    }

    let referenceType: ReferenceType;

    if (typeReference.typeArguments && typeReference.typeArguments.length === 1) {
        const typeT: ts.TypeNode[] = typeReference.typeArguments as ts.TypeNode[];
        referenceType = getReferenceType(typeReference.typeName as ts.EntityName, typeT);
    } else {
        referenceType = getReferenceType(typeReference.typeName as ts.EntityName);
    }

    MetadataGenerator.current.AddReferenceType(referenceType);
    return referenceType;
}

function getPrimitiveType(typeNode: ts.TypeNode): Type | undefined {
    const primitiveType = syntaxKindMap[typeNode.kind];
    if (!primitiveType) { return; }

    if (primitiveType === 'number') {
        const parentNode = typeNode.parent as ts.Node;
        if (!parentNode) {
            return { typeName: 'double' };
        }

        const tags = getJSDocTagNames(parentNode).filter(name => {
            return ['isInt', 'isLong', 'isFloat', 'isDouble'].some(m => m === name);
        });
        if (tags.length === 0) {
            return { typeName: 'double' };
        }

        switch (tags[0]) {
            case 'isInt':
                return { typeName: 'integer' };
            case 'isLong':
                return { typeName: 'long' };
            case 'isFloat':
                return { typeName: 'float' };
            case 'isDouble':
                return { typeName: 'double' };
            default:
                return { typeName: 'double' };
        }
    }
    return { typeName: primitiveType };
}

function getDateType(typeNode: ts.TypeNode): Type {
    const parentNode = typeNode.parent as ts.Node;
    if (!parentNode) {
        return { typeName: 'datetime' };
    }
    const tags = getJSDocTagNames(parentNode).filter(name => {
        return ['isDate', 'isDateTime'].some(m => m === name);
    });

    if (tags.length === 0) {
        return { typeName: 'datetime' };
    }
    switch (tags[0]) {
        case 'isDate':
            return { typeName: 'date' };
        case 'isDateTime':
            return { typeName: 'datetime' };
        default:
            return { typeName: 'datetime' };
    }
}

function getEnumerateType(typeNode: ts.TypeNode): EnumerateType | undefined {
    const enumName = (typeNode as any).typeName.text;
    const enumTypes = MetadataGenerator.current.nodes
        .filter(node => node.kind === ts.SyntaxKind.EnumDeclaration)
        .filter(node => (node as any).name.text === enumName);

    if (!enumTypes.length) { return; }
    if (enumTypes.length > 1) {
        throw new GenerateMetadataError(typeNode, `Multiple matching enum found for enum ${enumName}; please make enum names unique.`);
    }

    const enumDeclaration = enumTypes[0] as ts.EnumDeclaration;

    function getEnumValue(member: any) {
        const constantValue = MetadataGenerator.current.typeChecker.getConstantValue(member);
        if (constantValue !== null) {
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
    return <EnumerateType>{
        enumMembers: enumDeclaration.members.map((member: any, index) => {
            return getEnumValue(member) || index;
        }),
        typeName: 'enum',
    };
}

function getLiteralType(typeNode: ts.TypeNode): EnumerateType | undefined {
    const literalName = (typeNode as any).typeName.text;
    const literalTypes = MetadataGenerator.current.nodes
        .filter(node => node.kind === ts.SyntaxKind.TypeAliasDeclaration)
        .filter(node => {
            const innerType = (node as any).type;
            return innerType.kind === ts.SyntaxKind.UnionType && (innerType as any).types;
        })
        .filter(node => (node as any).name.text === literalName);

    if (!literalTypes.length) { return; }
    if (literalTypes.length > 1) {
        throw new GenerateMetadataError(typeNode, `Multiple matching enum found for enum ${literalName}; please make enum names unique.`);
    }

    const unionTypes = (literalTypes[0] as any).type.types;
    return <EnumerateType>{
        enumMembers: unionTypes.map((unionNode: any) => unionNode.literal.text as string),
        typeName: 'enum',
    };
}

function getReferenceType(type: ts.EntityName, genericTypes?: ts.TypeNode[]): ReferenceType {
    const typeName = resolveFqTypeName(type);
    const typeNameWithGenerics = getTypeName(typeName, genericTypes);

    try {

        const existingType = localReferenceTypeCache[typeNameWithGenerics];
        if (existingType) { return existingType; }

        if (inProgressTypes[typeNameWithGenerics]) {
            return createCircularDependencyResolver(typeNameWithGenerics);
        }

        inProgressTypes[typeNameWithGenerics] = true;

        const modelTypeDeclaration = getModelTypeDeclaration(type);

        const properties = removeDuplicateTypeProperties(getModelTypeProperties(modelTypeDeclaration, genericTypes));
        const additionalProperties = getModelTypeAdditionalProperties(modelTypeDeclaration);

        const referenceType: ReferenceType = {
            description: getModelDescription(modelTypeDeclaration),
            properties: properties,
            typeName: typeNameWithGenerics,
        };
        if (additionalProperties) {
            referenceType.additionalProperties = additionalProperties;
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

/**
 * Removes properties with duplicate names.
 *
 * @param {Property[]} props
 * @returns {Property[]}
 */
function removeDuplicateTypeProperties(props: Property[]): Property[] {
    const foundProps = {};
    const sanitizedProps: Property[] = [];

    props.forEach((prop: Property) => {
        if (!foundProps[prop.name]) {
            sanitizedProps.push(prop);
            foundProps[prop.name] = true;
        }
    });

    return sanitizedProps;
}

function resolveFqTypeName(type: ts.EntityName): string {
    if (type.kind === ts.SyntaxKind.Identifier) {
        return (type as ts.Identifier).text;
    }

    const qualifiedType = type as ts.QualifiedName;
    return resolveFqTypeName(qualifiedType.left) + '.' + (qualifiedType.right as ts.Identifier).text;
}

function getTypeName(typeName: string, genericTypes?: ts.TypeNode[]): string {
    if (!genericTypes || !genericTypes.length) { return typeName; }
    return typeName + genericTypes.map(t => getAnyTypeName(t)).join('');
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
        throw new GenerateMetadataError(typeNode, `Unknown type: ${ts.SyntaxKind[typeNode.kind]}.`);
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
        properties: new Array<Property>(),
        typeName: typeName,
    };

    MetadataGenerator.current.OnFinish(referenceTypes => {
        const realReferenceType = referenceTypes[typeName];
        if (!realReferenceType) { return; }
        referenceType.description = realReferenceType.description;
        referenceType.properties = realReferenceType.properties;
        referenceType.typeName = realReferenceType.typeName;
    });

    return referenceType;
}

function nodeIsUsable(node: ts.Node) {
    switch (node.kind) {
        case ts.SyntaxKind.InterfaceDeclaration:
        case ts.SyntaxKind.ClassDeclaration:
        case ts.SyntaxKind.TypeAliasDeclaration:
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

function resolveModelTypeScope(leftmost: ts.EntityName, statements: any[]): any[] {
    while (leftmost.parent && leftmost.parent.kind === ts.SyntaxKind.QualifiedName) {
        const leftmostName = leftmost.kind === ts.SyntaxKind.Identifier
            ? (leftmost as ts.Identifier).text
            : (leftmost as ts.QualifiedName).right.text;
        const moduleDeclarations = statements
            .filter(node => {
                if (node.kind !== ts.SyntaxKind.ModuleDeclaration || !MetadataGenerator.current.IsExportedNode(node)) {
                    return false;
                }

                const moduleDeclaration = node as ts.ModuleDeclaration;
                return (moduleDeclaration.name as ts.Identifier).text.toLowerCase() === leftmostName.toLowerCase();
            }) as Array<ts.ModuleDeclaration>;

        if (!moduleDeclarations.length) {
            throw new GenerateMetadataError(leftmost, `No matching module declarations found for ${leftmostName}.`);
        }
        if (moduleDeclarations.length > 1) {
            throw new GenerateMetadataError(leftmost, `Multiple matching module declarations found for ${leftmostName}; please make module declarations unique.`);
        }

        const moduleBlock = moduleDeclarations[0].body as ts.ModuleBlock;
        if (moduleBlock === null || moduleBlock.kind !== ts.SyntaxKind.ModuleBlock) {
            throw new GenerateMetadataError(leftmost, `Module declaration found for ${leftmostName} has no body.`);
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
    const modelTypes = statements
        .filter(node => {
            if (!nodeIsUsable(node) || !MetadataGenerator.current.IsExportedNode(node)) {
                return false;
            }

            const modelTypeDeclaration = node as UsableDeclaration;
            return (modelTypeDeclaration.name as ts.Identifier).text === typeName;
        }) as Array<UsableDeclaration>;

    if (!modelTypes.length) {
        throw new GenerateMetadataError(type, `No matching model found for referenced type ${typeName}.`);
    }
    if (modelTypes.length > 1) {
        const conflicts = modelTypes.map(modelType => modelType.getSourceFile().fileName).join('"; "');
        throw new GenerateMetadataError(type, `Multiple matching models found for referenced type ${typeName}; please make model names unique. Conflicts found: "${conflicts}".`);
    }

    return modelTypes[0];
}

function getModelTypeProperties(node: UsableDeclaration, genericTypes?: ts.TypeNode[]): Property[] {
    if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
        const interfaceDeclaration = node as ts.InterfaceDeclaration;
        return interfaceDeclaration.members
            .filter(member => member.kind === ts.SyntaxKind.PropertySignature)
            .map((member: any) => {

                const propertyDeclaration = member as ts.PropertyDeclaration;
                const identifier = propertyDeclaration.name as ts.Identifier;

                if (!propertyDeclaration.type) {
                    throw new GenerateMetadataError(node, `No valid type found for property declaration.`);
                }

                // Declare a variable that can be overridden if needed
                let aType = propertyDeclaration.type;

                // aType.kind will always be a TypeReference when the property of Interface<T> is of type T
                if (aType.kind === ts.SyntaxKind.TypeReference && genericTypes && genericTypes.length && node.typeParameters) {

                    // The type definitions are conviently located on the object which allow us to map -> to the genericTypes
                    const typeParams = _.map(node.typeParameters, (typeParam: ts.TypeParameterDeclaration) => {
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
                    required: !propertyDeclaration.questionToken,
                    type: ResolveType(aType),
                    validators: getPropertyValidators(propertyDeclaration),
                } as Property;
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

            if (!declaration.type) {
                throw new GenerateMetadataError(declaration, `No valid type found for property declaration.`);
            }

            return {
                description: getNodeDescription(declaration),
                name: identifier.text,
                required: !declaration.questionToken,
                type: ResolveType(declaration.type),
                validators: getPropertyValidators(declaration as ts.PropertyDeclaration),
            } as Property;
        });
}

function getModelTypeAdditionalProperties(node: UsableDeclaration) {
    if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
        const interfaceDeclaration = node as ts.InterfaceDeclaration;
        const indexMember = interfaceDeclaration.members.find((member) => member.kind === ts.SyntaxKind.IndexSignature);
        if (!indexMember) {
            return undefined;
        }

        const indexSignatureDeclaration = indexMember as ts.IndexSignatureDeclaration;
        const indexType = ResolveType(<ts.TypeNode>indexSignatureDeclaration.parameters[0].type);
        if (indexType.typeName !== 'string') {
            throw new GenerateMetadataError(node, `Only string indexers are supported.`);
        }

        return ResolveType(<ts.TypeNode>indexSignatureDeclaration.type);
    }

    return undefined;
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
            const baseEntityName = t.expression as ts.EntityName;
            getReferenceType(baseEntityName).properties
                .forEach(property => properties.push(property));
        });
    });

    return properties;
}

function getModelDescription(modelTypeDeclaration: UsableDeclaration) {
    return getNodeDescription(modelTypeDeclaration);
}

function getNodeDescription(node: UsableDeclaration | ts.PropertyDeclaration | ts.ParameterDeclaration) {
    const symbol = MetadataGenerator.current.typeChecker.getSymbolAtLocation(node.name as ts.Node);

    /**
    * TODO: Workaround for what seems like a bug in the compiler
    * Warrants more investigation and possibly a PR against typescript
    */
    //
    if (node.kind === ts.SyntaxKind.Parameter) {
        // TypeScript won't parse jsdoc if the flag is 4, i.e. 'Property'
        symbol.flags = 0;
    }

    const comments = symbol.getDocumentationComment();
    if (comments.length) { return ts.displayPartsToString(comments); }

    return '';
}
