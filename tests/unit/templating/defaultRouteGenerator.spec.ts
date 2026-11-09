import { expect } from 'chai';
import 'mocha';
import * as fs from 'fs';
import * as path from 'path';
import { resolveDefaultTemplatePath } from '@tsoa/cli/routeGeneration/defaultRouteGenerator';

describe('DefaultRouteGenerator', () => {
  describe('resolveDefaultTemplatePath', () => {
    const templates = ['express.hbs', 'hapi.hbs', 'koa.hbs'];

    it('resolves the built-in templates relative to the CLI module', () => {
      for (const name of templates) {
        const resolved = resolveDefaultTemplatePath(name);
        expect(fs.existsSync(resolved), `expected ${resolved} to exist`).to.equal(true);
        expect(path.basename(resolved)).to.equal(name);
      }
    });

    it('falls back to the installed package location when the module dir is not the CLI package (e.g. when the CLI is bundled into the consumer app)', () => {
      const bogusModuleDir = path.resolve(__dirname, 'somewhere', 'completely', 'else');
      for (const name of templates) {
        const resolved = resolveDefaultTemplatePath(name, bogusModuleDir);
        expect(fs.existsSync(resolved), `expected ${resolved} to exist`).to.equal(true);
        expect(path.basename(resolved)).to.equal(name);
      }
    });

    it('throws a descriptive error when the template cannot be located', () => {
      const bogusModuleDir = path.resolve(__dirname, 'somewhere', 'completely', 'else');
      expect(() => resolveDefaultTemplatePath('does-not-exist.hbs', bogusModuleDir)).to.throw(/Unable to locate the built-in route template/);
    });
  });
});
