#!/usr/bin/env node
// Usage: conformance.cjs <helper A> <helper B> [opens.jsonl]
//
// Opens each program in both helpers, prefetches every own file, then asks `type`, `members`, `print` and
// `typeToString` of every type id and `symbol` of every symbol id either answer reaches, and compares the answers.
// Ids are session-local: the first time an id of A meets an id of B at the same place in two answers, they are paired,
// and every later meeting must agree with that pairing. Exits 1 on any disagreement.
//
// One known difference is allowed and counted (PROTOCOL.md, "Known differences"): tsrs shares the element type
// parameters of tuple targets, so a tuple target's own typeArguments and the types in its `members` answer (element
// properties, Array methods, index type) may pair many-to-one. Property symbols stay strict, and so does everything
// reached from tuple references.
//
// Without opens.jsonl, the programs are the ones `tests/prepare.ts` opens, recorded by running it with
// record-opens.cjs in front of helper A (needs `yarn build`). With it, each line is an `open` request.
const { spawn, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const [helperA, helperB, opensFile] = process.argv.slice(2);
if (!helperA || !helperB) {
  console.error('usage: conformance.cjs <helper A> <helper B> [opens.jsonl]');
  process.exit(2);
}

function recordPrepareOpens() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tsoa-conformance-')), 'opens.jsonl');
  execFileSync('yarn', ['-s', 'prepare-test'], {
    cwd: path.join(__dirname, '../../../tests'),
    stdio: ['ignore', 'ignore', 'inherit'],
    env: { ...process.env, TSOA_COMPILER_HELPER: path.join(__dirname, 'record-opens.cjs'), CONFORMANCE_HELPER: path.resolve(helperA), CONFORMANCE_OPENS: file },
  });
  return file;
}

function startHelper(file) {
  const child = spawn(file, [], { stdio: ['pipe', 'pipe', 'inherit'] });
  const waiting = [];
  let pending = Buffer.alloc(0);
  child.stdout.on('data', chunk => {
    pending = Buffer.concat([pending, chunk]);
    while (pending.length >= 4 && pending.length >= 4 + pending.readUInt32LE(0)) {
      const length = pending.readUInt32LE(0);
      waiting.shift().resolve(JSON.parse(pending.toString('utf8', 4, 4 + length)));
      pending = pending.subarray(4 + length);
    }
  });
  child.on('exit', code => waiting.splice(0).forEach(w => w.reject(new Error(`${file} exited with ${code}`))));
  const request = query =>
    new Promise((resolve, reject) => {
      waiting.push({ resolve, reject });
      const body = Buffer.from(JSON.stringify(query));
      const header = Buffer.alloc(4);
      header.writeUInt32LE(body.length);
      child.stdin.write(Buffer.concat([header, body]));
    });
  return {
    request,
    async batch(queries) {
      return queries.length ? (await request({ op: 'batch', queries })).result : [];
    },
    async close() {
      await request({ op: 'close' }).catch(() => undefined);
      child.kill();
    },
  };
}

// Answer shapes: which positions hold type ids (T), symbol ids (S), file ids (F) or node refs (N).
const T = 'T';
const S = 'S';
const F = 'F';
const N = { file: F };
const typeFacts = { id: T, symbol: S, aliasSymbol: S, aliasTypeArguments: [T], typeArguments: [T], types: [T], origin: T, target: T, baseLiteral: T };
const symbolFacts = { id: S, declarations: [N], valueDeclaration: N, parent: S, aliased: S, syntheticOrigin: S };
const indexInfo = { keyType: T, type: T, declaration: N };
const entry = id => ({ tuple: [null, null, null, id] });
const shapes = {
  open: { files: [{ id: F }], undefinedType: T },
  prefetchFile: { symbolAt: [entry(S)], typeFrom: [entry(T)], declared: [entry(S)], typeOfSymbol: [{ tuple: [S, T] }] },
  type: typeFacts,
  symbol: symbolFacts,
  members: { properties: [{ tuple: [S, T] }], indexInfos: [indexInfo] },
  print: { identifiers: [S] },
  typeToString: null,
};

