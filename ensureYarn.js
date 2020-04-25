const fs = require('fs');

function ensureYarn() {
  if (npmStyleLockFileExists()) {
    console.log(red('This project uses yarn for package management.\n' + 'Do not use npm since you will get strange results.'), '\n');
    process.exit(1);
  }

  if (!yarnStyleLockFileExists()) {
    console.log(red('Could not find yarn.lock which we need to ensure proper versions of dependencies.\n' + 'Please run yarn install.'), '\n');
    process.exit(1);
  }
}

function npmStyleLockFileExists() {
  return fs.existsSync('package-lock.json');
}

function yarnStyleLockFileExists() {
  return fs.existsSync('yarn.lock');
}

// Color formatting libraries may not be available when this script is run.
function red(text) {
  return '\x1b[31m' + text + '\x1b[0m';
}
function cyan(text) {
  return '\x1b[36m' + text + '\x1b[0m';
}
function green(text) {
  return '\x1b[32m' + text + '\x1b[0m';
}
function yellow(text) {
  return '\x1b[33m' + text + '\x1b[0m';
}

ensureYarn();
