#!/usr/bin/env node
import { MetadataGenerator } from './metadataGeneration/metadataGenerator';
import { SpecGenerator } from './swagger/specGenerator';
import { RouteGenerator } from './routeGeneration/routeGenerator';
import * as yargs from 'yargs';

const entryFileConfig = {
    alias: 'e',
    describe: 'Server entry point; this should be your top level file, e.g. server.ts/app.ts',
    required: true,
    type: 'string'
};

yargs
    .usage('Usage: $0 <command> [options]')
    .demand(1)

    .command('swagger', 'Generate swagger spec', {
        'entry-file': entryFileConfig,
        'swagger-dir': {
            alias: 's',
            describe: 'Swagger directory; generated swagger.json will be dropped here',
            required: true,
            type: 'string'
        },
    }, (args: SwaggerArgs) => {
        const metadata = new MetadataGenerator(args.entryFile).Generate();
        new SpecGenerator(metadata).GenerateJson(args.swaggerDir);
    })

    .command('routes', 'Generate routes', {
        'entry-file': entryFileConfig,
        'routes-dir': {
            alias: 'r',
            describe: 'Routes directory; generated routes.ts (which contains the generated code wiring up routes using middleware of choice) will be dropped here',
            required: true,
            type: 'string'
        }
    }, (args: RoutesArgs) => {
        const metadata = new MetadataGenerator(args.entryFile).Generate();
        new RouteGenerator(metadata, args.routesDir).GenerateExpressRoutes();
    })

    .help('help')
    .alias('help', 'h')
    .argv;

interface SwaggerArgs extends yargs.Argv {
    entryFile: string;
    swaggerDir: string;
}

interface RoutesArgs extends yargs.Argv {
    entryFile: string;
    routesDir: string;
}
