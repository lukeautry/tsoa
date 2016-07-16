#!/usr/bin/env node
import {MetadataGenerator} from './metadataGeneration/metadataGenerator';
import {SpecGenerator} from './swagger/specGenerator';
import {RouteGenerator} from './routeGeneration/routeGenerator';
import * as yargs from 'yargs';

(function runGenerator() {
    const argv: GeneratorArguments = yargs.argv;

    const swaggerDir = argv.swaggerDir;
    if (!swaggerDir) { throw new Error('Must provide --swaggerDir argument, e.g. --swaggerDir=./dist'); }

    const entryFile = argv.entryFile;
    if (!entryFile) { throw new Error('Must provide --entryFile argument, e.g. --entryFile=./src/server.ts'); }

    const routesDir = argv.routesDir;
    if (!routesDir) { throw new Error('Must provide --routesDir argument, e.g. --routesDir=./dist'); }

    const metadata = new MetadataGenerator(entryFile).Generate();
    new SpecGenerator(metadata).GenerateJson(swaggerDir);
    new RouteGenerator(metadata, routesDir).GenerateExpressRoutes();
})();

interface GeneratorArguments {
    swaggerDir: string;
    routesDir: string;
    entryFile: string;
}


