/// <reference path="../../typings/index.d.ts" />
/// <reference path="./swagger.d.ts" />

import * as fs from 'fs';
import {PathsBuilder} from './pathsBuilder';
import {SpecBuilder} from './specBuilder';

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
