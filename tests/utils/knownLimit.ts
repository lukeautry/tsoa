import { compilerPackage } from '@tsoa/cli/compiler';
import { expect } from 'chai';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
export function knownLimit(backends: readonly string[], expected: string | RegExp) {
  return async (run: () => unknown): Promise<void> => {
    const requireCompiler = createRequire(process.env.TSOA_COMPILER_ROOT ? resolve(process.env.TSOA_COMPILER_ROOT, 'package.json') : __filename);
    const name = compilerPackage();
    const { version } = requireCompiler(`${name}/package.json`) as { version: string };
    if (!backends.includes(`${name}@${version}`)) {
      await run();
      return;
    }
    let failure: unknown;
    try {
      await run();
    } catch (error) {
      failure = error;
    }
    expect(failure, 'Known limit must fail; remove the marker if fixed').to.be.instanceOf(Error);
    const message = (failure as Error).message;
    if (typeof expected === 'string') expect(message).to.equal(expected);
    else expect(message).to.match(expected);
  };
}
