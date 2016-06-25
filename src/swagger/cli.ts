#!/usr/bin/env node

import {SwaggerGenerator} from './generator';
import * as yargs from 'yargs';

(function runGenerator() {
    const argv: GeneratorArguments = yargs.argv;

    interface GeneratorArguments {
        outFile: string;
        mainFile: string;
    }

    const outFile = argv.outFile;
    if (!outFile) {
        process.stdout.write('Must provide -outFile argument, e.g. ./dist/swagger.json');
        return;
    }

    const mainFile = argv.mainFile;
    if (!mainFile) {
        process.stdout.write('Must provide -mainFile argument, e.g. ./src/server.ts');
        return;
    }

    SwaggerGenerator.Generate(outFile, mainFile);
})();


