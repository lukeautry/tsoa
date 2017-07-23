"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var map = require('lodash/map');
var indexOf = require('lodash/indexOf');
var ts = require("typescript");
var metadataGenerator_1 = require("./metadataGenerator");
var jsDocUtils_1 = require("./../utils/jsDocUtils");
var validatorUtils_1 = require("./../utils/validatorUtils");
var exceptions_1 = require("./exceptions");
var syntaxKindMap = {};
syntaxKindMap[ts.SyntaxKind.NumberKeyword] = 'number';
syntaxKindMap[ts.SyntaxKind.StringKeyword] = 'string';
syntaxKindMap[ts.SyntaxKind.BooleanKeyword] = 'boolean';
syntaxKindMap[ts.SyntaxKind.VoidKeyword] = 'void';
var localReferenceTypeCache = {};
var inProgressTypes = {};
function ResolveType(typeNode) {
    var primitiveType = getPrimitiveType(typeNode);
    if (primitiveType) {
        return primitiveType;
    }
    if (typeNode.kind === ts.SyntaxKind.ArrayType) {
        var arrayType = typeNode;
        return {
            elementType: ResolveType(arrayType.elementType),
            typeName: 'array'
        };
    }
    if (typeNode.kind === ts.SyntaxKind.UnionType) {
        return { typeName: 'object' };
    }
    if (typeNode.kind !== ts.SyntaxKind.TypeReference) {
        throw new exceptions_1.GenerateMetadataError(typeNode, "Unknown type: " + ts.SyntaxKind[typeNode.kind]);
    }
    var typeReference = typeNode;
    if (typeReference.typeName.kind === ts.SyntaxKind.Identifier) {
        if (typeReference.typeName.text === 'Date') {
            return getDateType(typeNode);
        }
        if (typeReference.typeName.text === 'Buffer') {
            return { typeName: 'buffer' };
        }
        if (typeReference.typeName.text === 'Promise') {
            typeReference = typeReference.typeArguments[0];
            return ResolveType(typeReference);
        }
    }
    var enumType = getEnumerateType(typeNode);
    if (enumType) {
        return enumType;
    }
    var literalType = getLiteralType(typeNode);
    if (literalType) {
        return literalType;
    }
    var referenceType;
    if (typeReference.typeArguments && typeReference.typeArguments.length === 1) {
        var typeT = typeReference.typeArguments;
        referenceType = getReferenceType(typeReference.typeName, typeT);
    }
    else {
        referenceType = getReferenceType(typeReference.typeName);
    }
    metadataGenerator_1.MetadataGenerator.current.AddReferenceType(referenceType);
    return referenceType;
}
exports.ResolveType = ResolveType;
function getPrimitiveType(typeNode) {
    var primitiveType = syntaxKindMap[typeNode.kind];
    if (!primitiveType) {
        return;
    }
    if (primitiveType === 'number') {
        var parentNode = typeNode.parent;
        if (!parentNode) {
            return { typeName: 'double' };
        }
        var tags = jsDocUtils_1.getJSDocTagNames(parentNode).filter(function (name) {
            return ['isInt', 'isLong', 'isFloat', 'isDouble'].some(function (m) { return m === name; });
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
function getDateType(typeNode) {
    var parentNode = typeNode.parent;
    if (!parentNode) {
        return { typeName: 'datetime' };
    }
    var tags = jsDocUtils_1.getJSDocTagNames(parentNode).filter(function (name) {
        return ['isDate', 'isDateTime'].some(function (m) { return m === name; });
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
function getEnumerateType(typeNode) {
    var enumName = typeNode.typeName.text;
    var enumTypes = metadataGenerator_1.MetadataGenerator.current.nodes
        .filter(function (node) { return node.kind === ts.SyntaxKind.EnumDeclaration; })
        .filter(function (node) { return node.name.text === enumName; });
    if (!enumTypes.length) {
        return;
    }
    if (enumTypes.length > 1) {
        throw new exceptions_1.GenerateMetadataError(typeNode, "Multiple matching enum found for enum " + enumName + "; please make enum names unique.");
    }
    var enumDeclaration = enumTypes[0];
    function getEnumValue(member) {
        var initializer = member.initializer;
        if (initializer) {
            if (initializer.expression) {
                return initializer.expression.text;
            }
            return initializer.text;
        }
        return;
    }
    return {
        enumMembers: enumDeclaration.members.map(function (member, index) {
            return getEnumValue(member) || String(index);
        }),
        typeName: 'enum',
    };
}
function getLiteralType(typeNode) {
    var literalName = typeNode.typeName.text;
    var literalTypes = metadataGenerator_1.MetadataGenerator.current.nodes
        .filter(function (node) { return node.kind === ts.SyntaxKind.TypeAliasDeclaration; })
        .filter(function (node) {
        var innerType = node.type;
        return innerType.kind === ts.SyntaxKind.UnionType && innerType.types;
    })
        .filter(function (node) { return node.name.text === literalName; });
    if (!literalTypes.length) {
        return;
    }
    if (literalTypes.length > 1) {
        throw new exceptions_1.GenerateMetadataError(typeNode, "Multiple matching enum found for enum " + literalName + "; please make enum names unique.");
    }
    var unionTypes = literalTypes[0].type.types;
    return {
        enumMembers: unionTypes.map(function (unionNode) { return unionNode.literal.text; }),
        typeName: 'enum',
    };
}
function getReferenceType(type, genericTypes) {
    var typeName = resolveFqTypeName(type);
    var typeNameWithGenerics = getTypeName(typeName, genericTypes);
    try {
        var existingType = localReferenceTypeCache[typeNameWithGenerics];
        if (existingType) {
            return existingType;
        }
        if (inProgressTypes[typeNameWithGenerics]) {
            return createCircularDependencyResolver(typeNameWithGenerics);
        }
        inProgressTypes[typeNameWithGenerics] = true;
        var modelTypeDeclaration = getModelTypeDeclaration(type);
        var properties = getModelTypeProperties(modelTypeDeclaration, genericTypes);
        var additionalProperties = getModelTypeAdditionalProperties(modelTypeDeclaration);
        var referenceType = {
            description: getModelDescription(modelTypeDeclaration),
            properties: properties,
            typeName: typeNameWithGenerics,
        };
        if (additionalProperties) {
            referenceType.additionalProperties = additionalProperties;
        }
        var extendedProperties = getInheritedProperties(modelTypeDeclaration);
        referenceType.properties = referenceType.properties.concat(extendedProperties);
        localReferenceTypeCache[typeNameWithGenerics] = referenceType;
        return referenceType;
    }
    catch (err) {
        console.error("There was a problem resolving type of '" + getTypeName(typeName, genericTypes) + "'.");
        throw err;
    }
}
function resolveFqTypeName(type) {
    if (type.kind === ts.SyntaxKind.Identifier) {
        return type.text;
    }
    var qualifiedType = type;
    return resolveFqTypeName(qualifiedType.left) + '.' + qualifiedType.right.text;
}
function getTypeName(typeName, genericTypes) {
    if (!genericTypes || !genericTypes.length) {
        return typeName;
    }
    return typeName + genericTypes.map(function (t) { return getAnyTypeName(t); }).join('');
}
function getAnyTypeName(typeNode) {
    var primitiveType = syntaxKindMap[typeNode.kind];
    if (primitiveType) {
        return primitiveType;
    }
    if (typeNode.kind === ts.SyntaxKind.ArrayType) {
        var arrayType = typeNode;
        return getAnyTypeName(arrayType.elementType) + '[]';
    }
    if (typeNode.kind === ts.SyntaxKind.UnionType) {
        return 'object';
    }
    if (typeNode.kind !== ts.SyntaxKind.TypeReference) {
        throw new exceptions_1.GenerateMetadataError(typeNode, "Unknown type: " + ts.SyntaxKind[typeNode.kind] + ".");
    }
    var typeReference = typeNode;
    try {
        return typeReference.typeName.text;
    }
    catch (e) {
        // idk what would hit this? probably needs more testing
        console.error(e);
        return typeNode.toString();
    }
}
function createCircularDependencyResolver(typeName) {
    var referenceType = {
        properties: new Array(),
        typeName: typeName,
    };
    metadataGenerator_1.MetadataGenerator.current.OnFinish(function (referenceTypes) {
        var realReferenceType = referenceTypes[typeName];
        if (!realReferenceType) {
            return;
        }
        referenceType.description = realReferenceType.description;
        referenceType.properties = realReferenceType.properties;
        referenceType.typeName = realReferenceType.typeName;
    });
    return referenceType;
}
function nodeIsUsable(node) {
    switch (node.kind) {
        case ts.SyntaxKind.InterfaceDeclaration:
        case ts.SyntaxKind.ClassDeclaration:
        case ts.SyntaxKind.TypeAliasDeclaration:
            return true;
        default: return false;
    }
}
function resolveLeftmostIdentifier(type) {
    while (type.kind !== ts.SyntaxKind.Identifier) {
        type = type.left;
    }
    return type;
}
function resolveModelTypeScope(leftmost, statements) {
    var _loop_1 = function () {
        var leftmostName = leftmost.kind === ts.SyntaxKind.Identifier
            ? leftmost.text
            : leftmost.right.text;
        var moduleDeclarations = statements
            .filter(function (node) {
            if (node.kind !== ts.SyntaxKind.ModuleDeclaration || !metadataGenerator_1.MetadataGenerator.current.IsExportedNode(node)) {
                return false;
            }
            var moduleDeclaration = node;
            return moduleDeclaration.name.text.toLowerCase() === leftmostName.toLowerCase();
        });
        if (!moduleDeclarations.length) {
            throw new exceptions_1.GenerateMetadataError(leftmost, "No matching module declarations found for " + leftmostName + ".");
        }
        if (moduleDeclarations.length > 1) {
            throw new exceptions_1.GenerateMetadataError(leftmost, "Multiple matching module declarations found for " + leftmostName + "; please make module declarations unique.");
        }
        var moduleBlock = moduleDeclarations[0].body;
        if (moduleBlock === null || moduleBlock.kind !== ts.SyntaxKind.ModuleBlock) {
            throw new exceptions_1.GenerateMetadataError(leftmost, "Module declaration found for " + leftmostName + " has no body.");
        }
        statements = moduleBlock.statements;
        leftmost = leftmost.parent;
    };
    while (leftmost.parent && leftmost.parent.kind === ts.SyntaxKind.QualifiedName) {
        _loop_1();
    }
    return statements;
}
function getModelTypeDeclaration(type) {
    var leftmostIdentifier = resolveLeftmostIdentifier(type);
    var statements = resolveModelTypeScope(leftmostIdentifier, metadataGenerator_1.MetadataGenerator.current.nodes);
    var typeName = type.kind === ts.SyntaxKind.Identifier
        ? type.text
        : type.right.text;
    var modelTypes = statements
        .filter(function (node) {
        if (!nodeIsUsable(node) || !metadataGenerator_1.MetadataGenerator.current.IsExportedNode(node)) {
            return false;
        }
        var modelTypeDeclaration = node;
        return modelTypeDeclaration.name.text === typeName;
    });
    if (!modelTypes.length) {
        throw new exceptions_1.GenerateMetadataError(type, "No matching model found for referenced type " + typeName + ".");
    }
    if (modelTypes.length > 1) {
        var conflicts = modelTypes.map(function (modelType) { return modelType.getSourceFile().fileName; }).join('"; "');
        throw new exceptions_1.GenerateMetadataError(type, "Multiple matching models found for referenced type " + typeName + "; please make model names unique. Conflicts found: \"" + conflicts + "\".");
    }
    return modelTypes[0];
}
function getModelTypeProperties(node, genericTypes) {
    if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
        var interfaceDeclaration = node;
        return interfaceDeclaration.members
            .filter(function (member) { return member.kind === ts.SyntaxKind.PropertySignature; })
            .map(function (member) {
            var propertyDeclaration = member;
            var identifier = propertyDeclaration.name;
            if (!propertyDeclaration.type) {
                throw new exceptions_1.GenerateMetadataError(node, "No valid type found for property declaration.");
            }
            // Declare a variable that can be overridden if needed
            var aType = propertyDeclaration.type;
            // aType.kind will always be a TypeReference when the property of Interface<T> is of type T
            if (aType.kind === ts.SyntaxKind.TypeReference && genericTypes && genericTypes.length && node.typeParameters) {
                // The type definitions are conviently located on the object which allow us to map -> to the genericTypes
                var typeParams = map(node.typeParameters, function (typeParam) {
                    return typeParam.name.text;
                });
                // I am not sure in what cases
                var typeIdentifier = aType.typeName;
                var typeIdentifierName = void 0;
                // typeIdentifier can either be a Identifier or a QualifiedName
                if (typeIdentifier.text) {
                    typeIdentifierName = typeIdentifier.text;
                }
                else {
                    typeIdentifierName = typeIdentifier.right.text;
                }
                // I could not produce a situation where this did not find it so its possible this check is irrelevant
                var indexOfType = indexOf(typeParams, typeIdentifierName);
                if (indexOfType >= 0) {
                    aType = genericTypes[indexOfType];
                }
            }
            return {
                description: getNodeDescription(propertyDeclaration),
                name: identifier.text,
                required: !propertyDeclaration.questionToken,
                type: ResolveType(aType),
                validators: validatorUtils_1.getPropertyValidators(propertyDeclaration),
            };
        });
    }
    if (node.kind === ts.SyntaxKind.TypeAliasDeclaration) {
        var aliasDeclaration = node;
        var properties_1 = [];
        if (aliasDeclaration.type.kind === ts.SyntaxKind.IntersectionType) {
            var intersectionTypeNode = aliasDeclaration.type;
            intersectionTypeNode.types.forEach(function (type) {
                if (type.kind === ts.SyntaxKind.TypeReference) {
                    var typeReferenceNode = type;
                    var modelType = getModelTypeDeclaration(typeReferenceNode.typeName);
                    var modelProps = getModelTypeProperties(modelType);
                    properties_1.push.apply(properties_1, modelProps);
                }
            });
        }
        if (aliasDeclaration.type.kind === ts.SyntaxKind.TypeReference) {
            var typeReferenceNode = aliasDeclaration.type;
            var modelType = getModelTypeDeclaration(typeReferenceNode.typeName);
            var modelProps = getModelTypeProperties(modelType);
            properties_1.push.apply(properties_1, modelProps);
        }
        return properties_1;
    }
    var classDeclaration = node;
    var properties = classDeclaration.members.filter(function (member) {
        if (member.kind !== ts.SyntaxKind.PropertyDeclaration) {
            return false;
        }
        var propertySignature = member;
        return propertySignature && hasPublicModifier(propertySignature);
    });
    var classConstructor = classDeclaration.members.find(function (member) { return member.kind === ts.SyntaxKind.Constructor; });
    if (classConstructor && classConstructor.parameters) {
        properties = properties.concat(classConstructor.parameters.filter(function (parameter) { return hasPublicModifier(parameter); }));
    }
    return properties
        .map(function (declaration) {
        var identifier = declaration.name;
        if (!declaration.type) {
            throw new exceptions_1.GenerateMetadataError(declaration, "No valid type found for property declaration.");
        }
        return {
            description: getNodeDescription(declaration),
            name: identifier.text,
            required: !declaration.questionToken,
            type: ResolveType(declaration.type),
            validators: validatorUtils_1.getPropertyValidators(declaration),
        };
    });
}
function getModelTypeAdditionalProperties(node) {
    if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
        var interfaceDeclaration = node;
        var indexMember = interfaceDeclaration.members.find(function (member) { return member.kind === ts.SyntaxKind.IndexSignature; });
        if (!indexMember) {
            return undefined;
        }
        var indexSignatureDeclaration = indexMember;
        var indexType = ResolveType(indexSignatureDeclaration.parameters[0].type);
        if (indexType.typeName !== 'string') {
            throw new exceptions_1.GenerateMetadataError(node, "Only string indexers are supported.");
        }
        return ResolveType(indexSignatureDeclaration.type);
    }
    return undefined;
}
function hasPublicModifier(node) {
    return !node.modifiers || node.modifiers.every(function (modifier) {
        return modifier.kind !== ts.SyntaxKind.ProtectedKeyword && modifier.kind !== ts.SyntaxKind.PrivateKeyword;
    });
}
function getInheritedProperties(modelTypeDeclaration) {
    var properties = new Array();
    if (modelTypeDeclaration.kind === ts.SyntaxKind.TypeAliasDeclaration) {
        return [];
    }
    var heritageClauses = modelTypeDeclaration.heritageClauses;
    if (!heritageClauses) {
        return properties;
    }
    heritageClauses.forEach(function (clause) {
        if (!clause.types) {
            return;
        }
        clause.types.forEach(function (t) {
            var baseEntityName = t.expression;
            getReferenceType(baseEntityName).properties
                .forEach(function (property) { return properties.push(property); });
        });
    });
    return properties;
}
function getModelDescription(modelTypeDeclaration) {
    return getNodeDescription(modelTypeDeclaration);
}
function getNodeDescription(node) {
    var symbol = metadataGenerator_1.MetadataGenerator.current.typeChecker.getSymbolAtLocation(node.name);
    if (!symbol) {
        return undefined;
    }
    ;
    /**
    * TODO: Workaround for what seems like a bug in the compiler
    * Warrants more investigation and possibly a PR against typescript
    */
    //
    if (node.kind === ts.SyntaxKind.Parameter) {
        // TypeScript won't parse jsdoc if the flag is 4, i.e. 'Property'
        symbol.flags = 0;
    }
    var comments = symbol.getDocumentationComment();
    if (comments.length) {
        return ts.displayPartsToString(comments);
    }
    return undefined;
}
//# sourceMappingURL=resolveType.js.map