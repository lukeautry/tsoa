#!/usr/bin/env node
// A pass-through compiler helper: forwards stdio to $CONFORMANCE_HELPER and appends every `open` request tsoa sends
// to $CONFORMANCE_OPENS (JSON lines). Point TSOA_COMPILER_HELPER here to record the programs a run opens.
const { spawn } = require('node:child_process');
const fs = require('node:fs');

const helper = spawn(process.env.CONFORMANCE_HELPER, process.argv.slice(2), { stdio: ['pipe', 'inherit', 'inherit'] });
let pending = Buffer.alloc(0);
process.stdin.on('data', chunk => {
  helper.stdin.write(chunk);
  pending = Buffer.concat([pending, chunk]);
  while (pending.length >= 4 && pending.length >= 4 + pending.readUInt32LE(0)) {
    const length = pending.readUInt32LE(0);
    const query = JSON.parse(pending.toString('utf8', 4, 4 + length));
    if (query.op === 'open') fs.appendFileSync(process.env.CONFORMANCE_OPENS, JSON.stringify(query) + '\n');
    pending = pending.subarray(4 + length);
  }
});
process.stdin.on('end', () => helper.stdin.end());
helper.on('exit', code => process.exit(code ?? 1));
