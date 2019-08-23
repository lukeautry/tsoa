const fs = require('fs');

function ensureYarn() {
  if (process.env.npm_execpath.indexOf('yarn') === -1 || npmStyleLockFileExists()) {
    console.log(
      red(
        'This project uses yarn for package management.\n' +
        'Do not use npm since you will get strange results.'),
      '\n'
    );
    process.exit(1);
  }
}

function npmStyleLockFileExists(){
  return fs.existsSync('package-lock.json')
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