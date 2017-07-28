"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
var decoratorUtils_1 = require("./../utils/decoratorUtils");
var validatorUtils_1 = require("./../utils/validatorUtils");
var exceptions_1 = require("./exceptions");
var metadataGenerator_1 = require("./metadataGenerator");
var resolveType_1 = require("./resolveType");
var ParameterGenerator = (function () {
    function ParameterGenerator(parameter, method, path) {
        this.parameter = parameter;
        this.method = method;
        this.path = path;
    }
    ParameterGenerator.prototype.Generate = function () {
        var _this = this;
        var decoratorName = decoratorUtils_1.getDecoratorName(this.parameter, function (identifier) { return _this.supportParameterDecorator(identifier.text); });
        switch (decoratorName) {
            case 'Request':
                return this.getRequestParameter(this.parameter);
            case 'Body':
                return this.getBodyParameter(this.parameter);
            case 'BodyProp':
                return this.getBodyPropParameter(this.parameter);
            case 'Header':
                return this.getHeaderParameter(this.parameter);
            case 'Query':
                return this.getQueryParameter(this.parameter);
            case 'Path':
                return this.getPathParameter(this.parameter);
            default:
                return this.getPathParameter(this.parameter);
        }
    };
    ParameterGenerator.prototype.getCurrentLocation = function () {
        var methodId = this.parameter.parent.name;
        var controllerId = this.parameter.parent.parent.name;
        return controllerId.text + "." + methodId.text;
    };
    ParameterGenerator.prototype.getRequestParameter = function (parameter) {
        var parameterName = parameter.name.text;
        return {
            description: this.getParameterDescription(parameter),
            in: 'request',
            name: parameterName,
            parameterName: parameterName,
            required: !parameter.questionToken,
            type: { dataType: 'object' },
            validators: validatorUtils_1.getParameterValidators(this.parameter, parameterName),
        };
    };
    ParameterGenerator.prototype.getBodyPropParameter = function (parameter) {
        var parameterName = parameter.name.text;
        var type = this.getValidatedType(parameter);
        if (!this.supportBodyMethod(this.method)) {
            throw new exceptions_1.GenerateMetadataError("@BodyProp('" + parameterName + "') Can't support in " + this.method.toUpperCase() + " method.");
        }
        return {
            description: this.getParameterDescription(parameter),
            in: 'body-prop',
            name: decoratorUtils_1.getDecoratorTextValue(this.parameter, function (ident) { return ident.text === 'BodyProp'; }) || parameterName,
            parameterName: parameterName,
            required: !parameter.questionToken,
            type: type,
            validators: validatorUtils_1.getParameterValidators(this.parameter, parameterName),
        };
    };
    ParameterGenerator.prototype.getBodyParameter = function (parameter) {
        var parameterName = parameter.name.text;
        var type = this.getValidatedType(parameter);
        if (!this.supportBodyMethod(this.method)) {
            throw new exceptions_1.GenerateMetadataError("@Body('" + parameterName + "') Can't support in " + this.method.toUpperCase() + " method.");
        }
        return {
            description: this.getParameterDescription(parameter),
            in: 'body',
            name: parameterName,
            parameterName: parameterName,
            required: !parameter.questionToken,
            type: type,
            validators: validatorUtils_1.getParameterValidators(this.parameter, parameterName),
        };
    };
    ParameterGenerator.prototype.getHeaderParameter = function (parameter) {
        var parameterName = parameter.name.text;
        var type = this.getValidatedType(parameter, false);
        if (!this.supportPathDataType(type)) {
            throw new exceptions_1.GenerateMetadataError("@Header('" + parameterName + "') Can't support '" + type.dataType + "' type.");
        }
        return {
            description: this.getParameterDescription(parameter),
            in: 'header',
            name: decoratorUtils_1.getDecoratorTextValue(this.parameter, function (ident) { return ident.text === 'Header'; }) || parameterName,
            parameterName: parameterName,
            required: !parameter.questionToken,
            type: type,
            validators: validatorUtils_1.getParameterValidators(this.parameter, parameterName),
        };
    };
    ParameterGenerator.prototype.getQueryParameter = function (parameter) {
        var parameterName = parameter.name.text;
        var type = this.getValidatedType(parameter, false);
        if (type.dataType === 'array') {
            var arrayType = type;
            if (!this.supportPathDataType(arrayType.elementType)) {
                throw new exceptions_1.GenerateMetadataError("@Query('" + parameterName + "') Can't support array '" + arrayType.elementType.dataType + "' type.");
            }
        }
        else {
            if (!this.supportPathDataType(type)) {
                throw new exceptions_1.GenerateMetadataError("@Query('" + parameterName + "') Can't support '" + type.dataType + "' type.");
            }
        }
        return {
            description: this.getParameterDescription(parameter),
            in: 'query',
            name: decoratorUtils_1.getDecoratorTextValue(this.parameter, function (ident) { return ident.text === 'Query'; }) || parameterName,
            parameterName: parameterName,
            required: !parameter.questionToken,
            type: type,
            validators: validatorUtils_1.getParameterValidators(this.parameter, parameterName),
        };
    };
    ParameterGenerator.prototype.getPathParameter = function (parameter) {
        var parameterName = parameter.name.text;
        var type = this.getValidatedType(parameter, false);
        var pathName = decoratorUtils_1.getDecoratorTextValue(this.parameter, function (ident) { return ident.text === 'Path'; }) || parameterName;
        if (!this.supportPathDataType(type)) {
            throw new exceptions_1.GenerateMetadataError("@Path('" + parameterName + "') Can't support '" + type.dataType + "' type.");
        }
        if (!this.path.includes("{" + pathName + "}")) {
            throw new exceptions_1.GenerateMetadataError("@Path('" + parameterName + "') Can't match in URL: '" + this.path + "'.");
        }
        return {
            description: this.getParameterDescription(parameter),
            in: 'path',
            name: pathName,
            parameterName: parameterName,
            required: true,
            type: type,
            validators: validatorUtils_1.getParameterValidators(this.parameter, parameterName),
        };
    };
    ParameterGenerator.prototype.getParameterDescription = function (node) {
        var symbol = metadataGenerator_1.MetadataGenerator.current.typeChecker.getSymbolAtLocation(node.name);
        if (!symbol) {
            return undefined;
        }
        var comments = symbol.getDocumentationComment();
        if (comments.length) {
            return ts.displayPartsToString(comments);
        }
        return undefined;
    };
    ParameterGenerator.prototype.supportBodyMethod = function (method) {
        return ['post', 'put', 'patch'].some(function (m) { return m === method.toLowerCase(); });
    };
    ParameterGenerator.prototype.supportParameterDecorator = function (decoratorName) {
        return ['header', 'query', 'parem', 'body', 'bodyprop', 'request'].some(function (d) { return d === decoratorName.toLocaleLowerCase(); });
    };
    ParameterGenerator.prototype.supportPathDataType = function (parameterType) {
        return ['string', 'integer', 'long', 'float', 'double', 'date', 'datetime', 'buffer', 'boolean', 'enum', 'any'].find(function (t) { return t === parameterType.dataType; });
    };
    ParameterGenerator.prototype.getValidatedType = function (parameter, extractEnum) {
        if (extractEnum === void 0) { extractEnum = true; }
        if (!parameter.type) {
            throw new exceptions_1.GenerateMetadataError("Parameter " + parameter.name + " doesn't have a valid type assigned in '" + this.getCurrentLocation() + "'.");
        }
        return resolveType_1.ResolveType(parameter.type, extractEnum);
    };
    return ParameterGenerator;
}());
exports.ParameterGenerator = ParameterGenerator;
//# sourceMappingURL=parameterGenerator.js.map