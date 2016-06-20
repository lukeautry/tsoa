/// <reference path="../../typings/index.d.ts" />
/// <reference path="./swagger.d.ts" />

import * as fs from 'fs';
import {getDefinitions} from './definitions';
import {getPaths} from './paths';

(async function generateMetadata() {
    const definitions = await getDefinitions();
    const paths = await getPaths();

    const spec = buildSpec(definitions, paths);
    fs.writeFile('./dist/swagger.json', JSON.stringify(spec, null, '\t'), err => {
        if (err) {
            throw new Error(err.toString());
        };
    });
})();

function buildSpec(definitions: { [definitionsName: string]: Swagger.Schema }, paths: { [pathName: string]: Swagger.Path }) {
    return {
        basePath: '',
        consumes: [
            'application/json'
        ],
        definitions: definitions,
        host: 'localhost:3000',
        info: {
            license: 'MIT',
            title: 'Lucid Web API',
            version: '0.0.1'
        },
        produces: [
            'application/json'
        ],
        swagger: '2.0'
    };
}

