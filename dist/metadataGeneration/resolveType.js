"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var indexOf = require("lodash.indexof");
var map = require("lodash.map");
var ts = require("typescript");
var jsDocUtils_1 = require("./../utils/jsDocUtils");
var validatorUtils_1 = require("./../utils/validatorUtils");
var exceptions_1 = require("./exceptions");
var metadataGenerator_1 = require("./metadataGenerator");
var syntaxKindMap = {};
syntaxKindMap[ts.SyntaxKind.NumberKeyword] = 'number';
syntaxKindMap[ts.SyntaxKind.StringKeyword] = 'string';
syntaxKindMap[ts.SyntaxKind.BooleanKeyword] = 'boolean';
syntaxKindMap[ts.SyntaxKind.VoidKeyword] = 'void';
var localReferenceTypeCache = {};
var inProgressTypes = {};
function resolveType(typeNode, parentNode, extractEnum) {
    if (extractEnum === void 0) { extractEnum = true; }
    var primitiveType = getPrimitiveType(typeNode, parentNode);
    if (primitiveType) {
        return primitiveType;
    }
    if (typeNode.kind === ts.SyntaxKind.ArrayType) {
        return {
            dataType: 'array',
            elementType: resolveType(typeNode.elementType),
        };
    }
    if (typeNode.kind === ts.SyntaxKind.UnionType) {
        var unionType = typeNode;
        var supportType = unionType.types.some(function (type) { return type.kind === ts.SyntaxKind.LiteralType; });
        if (supportType) {
            return {
                dataType: 'enum',
                enums: unionType.types.map(function (type) {
                    var literalType = type.literal;
                    switch (literalType.kind) {
                        case ts.SyntaxKind.TrueKeyword: return 'true';
                        case ts.SyntaxKind.FalseKeyword: return 'false';
                        default: return String(literalType.text);
                    }
                }),
            };
        }
        else {
            return { dataType: 'object' };
        }
    }
    if (typeNode.kind === ts.SyntaxKind.AnyKeyword) {
        return { dataType: 'any' };
    }
    if (typeNode.kind !== ts.SyntaxKind.TypeReference) {
        throw new exceptions_1.GenerateMetadataError("Unknown type: " + ts.SyntaxKind[typeNode.kind]);
    }
    var typeReference = typeNode;
    if (typeReference.typeName.kind === ts.SyntaxKind.Identifier) {
        if (typeReference.typeName.text === 'Date') {
            return getDateType(typeNode, parentNode);
        }
        if (typeReference.typeName.text === 'Buffer') {
            return { dataType: 'buffer' };
        }
        if (typeReference.typeName.text === 'Array' && typeReference.typeArguments && typeReference.typeArguments.length === 1) {
            return {
                dataType: 'array',
                elementType: resolveType(typeReference.typeArguments[0]),
            };
        }
        if (typeReference.typeName.text === 'Promise' && typeReference.typeArguments && typeReference.typeArguments.length === 1) {
            return resolveType(typeReference.typeArguments[0]);
        }
    }
    if (!extractEnum) {
        var enumType = getEnumerateType(typeReference.typeName, extractEnum);
        if (enumType) {
            return enumType;
        }
    }
    var literalType = getLiteralType(typeReference.typeName);
    if (literalType) {
        return literalType;
    }
    var referenceType;
    if (typeReference.typeArguments && typeReference.typeArguments.length === 1) {
        var typeT = typeReference.typeArguments;
        referenceType = getReferenceType(typeReference.typeName, extractEnum, typeT);
    }
    else {
        referenceType = getReferenceType(typeReference.typeName, extractEnum);
    }
    metadataGenerator_1.MetadataGenerator.current.AddReferenceType(referenceType);
    return referenceType;
}
exports.resolveType = resolveType;
function getInitializerValue(initializer, type) {
    if (!initializer) {
        return;
    }
    switch (initializer.kind) {
        case ts.SyntaxKind.ArrayLiteralExpression:
            var arrayLiteral = initializer;
            return arrayLiteral.elements.map(function (element) { return getInitializerValue(element); });
        case ts.SyntaxKind.StringLiteral:
            return initializer.text;
        case ts.SyntaxKind.TrueKeyword:
            return true;
        case ts.SyntaxKind.FalseKeyword:
            return false;
        case ts.SyntaxKind.NumberKeyword:
        case ts.SyntaxKind.FirstLiteralToken:
            return Number(initializer.text);
        case ts.SyntaxKind.NewExpression:
            var newExpression = initializer;
            var ident = newExpression.expression;
            if (ident.text === 'Date') {
                var date = new Date();
                if (newExpression.arguments) {
                    var newArguments = newExpression.arguments.filter(function (args) { return args.kind !== undefined; });
                    var argsValue = newArguments.map(function (args) { return getInitializerValue(args); });
                    if (argsValue.length > 0) {
                        date = new Date(argsValue);
                    }
                }
                var dateString = date.toISOString();
                if (type && type.dataType === 'date') {
                    return dateString.split('T')[0];
                }
                return dateString;
            }
            return;
        case ts.SyntaxKind.ObjectLiteralExpression:
            var objectLiteral = initializer;
            var nestedObject_1 = {};
            objectLiteral.properties.forEach(function (p) {
                nestedObject_1[p.name.text] = getInitializerValue(p.initializer);
            });
            return nestedObject_1;
        default:
            return;
    }
}
exports.getInitializerValue = getInitializerValue;
function getPrimitiveType(typeNode, parentNode) {
    var primitiveType = syntaxKindMap[typeNode.kind];
    if (!primitiveType) {
        return;
    }
    if (primitiveType === 'number') {
        if (!parentNode) {
            return { dataType: 'double' };
        }
        var tags = jsDocUtils_1.getJSDocTagNames(parentNode).filter(function (name) {
            return ['isInt', 'isLong', 'isFloat', 'isDouble'].some(function (m) { return m === name; });
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
    return { dataType: primitiveType };
}
function getDateType(typeNode, parentNode) {
    if (!parentNode) {
        return { dataType: 'datetime' };
    }
    var tags = jsDocUtils_1.getJSDocTagNames(parentNode).filter(function (name) {
        return ['isDate', 'isDateTime'].some(function (m) { return m === name; });
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
function getEnumerateType(typeName, extractEnum) {
    if (extractEnum === void 0) { extractEnum = true; }
    var enumName = typeName.text;
    var enumNodes = metadataGenerator_1.MetadataGenerator.current.nodes
        .filter(function (node) { return node.kind === ts.SyntaxKind.EnumDeclaration; })
        .filter(function (node) { return node.name.text === enumName; });
    if (!enumNodes.length) {
        return;
    }
    if (enumNodes.length > 1) {
        throw new exceptions_1.GenerateMetadataError("Multiple matching enum found for enum " + enumName + "; please make enum names unique.");
    }
    var enumDeclaration = enumNodes[0];
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
    if (extractEnum) {
        var enums = enumDeclaration.members.map(function (member, index) {
            return getEnumValue(member) || String(index);
        });
        return {
            dataType: 'refEnum',
            description: getNodeDescription(enumDeclaration),
            enums: enums,
            refName: enumName,
        };
    }
    else {
        return {
            dataType: 'enum',
            enums: enumDeclaration.members.map(function (member, index) {
                return getEnumValue(member) || String(index);
            }),
        };
    }
}
function getLiteralType(typeName) {
    var literalName = typeName.text;
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
        throw new exceptions_1.GenerateMetadataError("Multiple matching enum found for enum " + literalName + "; please make enum names unique.");
    }
    var unionTypes = literalTypes[0].type.types;
    return {
        dataType: 'enum',
        enums: unionTypes.map(function (unionNode) { return unionNode.literal.text; }),
    };
}
function getReferenceType(type, extractEnum, genericTypes) {
    if (extractEnum === void 0) { extractEnum = true; }
    var typeName = resolveFqTypeName(type);
    var refNameWithGenerics = getTypeName(typeName, genericTypes);
    try {
        var existingType = localReferenceTypeCache[refNameWithGenerics];
        if (existingType) {
            return existingType;
        }
        var referenceEnumType = getEnumerateType(type, true);
        if (referenceEnumType) {
            localReferenceTypeCache[refNameWithGenerics] = referenceEnumType;
            return referenceEnumType;
        }
        if (inProgressTypes[refNameWithGenerics]) {
            return createCircularDependencyResolver(refNameWithGenerics);
        }
        inProgressTypes[refNameWithGenerics] = true;
        var modelType = getModelTypeDeclaration(type);
        var properties = getModelProperties(modelType, genericTypes);
        var additionalProperties = getModelAdditionalProperties(modelType);
        var inheritedProperties = getModelInheritedProperties(modelType);
        var referenceType = {
            additionalProperties: additionalProperties,
            dataType: 'refObject',
            description: getNodeDescription(modelType),
            properties: properties.concat(inheritedProperties),
            refName: refNameWithGenerics,
        };
        localReferenceTypeCache[refNameWithGenerics] = referenceType;
        return referenceType;
    }
    catch (err) {
        // tslint:disable-next-line:no-console
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
        throw new exceptions_1.GenerateMetadataError("Unknown type: " + ts.SyntaxKind[typeNode.kind] + ".");
    }
    var typeReference = typeNode;
    try {
        return typeReference.typeName.text;
    }
    catch (e) {
        // idk what would hit this? probably needs more testing
        // tslint:disable-next-line:no-console
        console.error(e);
        return typeNode.toString();
    }
}
function createCircularDependencyResolver(refName) {
    var referenceType = {
        dataType: 'refObject',
        refName: refName,
    };
    metadataGenerator_1.MetadataGenerator.current.OnFinish(function (referenceTypes) {
        var realReferenceType = referenceTypes[refName];
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
function nodeIsUsable(node) {
    switch (node.kind) {
        case ts.SyntaxKind.InterfaceDeclaration:
        case ts.SyntaxKind.ClassDeclaration:
        case ts.SyntaxKind.TypeAliasDeclaration:
        case ts.SyntaxKind.EnumDeclaration:
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
            throw new exceptions_1.GenerateMetadataError("No matching module declarations found for " + leftmostName + ".");
        }
        if (moduleDeclarations.length > 1) {
            throw new exceptions_1.GenerateMetadataError("Multiple matching module declarations found for " + leftmostName + "; please make module declarations unique.");
        }
        var moduleBlock = moduleDeclarations[0].body;
        if (moduleBlock === null || moduleBlock.kind !== ts.SyntaxKind.ModuleBlock) {
            throw new exceptions_1.GenerateMetadataError("Module declaration found for " + leftmostName + " has no body.");
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
        throw new exceptions_1.GenerateMetadataError("No matching model found for referenced type " + typeName + ".");
    }
    if (modelTypes.length > 1) {
        var conflicts = modelTypes.map(function (modelType) { return modelType.getSourceFile().fileName; }).join('"; "');
        throw new exceptions_1.GenerateMetadataError("Multiple matching models found for referenced type " + typeName + "; please make model names unique. Conflicts found: \"" + conflicts + "\".");
    }
    return modelTypes[0];
}
function getModelProperties(node, genericTypes) {
    // Interface model
    if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
        var interfaceDeclaration = node;
        return interfaceDeclaration.members
            .filter(function (member) { return member.kind === ts.SyntaxKind.PropertySignature; })
            .map(function (member) {
            var propertyDeclaration = member;
            var identifier = propertyDeclaration.name;
            if (!propertyDeclaration.type) {
                throw new exceptions_1.GenerateMetadataError("No valid type found for property declaration.");
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
                type: resolveType(aType),
                validators: validatorUtils_1.getPropertyValidators(propertyDeclaration),
            };
        });
    }
    // Type alias model
    if (node.kind === ts.SyntaxKind.TypeAliasDeclaration) {
        var aliasDeclaration = node;
        var properties_1 = [];
        if (aliasDeclaration.type.kind === ts.SyntaxKind.IntersectionType) {
            var intersectionTypeNode = aliasDeclaration.type;
            intersectionTypeNode.types.forEach(function (type) {
                if (type.kind === ts.SyntaxKind.TypeReference) {
                    var typeReferenceNode = type;
                    var modelType = getModelTypeDeclaration(typeReferenceNode.typeName);
                    var modelProps = getModelProperties(modelType);
                    properties_1.push.apply(properties_1, modelProps);
                }
            });
        }
        if (aliasDeclaration.type.kind === ts.SyntaxKind.TypeReference) {
            var typeReferenceNode = aliasDeclaration.type;
            var modelType = getModelTypeDeclaration(typeReferenceNode.typeName);
            var modelProps = getModelProperties(modelType);
            properties_1.push.apply(properties_1, modelProps);
        }
        return properties_1;
    }
    // Class model
    var classDeclaration = node;
    var properties = classDeclaration.members
        .filter(function (member) { return member.kind === ts.SyntaxKind.PropertyDeclaration; })
        .filter(function (member) { return hasPublicModifier(member); });
    var classConstructor = classDeclaration
        .members
        .find(function (member) { return member.kind === ts.SyntaxKind.Constructor; });
    if (classConstructor && classConstructor.parameters) {
        var constructorProperties = classConstructor.parameters
            .filter(function (parameter) { return hasPublicModifier(parameter); });
        properties.push.apply(properties, constructorProperties);
    }
    return properties
        .map(function (property) {
        var identifier = property.name;
        var typeNode = property.type;
        if (!typeNode) {
            var tsType = metadataGenerator_1.MetadataGenerator.current.typeChecker.getTypeAtLocation(property);
            typeNode = metadataGenerator_1.MetadataGenerator.current.typeChecker.typeToTypeNode(tsType);
        }
        if (!typeNode) {
            throw new exceptions_1.GenerateMetadataError("No valid type found for property declaration.");
        }
        var type = resolveType(typeNode, property);
        return {
            default: getInitializerValue(property.initializer, type),
            description: getNodeDescription(property),
            name: identifier.text,
            required: !property.questionToken && !property.initializer,
            type: type,
            validators: validatorUtils_1.getPropertyValidators(property),
        };
    });
}
function getModelAdditionalProperties(node) {
    if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
        var interfaceDeclaration = node;
        var indexMember = interfaceDeclaration
            .members
            .find(function (member) { return member.kind === ts.SyntaxKind.IndexSignature; });
        if (!indexMember) {
            return undefined;
        }
        var indexSignatureDeclaration = indexMember;
        var indexType = resolveType(indexSignatureDeclaration.parameters[0].type);
        if (indexType.dataType !== 'string') {
            throw new exceptions_1.GenerateMetadataError("Only string indexers are supported.");
        }
        return resolveType(indexSignatureDeclaration.type);
    }
    return undefined;
}
function getModelInheritedProperties(modelTypeDeclaration) {
    var properties = [];
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
            var referenceType = getReferenceType(baseEntityName);
            if (referenceType.properties) {
                referenceType.properties.forEach(function (property) { return properties.push(property); });
            }
        });
    });
    return properties;
}
function hasPublicModifier(node) {
    return !node.modifiers || node.modifiers.every(function (modifier) {
        return modifier.kind !== ts.SyntaxKind.ProtectedKeyword && modifier.kind !== ts.SyntaxKind.PrivateKeyword;
    });
}
function getNodeDescription(node) {
    var symbol = metadataGenerator_1.MetadataGenerator.current.typeChecker.getSymbolAtLocation(node.name);
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
    var comments = symbol.getDocumentationComment();
    if (comments.length) {
        return ts.displayPartsToString(comments);
    }
    return undefined;
}
//# sourceMappingURL=resolveType.js.map