#!/usr/bin/env node
// A compiler helper that forwards to the real one in $PROXY_HELPER and breaks one answer, chosen by $PROXY_MODE:
//   protocol7     `open` reports protocol 7
//   noprotocol    `open` reports no protocol
//   prefetchfail  every `prefetchFile` fails
// It appends its own pid and the real helper's pid to $PROXY_PIDS, one per line.
const { spawn } = require('node:child_process');
const fs = require('node:fs');

const helper = spawn(process.env.PROXY_HELPER, [], { stdio: ['pipe', 'pipe', 'inherit'] });
fs.appendFileSync(process.env.PROXY_PIDS, `${process.pid}\n${helper.pid}\n`);
const mode = process.env.PROXY_MODE;

const onFrames = (stream, handle) => {
  let pending = Buffer.alloc(0);
  stream.on('data', chunk => {
    pending = Buffer.concat([pending, chunk]);
    while (pending.length >= 4 && pending.length >= 4 + pending.readUInt32LE(0)) {
      const length = pending.readUInt32LE(0);
      handle(JSON.parse(pending.toString('utf8', 4, 4 + length)));
      pending = pending.subarray(4 + length);
    }
  });
};
const send = (stream, message) => {
  const body = Buffer.from(JSON.stringify(message));
  const header = Buffer.alloc(4);
  header.writeUInt32LE(body.length);
  stream.write(Buffer.concat([header, body]));
};

const ops = [];
onFrames(process.stdin, query => {
  if (mode === 'prefetchfail' && query.op === 'prefetchFile') return send(process.stdout, { ok: false, error: 'proxy refused prefetchFile' });
  ops.push(query.op);
  send(helper.stdin, query);
});
onFrames(helper.stdout, response => {
  if (ops.shift() === 'open' && response.ok) {
    if (mode === 'protocol7') response.result.protocol = 7;
    if (mode === 'noprotocol') delete response.result.protocol;
  }
  send(process.stdout, response);
});
process.stdin.on('end', () => helper.stdin.end());
process.on('SIGTERM', () => {
  helper.kill();
  process.exit(0);
});
helper.on('exit', () => process.exit(0));
