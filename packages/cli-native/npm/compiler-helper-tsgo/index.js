'use strict';
// The path of this platform's helper binary. Throws when the platform package is not installed.
const path = require('node:path');

const platformPackage = `@tsoa/compiler-helper-tsgo-${process.platform}-${process.arch}`;
const directory = path.dirname(require.resolve(`${platformPackage}/package.json`));
module.exports = path.join(directory, 'bin', process.platform === 'win32' ? 'helper.exe' : 'helper');
