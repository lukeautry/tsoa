#!/usr/bin/env node

// workaround for multiuser enviorment
var cacheDirectory = process.env.TMP;
if (process.platform != 'win32') {
    // we only have to take care in non windows enviorments
    if (process.env.HOME != '') {
        cacheDirectory = process.env.HOME + '/.ts-node-cache';
    }
}

require('ts-node').register({
    ignore: [], // needed in order to run from /usr/local...
    cacheDirectory: cacheDirectory,
    cache: true,
    project: __dirname
});

require('./src/cli.ts');