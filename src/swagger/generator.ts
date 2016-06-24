/// <reference path="../../typings/index.d.ts" />
/// <reference path="./swagger.d.ts" />

import * as fs from 'fs';
import {getDefinitions} from './definitions';
import {getPaths} from './paths';
import {SpecBuilder} from './specBuilder';

(async function generateMetadata() {
    const builder = new SpecBuilder();
    await getDefinitions(builder);
    await getPaths(builder);

    const spec = builder.generate();
    fs.writeFile('./dist/swagger.json', JSON.stringify(spec, null, '\t'), err => {
        if (err) {
            throw new Error(err.toString());
        };
    });
})();

