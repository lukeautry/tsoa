"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var handlebars = require("handlebars");
var handlebarsHelpers = require("handlebars-helpers");
var path = require("path");
var tsfmt = require("typescript-formatter");
var RouteGenerator = (function () {
    function RouteGenerator(metadata, options) {
        this.metadata = metadata;
        this.options = options;
        this.tsfmtConfig = {
            editorconfig: true,
            replace: true,
            tsconfig: true,
            tsfmt: true,
            tslint: false,
            verify: true,
            vscode: true,
        };
    }
    RouteGenerator.prototype.GenerateRoutes = function (middlewareTemplate, pathTransformer) {
        var _this = this;
        var fileName = this.options.routesDir + "/routes.ts";
        var content = this.buildContent(middlewareTemplate, pathTransformer);
        return new Promise(function (resolve, reject) {
            tsfmt
                .processString(fileName, content, _this.tsfmtConfig)
                .then(function (result) {
                fs.writeFile(fileName, result.dest, function (err) {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            })
                .catch(reject);
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
            handlebars: handlebars,
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
            controllers: this.metadata.controllers.map(function (controller) {
                return {
                    actions: controller.methods.map(function (method) {
                        var parameterObjs = {};
                        method.parameters.forEach(function (parameter) {
                            parameterObjs[parameter.parameterName] = _this.buildParameterSchema(parameter);
                        });
                        return {
                            method: method.method.toLowerCase(),
                            name: method.name,
                            parameters: parameterObjs,
                            path: pathTransformer(method.path),
                            security: method.security,
                        };
                    }),
                    modulePath: _this.getRelativeImportPath(controller.location),
                    name: controller.name,
                    path: controller.path,
                };
            }),
            environment: process.env,
            iocModule: iocModule,
            models: this.buildModels(),
            useSecurity: this.metadata.controllers.some(function (controller) { return controller.methods.some(function (method) { return !!method.security.length; }); }),
        });
    };
    RouteGenerator.prototype.buildModels = function () {
        var _this = this;
        var models = {};
        Object.keys(this.metadata.referenceTypeMap).forEach(function (name) {
            var referenceType = _this.metadata.referenceTypeMap[name];
            var properties = {};
            if (referenceType.properties) {
                referenceType.properties.map(function (property) {
                    properties[property.name] = _this.buildPropertySchema(property);
                });
            }
            var modelSchema = {
                enums: referenceType.enums,
                properties: Object.keys(properties).length === 0 ? undefined : properties,
            };
            if (referenceType.additionalProperties) {
                modelSchema.additionalProperties = _this.buildProperty(referenceType.additionalProperties);
            }
            models[name] = modelSchema;
        });
        return models;
    };
    RouteGenerator.prototype.getRelativeImportPath = function (fileLocation) {
        fileLocation = fileLocation.replace('.ts', '');
        return "./" + path.relative(this.options.routesDir, fileLocation).replace(/\\/g, '/');
    };
    RouteGenerator.prototype.buildPropertySchema = function (source) {
        var propertySchema = this.buildProperty(source.type);
        propertySchema.default = source.default;
        propertySchema.required = source.required ? true : undefined;
        if (Object.keys(source.validators).length > 0) {
            propertySchema.validators = source.validators;
        }
        return propertySchema;
    };
    RouteGenerator.prototype.buildParameterSchema = function (source) {
        var property = this.buildProperty(source.type);
        var parameter = {
            default: source.default,
            in: source.in,
            name: source.name,
            required: source.required ? true : undefined,
        };
        var parameterSchema = Object.assign(parameter, property);
        if (Object.keys(source.validators).length > 0) {
            parameterSchema.validators = source.validators;
        }
        return parameterSchema;
    };
    RouteGenerator.prototype.buildProperty = function (type) {
        var schema = {
            dataType: type.dataType,
        };
        var referenceType = type;
        if (referenceType.refName) {
            schema.dataType = undefined;
            schema.ref = referenceType.refName;
        }
        if (type.dataType === 'array') {
            var arrayType = type;
            var arrayRefType = arrayType.elementType;
            if (arrayRefType.refName) {
                schema.array = {
                    ref: arrayRefType.refName,
                };
            }
            else {
                schema.array = {
                    dataType: arrayType.elementType.dataType,
                    enums: arrayType.elementType.enums,
                };
            }
        }
        if (type.dataType === 'enum') {
            schema.enums = type.enums;
        }
        return schema;
    };
    return RouteGenerator;
}());
exports.RouteGenerator = RouteGenerator;
//# sourceMappingURL=routeGenerator.js.map