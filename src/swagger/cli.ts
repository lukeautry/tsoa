#!/usr/bin/env node

import {SwaggerGenerator} from './generator';
import * as yargs from 'yargs';

(function runGenerator() {
    const argv: GeneratorArguments = yargs.argv;

    const outFile = argv.outFile;
    if (!outFile) { throw new Error('Must provide --outFile argument, e.g. --outFile=./dist/swagger.json'); }

    const mainFile = argv.mainFile;
    if (!mainFile) { throw new Error('Must provide --mainFile argument, e.g. --mainFile=./src/server.ts'); }

    SwaggerGenerator.GenerateJson(outFile, mainFile);
})();

interface GeneratorArguments {
    outFile: string;
    mainFile: string;
}

