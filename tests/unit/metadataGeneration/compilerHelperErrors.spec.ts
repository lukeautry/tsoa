import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { expect } from 'chai';
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import 'mocha';

const realHelper = process.env.TSOA_COMPILER_HELPER;
const entryFile = './fixtures/controllers/getController.ts';
const proxy = resolve(__dirname, '../../utils/compilerHelperProxy.cjs');

const isAlive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

/** Pids that are still alive after up to two seconds. */
const survivors = async (pids: number[]) => {
  for (let attempt = 0; attempt < 40 && pids.some(isAlive); attempt++) await new Promise(done => setTimeout(done, 50));
  return pids.filter(isAlive);
};

const suite = realHelper ? 'compiler helper errors' : 'compiler helper errors (skipped: set TSOA_COMPILER_HELPER to a compiler helper to run)';
// Windows runs neither a `.cjs` file as a program nor file permissions, so the proxy and the executable-bit cases are
// POSIX only. nativeProgram.spec.ts covers the protocol and prefetch errors on every platform with a fake channel.
const posixOnly = process.platform === 'win32' ? it.skip : it;

describe(suite, function () {
  this.timeout(30000);
  let directory: string;
  const saved = { ...process.env };

  before(function () {
    if (!realHelper) this.skip();
  });
  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'tsoa-helper-errors-'));
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  const useProxy = (mode: string) => {
    const pidFile = join(directory, 'pids');
    writeFileSync(pidFile, '');
    Object.assign(process.env, { TSOA_COMPILER_HELPER: proxy, PROXY_HELPER: realHelper, PROXY_MODE: mode, PROXY_PIDS: pidFile });
    return () => readFileSync(pidFile, 'utf8').split('\n').filter(Boolean).map(Number);
  };

  posixOnly('refuses a helper that speaks another protocol, and leaves no helper running', async () => {
    const pids = useProxy('protocol7');
    expect(() => new MetadataGenerator(entryFile)).to.throw('tsoa compiler helper speaks protocol 7, this tsoa needs 8');
    expect(pids()).to.have.length(2);
    expect(await survivors(pids())).to.deep.equal([]);
  });

  posixOnly('refuses a helper that reports no protocol', () => {
    useProxy('noprotocol');
    expect(() => new MetadataGenerator(entryFile)).to.throw('tsoa compiler helper speaks protocol undefined, this tsoa needs 8');
  });

  posixOnly('names the file the helper failed to prefetch, and leaves no helper running', async () => {
    const pids = useProxy('prefetchfail');
    expect(() => new MetadataGenerator(entryFile).Generate()).to.throw(`tsoa compiler helper failed on ${resolve(entryFile)}: proxy refused prefetchFile`);
    expect(await survivors(pids())).to.deep.equal([]);
  });

  it('reports a missing helper', () => {
    const missing = join(directory, 'no-such-helper');
    process.env.TSOA_COMPILER_HELPER = missing;
    expect(() => new MetadataGenerator(entryFile)).to.throw(`tsoa compiler helper not found or not executable: ${missing}`);
  });

  posixOnly('reports a helper that is not executable', () => {
    const plain = join(directory, 'helper');
    writeFileSync(plain, '');
    chmodSync(plain, 0o644);
    process.env.TSOA_COMPILER_HELPER = plain;
    expect(() => new MetadataGenerator(entryFile)).to.throw(`tsoa compiler helper not found or not executable: ${plain}`);
  });
});
