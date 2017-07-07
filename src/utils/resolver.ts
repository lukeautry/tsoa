import * as _ from 'lodash';
import * as fs from 'fs';
import * as path from 'path';

const win32 = process.platform === 'win32';

export function requireTsoaPlugin(module: string) {
    const paths = getNpmPaths();
    for (const npmPath of paths) {
        const modulePath = path.join(npmPath, 'tsoa-' + module);
        if (fs.existsSync(modulePath)) {
            return require(modulePath);
        }
    }
}

// shameless copy from https://github.com/yeoman/environment/blob/master/lib/resolver.js
function getNpmPaths() {
    let paths: string[] = [];

    // Add NVM prefix directory
    if (process.env.NVM_PATH) {
        paths.push(path.join(path.dirname(process.env.NVM_PATH), 'node_modules'));
    }

    // Adding global npm directories
    // We tried using npm to get the global modules path, but it haven't work out
    // because of bugs in the parseable implementation of `ls` command and mostly
    // performance issues. So, we go with our best bet for now.
    if (process.env.NODE_PATH) {
        paths = _.compact(process.env.NODE_PATH.split(path.delimiter)).concat(paths);
    }

    // global node_modules should be 4 or 2 directory up this one (most of the time)
    paths.push(path.join(__dirname, '../../../..'));
    paths.push(path.join(__dirname, '../..'));

    // Adds support for generator resolving when yeoman-generator has been linked
    if (process.argv[1]) {
        paths.push(path.join(path.dirname(process.argv[1]), '../..'));
    }

    // Default paths for each system
    if (win32) {
        paths.push(path.join(process.env.APPDATA, 'npm/node_modules'));
    } else {
        paths.push('/usr/lib/node_modules');
        paths.push('/usr/local/lib/node_modules');
    }

    // Walk up the CWD and add `node_modules/` folder lookup on each level
    process.cwd().split(path.sep).forEach((part, i, parts) => {
        let lookup = path.join.apply(path, parts.slice(0, i + 1).concat(['node_modules']));

        if (!win32) {
            lookup = `/${lookup}`;
        }

        paths.push(lookup);
    });

    return paths.reverse();
}
