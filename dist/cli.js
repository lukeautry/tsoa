#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var metadataGenerator_1 = require("./metadataGeneration/metadataGenerator");
var specGenerator_1 = require("./swagger/specGenerator");
var routeGenerator_1 = require("./routeGeneration/routeGenerator");
var yargs = require("yargs");
var fs = require("fs");
var path = require("path");
var PrettyError = require("pretty-error");
var workingDir = process.cwd();
var pe = new PrettyError();
var getPackageJsonValue = function (key) {
    try {
        var packageJson = require(workingDir + "/package.json");
        return packageJson[key] || '';
    }
    catch (err) {
        return '';
    }
};
var versionDefault = getPackageJsonValue('version');
var nameDefault = getPackageJsonValue('name');
var descriptionDefault = getPackageJsonValue('description');
var licenseDefault = getPackageJsonValue('license');
var getConfig = function (configPath) {
    if (configPath === void 0) { configPath = 'tsoa.json'; }
    var config;
    try {
        config = require(workingDir + "/" + configPath);
    }
    catch (err) {
        if (err.code === 'MODULE_NOT_FOUND') {
            throw Error("No config file found at '" + configPath + "'");
        }
        else if (err.name === 'SyntaxError') {
            throw Error("Invalid JSON syntax in config at '" + configPath + "': " + err.message);
        }
        else {
            throw Error("Unhandled error encountered loading '" + configPath + "': " + err.message);
        }
    }
    return config;
};
var validateCompilerOptions = function (config) {
    return config || {};
};
var validateSwaggerConfig = function (config) {
    if (!config.outputDirectory) {
        throw new Error('Missing outputDirectory: onfiguration most contain output directory');
    }
    if (!config.entryFile) {
        throw new Error('Missing entryFile: Configuration must contain an entry point file.');
    }
    config.version = config.version || versionDefault;
    config.name = config.name || nameDefault;
    config.description = config.description || descriptionDefault;
    config.license = config.license || licenseDefault;
    config.basePath = config.basePath || '/';
    return config;
};
var validateRoutesConfig = function (config) {
    if (!config.entryFile) {
        throw new Error('Missing entryFile: Configuration must contain an entry point file.');
    }
    if (!config.routesDir) {
        throw new Error('Missing routesDir: Configuration must contain a routes file output directory.');
    }
    if (config.authenticationModule && !(fs.existsSync(config.authenticationModule) || fs.existsSync(config.authenticationModule + '.ts'))) {
        throw new Error("No authenticationModule file found at '" + config.authenticationModule + "'");
    }
    if (config.iocModule && !(fs.existsSync(config.iocModule) || fs.existsSync(config.iocModule + '.ts'))) {
        throw new Error("No iocModule file found at '" + config.iocModule + "'");
    }
    config.basePath = config.basePath || '/';
    config.middleware = config.middleware || 'express';
    return config;
};
var configurationArgs = {
    alias: 'c',
    describe: 'tsoa configuration file; default is tsoa.json in the working directory',
    required: false,
    type: 'string'
};
var hostArgs = {
    describe: 'API host',
    required: false,
    type: 'string'
};
var basePathArgs = {
    describe: 'Base API path',
    required: false,
    type: 'string'
};
yargs
    .usage('Usage: $0 <command> [options]')
    .demand(1)
    .command('swagger', 'Generate swagger spec', {
    basePath: basePathArgs,
    configuration: configurationArgs,
    host: hostArgs
}, function (args) {
    try {
        var config = getConfig(args.configuration);
        if (args.basePath) {
            config.swagger.basePath = args.basePath;
        }
        if (args.host) {
            config.swagger.host = args.host;
        }
        var compilerOptions = validateCompilerOptions(config.compilerOptions);
        var swaggerConfig = validateSwaggerConfig(config.swagger);
        var metadata = new metadataGenerator_1.MetadataGenerator(swaggerConfig.entryFile, compilerOptions).Generate();
        new specGenerator_1.SpecGenerator(metadata, config.swagger).GenerateJson(swaggerConfig.outputDirectory);
        // tslint:disable-next-line:no-console
        console.info('Generate swagger successful.');
    }
    catch (err) {
        console.error('Generate swagger error.\n', pe.render(err));
    }
})
    .command('routes', 'Generate routes', {
    basePath: basePathArgs,
    configuration: configurationArgs
}, function (args) {
    try {
        var config = getConfig(args.configuration);
        if (args.basePath) {
            config.routes.basePath = args.basePath;
        }
        var compilerOptions = validateCompilerOptions(config.compilerOptions);
        var routesConfig = validateRoutesConfig(config.routes);
        var metadata = new metadataGenerator_1.MetadataGenerator(routesConfig.entryFile, compilerOptions).Generate();
        var routeGenerator = new routeGenerator_1.RouteGenerator(metadata, routesConfig);
        var pathTransformer = void 0;
        var template = void 0;
        pathTransformer = function (path) { return path.replace(/{/g, ':').replace(/}/g, ''); };
        switch (routesConfig.middleware) {
            case 'express':
                template = path.join(__dirname, 'routeGeneration/templates/express.ts');
                break;
            case 'hapi':
                template = path.join(__dirname, 'routeGeneration/templates/hapi.ts');
                pathTransformer = function (path) { return path; };
                break;
            case 'koa':
                template = path.join(__dirname, 'routeGeneration/templates/koa.ts');
                break;
            default:
                template = path.join(__dirname, 'routeGeneration/templates/express.ts');
        }
        if (routesConfig.middlewareTemplate) {
            template = routesConfig.middlewareTemplate;
        }
        routeGenerator.GenerateCustomRoutes(template, pathTransformer);
        // tslint:disable-next-line:no-console
        console.info('Generate routes successful.');
    }
    catch (err) {
        console.error('Generate routes error.\n', pe.render(err));
    }
})
    .help('help')
    .alias('help', 'h')
    .argv;
//# sourceMappingURL=cli.js.map