function compareProgram(label) {
  const pairs = { T: [new Map(), new Map()], S: [new Map(), new Map()], F: [new Map(), new Map()] };
  const queue = { T: [], S: [] };
  const disagreements = [];
  const tupleTargets = new Set();
  const shared = { elementParameters: new Set(), memberTypes: new Set() };
  const isShared = key => shared.elementParameters.has(key) || shared.memberTypes.has(key);
  const share = (kind, a, b) => {
    const key = `${a}:${b}`;
    if (isShared(key)) return;
    shared[kind].add(key);
    if (!pairs.T[0].has(a) && !pairs.T[1].has(b)) queue.T.push([a, b]);
  };
  const pair = (kind, a, b) => {
    if (a === null || a === undefined || b === null || b === undefined) return a === b;
    // A loosely paired id meets its partner again in its own answers (`id`, a union of element parameters).
    if (kind === T && isShared(`${a}:${b}`)) return true;
    const [forward, backward] = pairs[kind];
    if (!forward.has(a) && !backward.has(b)) {
      forward.set(a, b);
      backward.set(b, a);
      queue[kind]?.push([a, b]);
      return true;
    }
    return forward.get(a) === b && backward.get(b) === a;
  };
  const differences = (shape, a, b, at, out) => {
    if (shape === T || shape === S || shape === F) {
      if (!pair(shape, a, b)) out.push(`${at || 'answer'}: ${shape} ${a} vs ${b}${pairs[shape][0].has(a) ? ` (A ${a} is paired with B ${pairs[shape][0].get(a)})` : ''}`);
    } else if (Array.isArray(shape) || shape?.tuple || (shape && typeof shape === 'object')) {
      if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
        if (JSON.stringify(a) !== JSON.stringify(b)) out.push(`${at || 'answer'}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
      } else if (Array.isArray(shape)) {
        if (a.length !== b.length) out.push(`${at}: length ${a.length} vs ${b.length}`);
        else a.forEach((item, i) => differences(shape[0], item, b[i], `${at}[${i}]`, out));
      } else {
        const fields = shape.tuple ?? shape;
        for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) differences(fields[key] ?? null, a[key], b[key], at ? `${at}.${key}` : key, out);
      }
    } else if (JSON.stringify(a) !== JSON.stringify(b)) {
      out.push(`${at || 'answer'}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
    }
    return out;
  };
  // Pairs the tuple-target positions of answers A and B loosely and blanks them, so the strict walk skips them.
  const takeTupleTargetPositions = (query, resultA, resultB) => {
    if (query.op === 'type' && resultA.isTuple && resultA.target === resultA.id && resultB.target === resultB.id) {
      tupleTargets.add(resultA.id);
      if (resultA.typeArguments?.length === resultB.typeArguments?.length) {
        resultA.typeArguments.forEach((id, i) => share('elementParameters', id, resultB.typeArguments[i]));
        delete resultA.typeArguments;
        delete resultB.typeArguments;
      }
    }
    if (query.op === 'members' && tupleTargets.has(query.type)) {
      resultA.properties.forEach(([symbolA, typeA], i) => {
        if (!resultB.properties[i]) return;
        share('memberTypes', typeA, resultB.properties[i][1]);
        resultA.properties[i] = [symbolA, null];
        resultB.properties[i] = [resultB.properties[i][0], null];
      });
      resultA.indexInfos.forEach((info, i) => {
        if (!resultB.indexInfos[i]) return;
        share('memberTypes', info.type, resultB.indexInfos[i].type);
        info.type = resultB.indexInfos[i].type = null;
      });
    }
  };
  const compare = (queryA, queryB, answerA, answerB) => {
    if (answerA.ok && answerB.ok) takeTupleTargetPositions(queryA, answerA.result, answerB.result);
    const found =
      answerA.ok && answerB.ok
        ? differences(shapes[queryA.op], answerA.result, answerB.result, '', [])
        : answerA.ok === answerB.ok
          ? []
          : [`ok ${answerA.ok} vs ${answerB.ok}`];
    if (found.length) disagreements.push({ program: label, query: { A: queryA, B: queryB }, differences: found, A: answerA, B: answerB });
  };
  return { pairs, queue, disagreements, compare, shared };
}

const typeQueries = id => [
  { op: 'type', type: id },
  { op: 'members', type: id },
  { op: 'print', type: id },
  { op: 'typeToString', type: id },
];

async function checkProgram(open) {
  const label = open.rootFiles.map(file => path.relative(open.cwd, file)).join(', ');
  const [a, b] = [startHelper(helperA), startHelper(helperB)];
  const program = compareProgram(label);
  try {
    const [openedA, openedB] = await Promise.all([a.request(open), b.request(open)]);
    program.compare(open, open, openedA, openedB);
    if (!openedA.ok || !openedB.ok) return { label, ...program, types: 0, symbols: 0 };
    const own = openedA.result.files.filter(info => !info.isDeclarationFile).map(info => info.id);
    const prefetchA = own.map(file => ({ op: 'prefetchFile', file }));
    const prefetchB = own.map(file => ({ op: 'prefetchFile', file: program.pairs.F[0].get(file) }));
    const [answersA, answersB] = await Promise.all([a.batch(prefetchA), b.batch(prefetchB)]);
    answersA.forEach((answer, i) => program.compare(prefetchA[i], prefetchB[i], answer, answersB[i]));
    let types = 0;
    let symbols = 0;
    while (program.queue.T.length || program.queue.S.length) {
      const round = [...program.queue.T.splice(0).map(([x, y]) => [typeQueries(x), typeQueries(y)]), ...program.queue.S.splice(0).map(([x, y]) => [[{ op: 'symbol', symbol: x }], [{ op: 'symbol', symbol: y }]])];
      types += round.filter(([queries]) => queries.length > 1).length;
      symbols += round.filter(([queries]) => queries.length === 1).length;
      const queriesA = round.flatMap(([x]) => x);
      const queriesB = round.flatMap(([, y]) => y);
      const [roundA, roundB] = await Promise.all([a.batch(queriesA), b.batch(queriesB)]);
      roundA.forEach((answer, i) => program.compare(queriesA[i], queriesB[i], answer, roundB[i]));
    }
    return { label, ...program, types, symbols };
  } finally {
    await Promise.all([a.close(), b.close()]);
  }
}

(async () => {
  const opens = fs
    .readFileSync(opensFile ?? recordPrepareOpens(), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line));
  const distinct = [...new Map(opens.map(open => [JSON.stringify(open), open])).values()];
  let failed = 0;
  for (const open of distinct) {
    const result = await checkProgram(open);
    console.log(`${result.disagreements.length ? 'DIFFER' : 'agree '} ${result.label}: ${result.types} types, ${result.symbols} symbols, ${result.shared.elementParameters.size} tuple element parameter and ${result.shared.memberTypes.size} tuple target member type pairs compared loosely, ${result.disagreements.length} disagreements`);
    for (const disagreement of result.disagreements) {
      failed++;
      console.log(JSON.stringify(disagreement));
    }
  }
  console.log(`${distinct.length} programs, ${failed} disagreements`);
  process.exit(failed ? 1 : 0);
})().catch(error => {
  console.error(error);
  process.exit(2);
});
