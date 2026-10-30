import { expect } from 'chai';
import 'mocha';
import { readFileSync } from 'fs';
import { dirname, join, normalize } from 'path';
import * as ts from 'typescript';
import * as rootEntry from '@tsoa/runtime/index';
import * as expressEntry from '@tsoa/runtime/express';
import * as fastifyEntry from '@tsoa/runtime/fastify';
import * as hapiEntry from '@tsoa/runtime/hapi';
import * as koaEntry from '@tsoa/runtime/koa';

const runtimeSrc = normalize(join(__dirname, '../../../packages/runtime/src'));
const frameworkModules = ['express', 'fastify', '@hapi/hapi', '@hapi/boom', 'koa', 'multer'];

function externalImportsReachableFrom(entry: string): Set<string> {
  const visited = new Set<string>();
  const external = new Set<string>();
  const queue = [join(runtimeSrc, entry)];
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (visited.has(file)) {
      continue;
    }
    visited.add(file);
    const { importedFiles } = ts.preProcessFile(readFileSync(file, 'utf8'), true, true);
    for (const { fileName } of importedFiles) {
      if (fileName.startsWith('.')) {
        const base = join(dirname(file), fileName);
        queue.push(ts.sys.fileExists(`${base}.ts`) ? `${base}.ts` : join(base, 'index.ts'));
      } else {
        external.add(fileName);
      }
    }
  }
  return external;
}

describe('@tsoa/runtime entry points', () => {
  // Framework packages are optional peer dependencies, so the root entry must not import them, even as types.
  it('should not import any framework package from the root entry', () => {
    const imports = externalImportsReachableFrom('index.ts');
    expect(frameworkModules.filter(name => imports.has(name))).to.deep.equal([]);
  });

  it('should export framework template services only from their subpath entries', () => {
    expect(rootEntry).to.not.have.any.keys('ExpressTemplateService', 'FastifyTemplateService', 'HapiTemplateService', 'KoaTemplateService');
    expect(expressEntry.ExpressTemplateService).to.be.a('function');
    expect(fastifyEntry.FastifyTemplateService).to.be.a('function');
    expect(hapiEntry.HapiTemplateService).to.be.a('function');
    expect(koaEntry.KoaTemplateService).to.be.a('function');
  });

  it('should import each framework only from its own subpath entry', () => {
    const expected: Record<string, string[]> = { express: ['express'], fastify: ['fastify'], hapi: ['@hapi/boom', '@hapi/hapi'], koa: ['koa'] };
    for (const [entry, frameworks] of Object.entries(expected)) {
      const imports = [...externalImportsReachableFrom(`${entry}.ts`)].filter(name => frameworkModules.includes(name)).sort();
      expect(imports, entry).to.deep.equal(frameworks);
    }
  });

  it('should expose each subpath entry through exports and typesVersions', () => {
    const pkg = JSON.parse(readFileSync(join(runtimeSrc, '../package.json'), 'utf8'));
    for (const name of ['express', 'fastify', 'hapi', 'koa']) {
      expect(pkg.exports[`./${name}`]).to.deep.equal({ types: `./dist/${name}.d.ts`, default: `./dist/${name}.js` });
      expect(pkg.typesVersions['*'][name]).to.deep.equal([`./dist/${name}.d.ts`]);
      expect(ts.sys.fileExists(join(runtimeSrc, `${name}.ts`))).to.equal(true);
    }
  });
});
