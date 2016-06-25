import {PathsBuilder} from './pathsBuilder';
import {SpecBuilder} from './specBuilder';
import {Swagger} from './swagger';
import * as fs from 'fs';

export namespace SwaggerGenerator {
    export function Generate(outFile: string, entryFile: string) {
        const spec = GetSpec(entryFile);

        fs.writeFile(outFile, JSON.stringify(spec, null, '\t'), err => {
            if (err) {
                throw new Error(err.toString());
            };
        });
    }

    export function GetSpec(entryFile: string): Swagger.Spec {
        const builder = new SpecBuilder();

        const pathsBuilder = new PathsBuilder(builder, entryFile);
        pathsBuilder.generate();

        return builder.generate() as any;
    }
}
