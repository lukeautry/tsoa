"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var handlebars = require("handlebars");
var path = require("path");
var tsfmt = require("typescript-formatter");
var handlebarsHelpers = require("handlebars-helpers");
var RouteGenerator = (function () {
    function RouteGenerator(metadata, options) {
        this.metadata = metadata;
        this.options = options;
    }
    RouteGenerator.prototype.GenerateRoutes = function (middlewareTemplate, pathTransformer) {
        var fileName = this.options.routesDir + "/routes.ts";
        var content = this.buildContent(middlewareTemplate, pathTransformer);
        return new Promise(function (resolve, reject) {
            tsfmt.processString(fileName, content, {
                editorconfig: true,
                replace: true,
                tsconfig: true,
                tsfmt: true,
                tslint: true,
                verify: true,
                vscode: true
            })
                .then(function (result) {
                fs.writeFile(fileName, result.dest, function (err) {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            });
        });
    };
    RouteGenerator.prototype.GenerateCustomRoutes = function (template, pathTransformer) {
        var _this = this;
        var file;
        fs.readFile(path.join(template), function (err, data) {
            if (err) {
                throw err;
            }
            file = data.toString();
            return _this.GenerateRoutes(file, pathTransformer);
        });
    };
    RouteGenerator.prototype.buildContent = function (middlewareTemplate, pathTransformer) {
        var _this = this;
        handlebars.registerHelper('json', function (context) {
            return JSON.stringify(context);
        });
        handlebarsHelpers.comparison({
            handlebars: handlebars
        });
        var routesTemplate = handlebars.compile(middlewareTemplate, { noEscape: true });
        var authenticationModule = this.options.authenticationModule ? this.getRelativeImportPath(this.options.authenticationModule) : undefined;
        var iocModule = this.options.iocModule ? this.getRelativeImportPath(this.options.iocModule) : undefined;
        // If we're working locally then tsoa won't exist as an importable module.
        // So, when in testing mode we reference the module by path instead.
        var env = process.env.NODE_ENV;
        var canImportByAlias = true;
        if (env === 'test') {
            canImportByAlias = false;
        }
        return routesTemplate({
            authenticationModule: authenticationModule,
            basePath: this.options.basePath === '/' ? '' : this.options.basePath,
            canImportByAlias: canImportByAlias,
            controllers: this.metadata.Controllers.map(function (controller) {
                return {
                    actions: controller.methods.map(function (method) {
                        var parameterObjs = {};
                        method.parameters.forEach(function (parameter) {
                            parameterObjs[parameter.parameterName] = _this.getParameterSchema(parameter);
                        });
                        return {
                            method: method.method.toLowerCase(),
                            name: method.name,
                            parameters: parameterObjs,
                            path: pathTransformer(method.path),
                            security: method.security
                        };
                    }),
                    modulePath: _this.getRelativeImportPath(controller.location),
                    name: controller.name,
                    path: controller.path
                };
            }),
            environment: process.env,
            iocModule: iocModule,
            models: this.getModels(),
            useSecurity: this.metadata.Controllers.some(function (controller) { return controller.methods.some(function (methods) { return methods.security !== undefined; }); })
        });
    };
    RouteGenerator.prototype.getModels = function () {
        var _this = this;
        return Object.keys(this.metadata.ReferenceTypes).map(function (key) {
            var referenceType = _this.metadata.ReferenceTypes[key];
            var properties = {};
            referenceType.properties.map(function (property) {
                properties[property.name] = _this.getPropertySchema(property);
            });
            var templateModel = {
                name: key,
                properties: properties
            };
            if (referenceType.additionalProperties) {
                templateModel.additionalProperties = _this.getTemplateAdditionalProperty(referenceType.additionalProperties);
            }
            return templateModel;
        });
    };
    RouteGenerator.prototype.getRelativeImportPath = function (fileLocation) {
        fileLocation = fileLocation.replace('.ts', '');
        return "./" + path.relative(this.options.routesDir, fileLocation).replace(/\\/g, '/');
    };
    RouteGenerator.prototype.getPropertySchema = function (source) {
        var propertySchema = {
            required: source.required,
            typeName: source.type.typeName
        };
        if (Object.keys(source.validators).length > 0) {
            propertySchema.validators = source.validators;
        }
        var arrayType = source.type;
        if (arrayType.elementType) {
            var arraySchema = {
                typeName: arrayType.elementType.typeName
            };
            var arrayEnumType = arrayType.elementType;
            if (arrayEnumType.enumMembers) {
                arraySchema.enumMembers = arrayEnumType.enumMembers;
            }
            propertySchema.array = arraySchema;
        }
        var enumType = source.type;
        if (enumType.enumMembers) {
            propertySchema.enumMembers = enumType.enumMembers;
        }
        return propertySchema;
    };
    RouteGenerator.prototype.getTemplateAdditionalProperty = function (type) {
        var templateAdditionalProperty = {
            typeName: type.typeName
        };
        var arrayType = type;
        if (arrayType.elementType) {
            var arraySchema = {
                typeName: arrayType.elementType.typeName
            };
            var arrayEnumType = arrayType.elementType;
            if (arrayEnumType.enumMembers) {
                arraySchema.enumMembers = arrayEnumType.enumMembers;
            }
            templateAdditionalProperty.array = arraySchema;
        }
        var enumType = type;
        if (enumType.enumMembers) {
            templateAdditionalProperty.enumMembers = enumType.enumMembers;
        }
        return templateAdditionalProperty;
    };
    RouteGenerator.prototype.getParameterSchema = function (source) {
        var parameterSchema = {
            in: source.in,
            name: source.name,
            required: source.required ? true : undefined,
            typeName: source.type.typeName
        };
        if (Object.keys(source.validators).length > 0) {
            parameterSchema.validators = source.validators;
        }
        var arrayType = source.type;
        if (arrayType.elementType) {
            var tempArrayType = {
                typeName: arrayType.elementType.typeName
            };
            var arrayEnumType = arrayType.elementType;
            if (arrayEnumType.enumMembers) {
                tempArrayType.enumMembers = arrayEnumType.enumMembers;
            }
            parameterSchema.array = tempArrayType;
        }
        var enumType = source.type;
        if (enumType.enumMembers) {
            parameterSchema.enumMembers = enumType.enumMembers;
        }
        return parameterSchema;
    };
    return RouteGenerator;
}());
exports.RouteGenerator = RouteGenerator;
//# sourceMappingURL=routeGenerator.js.map