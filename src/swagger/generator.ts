#!/usr/bin/env node

import {PathsBuilder} from './pathsBuilder';
import {SpecBuilder} from './specBuilder';
import * as fs from 'fs';
import * as yargs from 'yargs';

export namespace SwaggerGenerator {
    export function Generate(outFile: string, entryFile: string) {
        const builder = new SpecBuilder();

        const pathsBuilder = new PathsBuilder(builder, entryFile);
        pathsBuilder.generate();

        const spec = builder.generate();
        fs.writeFile(outFile, JSON.stringify(spec, null, '\t'), err => {
            if (err) {
                throw new Error(err.toString());
            };
        });
    }
}
