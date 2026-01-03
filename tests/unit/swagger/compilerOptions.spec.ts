import { expect } from 'chai';
import 'mocha';
import { validateCompilerOptions } from '@tsoa/cli/cli';
import { Config } from '@tsoa/runtime';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { tmpdir } from 'os';
import * as ts from 'typescript';

const fsWriteFile = promisify(fs.writeFile);
const fsUnlink = promisify(fs.unlink);
const fsMkdir = promisify(fs.mkdir);
const fsRmdir = promisify(fs.rmdir);

describe('CompilerOptions', () => {
  let testDir: string;

  beforeEach(async () => {
    // Create a temporary directory for each test
    testDir = path.join(tmpdir(), `tsoa-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    await fsMkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      const files = await promisify(fs.readdir)(testDir);
      for (const file of files) {
        await promisify(fs.unlink)(path.join(testDir, file));
      }
      await fsRmdir(testDir);
    } catch (err) {
      // Ignore cleanup errors
    }
  });

  describe('validateCompilerOptions', () => {
    it('should read compilerOptions from tsconfig.json', async () => {
      // Create a tsconfig.json with compilerOptions
      const tsconfigPath = path.join(testDir, 'tsconfig.json');
      await fsWriteFile(
        tsconfigPath,
        JSON.stringify({
          compilerOptions: {
            target: 'es2020',
            module: 'commonjs',
            strict: true,
            experimentalDecorators: true,
          },
        }),
        'utf8',
      );

      const config: Config = {
        entryFile: './test.ts',
        spec: {
          outputDirectory: './dist',
        },
        routes: {
          routesDir: './routes',
        },
      };

      const compilerOptions = await validateCompilerOptions(config, testDir);

      expect(compilerOptions.target).to.equal(ts.ScriptTarget.ES2020);
      expect(compilerOptions.module).to.equal(ts.ModuleKind.CommonJS);
      expect(compilerOptions.strict).to.be.true;
      expect(compilerOptions.experimentalDecorators).to.be.true;
    });

    it('should support tsconfig.json with comments and trailing commas', async () => {
      // Create a tsconfig.json with comments and trailing commas (like real tsconfig.json)
      const tsconfigPath = path.join(testDir, 'tsconfig.json');
      await fsWriteFile(
        tsconfigPath,
        `{
  "compilerOptions": {
    "target": "es2021", // This is a comment
    "module": "commonjs",
    "strict": true,
    "experimentalDecorators": true, // trailing comma
  }
}`,
        'utf8',
      );

      const config: Config = {
        entryFile: './test.ts',
        spec: {
          outputDirectory: './dist',
        },
        routes: {
          routesDir: './routes',
        },
      };

      const compilerOptions = await validateCompilerOptions(config, testDir);

      expect(compilerOptions.target).to.equal(ts.ScriptTarget.ES2021);
      expect(compilerOptions.module).to.equal(ts.ModuleKind.CommonJS);
      expect(compilerOptions.strict).to.be.true;
      expect(compilerOptions.experimentalDecorators).to.be.true;
    });

    it('should merge compilerOptions from tsoa.json over tsconfig.json', async () => {
      // Create a tsconfig.json
      const tsconfigPath = path.join(testDir, 'tsconfig.json');
      await fsWriteFile(
        tsconfigPath,
        JSON.stringify({
          compilerOptions: {
            target: 'es2020',
            module: 'commonjs',
            strict: true,
            experimentalDecorators: true,
          },
        }),
        'utf8',
      );

      const config: Config = {
        entryFile: './test.ts',
        spec: {
          outputDirectory: './dist',
        },
        routes: {
          routesDir: './routes',
        },
        compilerOptions: {
          target: 'es2015', // Override tsconfig.json
          module: 'esnext', // Override tsconfig.json
          // strict and experimentalDecorators should come from tsconfig.json
        },
      };

      const compilerOptions = await validateCompilerOptions(config, testDir);

      // tsoa.json options should take precedence
      // TypeScript's parseJsonConfigFileContent converts strings to enum values
      expect(compilerOptions.target).to.equal(ts.ScriptTarget.ES2015);
      expect(compilerOptions.module).to.equal(ts.ModuleKind.ESNext);
      // Options not in tsoa.json should come from tsconfig.json
      expect(compilerOptions.strict).to.be.true;
      expect(compilerOptions.experimentalDecorators).to.be.true;
    });

    it('should use custom tsconfig path when specified', async () => {
      // Create a custom tsconfig file
      const customTsconfigPath = path.join(testDir, 'custom-tsconfig.json');
      await fsWriteFile(
        customTsconfigPath,
        JSON.stringify({
          compilerOptions: {
            target: 'es2018',
            module: 'es2015',
          },
        }),
        'utf8',
      );

      const config: Config = {
        entryFile: './test.ts',
        spec: {
          outputDirectory: './dist',
        },
        routes: {
          routesDir: './routes',
        },
        tsconfig: 'custom-tsconfig.json',
      };

      const compilerOptions = await validateCompilerOptions(config, testDir);

      expect(compilerOptions.target).to.equal(ts.ScriptTarget.ES2018);
      expect(compilerOptions.module).to.equal(ts.ModuleKind.ES2015);
    });

    it('should handle missing tsconfig.json gracefully when not explicitly specified', async () => {
      // Don't create tsconfig.json

      const config: Config = {
        entryFile: './test.ts',
        spec: {
          outputDirectory: './dist',
        },
        routes: {
          routesDir: './routes',
        },
      };

      const compilerOptions = await validateCompilerOptions(config, testDir);

      // Should return empty compilerOptions
      expect(compilerOptions).to.deep.equal({});
    });

    it('should throw error when explicitly specified tsconfig.json is missing', async () => {
      // Don't create tsconfig.json

      const config: Config = {
        entryFile: './test.ts',
        spec: {
          outputDirectory: './dist',
        },
        routes: {
          routesDir: './routes',
        },
        tsconfig: 'custom-tsconfig.json', // Explicitly specified but doesn't exist
      };

      try {
        await validateCompilerOptions(config, testDir);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.be.instanceOf(Error);
        expect((err as Error).message).to.include('custom-tsconfig.json');
      }
    });

    it('should use only tsoa.json compilerOptions when tsconfig.json is missing', async () => {
      // Don't create tsconfig.json

      const config: Config = {
        entryFile: './test.ts',
        spec: {
          outputDirectory: './dist',
        },
        routes: {
          routesDir: './routes',
        },
        compilerOptions: {
          target: 'es2017',
          module: 'amd',
          strict: false,
        },
      };

      const compilerOptions = await validateCompilerOptions(config, testDir);

      // TypeScript's parseJsonConfigFileContent converts strings to enum values
      expect(compilerOptions.target).to.equal(ts.ScriptTarget.ES2017);
      expect(compilerOptions.module).to.equal(ts.ModuleKind.AMD);
      expect(compilerOptions.strict).to.be.false;
    });
  });
});
