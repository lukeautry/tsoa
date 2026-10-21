import { expect } from 'chai';
import 'mocha';
import { join, normalize } from 'path';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import * as ts from 'typescript';
import { validateCompilerOptions } from '@tsoa/cli/cli';
import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { Tsoa } from '@tsoa/runtime';

function resolveProperties(type: Tsoa.Type): Tsoa.Property[] {
  if (type.dataType === 'refObject') {
    return type.properties;
  }
  if (type.dataType === 'nestedObjectLiteral') {
    return type.properties;
  }
  if (type.dataType === 'refAlias') {
    return resolveProperties(type.type);
  }
  return [];
}

const fixtureDir = normalize(join(__dirname, '../../fixtures/tsconfig-bundler'));

describe('validateCompilerOptions', () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = realpathSync.native(mkdtempSync(join(tmpdir(), 'tsoa-compiler-options-')));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  describe('configuration errors', () => {
    it('reports malformed project configuration', () => {
      writeFileSync(join(projectDir, 'tsconfig.json'), '{"compilerOptions":');
      expect(() => validateCompilerOptions(undefined, projectDir)).to.throw(/tsconfig\.json.*error TS/);
    });

    it('reports invalid project compiler options', () => {
      writeFileSync(join(projectDir, 'tsconfig.json'), JSON.stringify({ compilerOptions: { moduleResolution: 'typo' } }));
      expect(() => validateCompilerOptions(undefined, projectDir)).to.throw(/moduleResolution/);
    });

    it('reports missing inherited configuration', () => {
      writeFileSync(join(projectDir, 'tsconfig.json'), JSON.stringify({ extends: './missing.json' }));
      expect(() => validateCompilerOptions(undefined, projectDir)).to.throw(/missing.json/);
    });
  });

  describe('project boundaries', () => {
    it('keeps the bundler fixture out of the parent test compiler project', () => {
      const configPath = normalize(join(__dirname, '../../tsconfig.json'));
      const config = ts.readConfigFile(configPath, path => ts.sys.readFile(path));
      const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, normalize(join(__dirname, '../..')));
      expect(parsed.fileNames.filter(file => normalize(file).startsWith(fixtureDir))).to.deep.equal([]);
    });

    it('accepts compiler options when the project has no input files', () => {
      writeFileSync(join(projectDir, 'tsconfig.json'), JSON.stringify({ compilerOptions: { strict: true } }));
      expect(validateCompilerOptions(undefined, projectDir).strict).to.equal(true);
    });

    it('accepts an empty files list in an options-only project', () => {
      writeFileSync(join(projectDir, 'tsconfig.json'), JSON.stringify({ compilerOptions: { strict: true }, files: [] }));
      expect(validateCompilerOptions(undefined, projectDir).strict).to.equal(true);
    });

    it('resolves inherited paths from the configuration that declares them', () => {
      const baseDir = join(projectDir, 'base');
      const childDir = join(projectDir, 'child');
      mkdirSync(baseDir);
      mkdirSync(childDir);
      writeFileSync(join(baseDir, 'tsconfig.json'), JSON.stringify({ compilerOptions: { baseUrl: '.', typeRoots: ['./types'] } }));
      writeFileSync(join(childDir, 'tsconfig.json'), JSON.stringify({ extends: '../base/tsconfig.json' }));
      const options = validateCompilerOptions(undefined, childDir);
      expect(options.baseUrl && normalize(options.baseUrl)).to.equal(baseDir);
      expect(options.typeRoots?.map(path => normalize(path))).to.deep.equal([join(baseDir, 'types')]);
    });

    it('preserves native override paths when an ancestor holds the tsconfig', () => {
      const childDir = join(projectDir, 'child');
      mkdirSync(childDir);
      writeFileSync(join(projectDir, 'tsconfig.json'), JSON.stringify({ compilerOptions: { strict: true } }));
      const options = validateCompilerOptions({ baseUrl: './src', typeRoots: ['./types'] }, childDir);
      expect(options.baseUrl).to.equal('./src');
      expect(options.typeRoots).to.deep.equal(['./types']);
    });

    it('resolves native aliases from their own working directory', () => {
      const childDir = join(projectDir, 'child');
      mkdirSync(childDir);
      writeFileSync(join(projectDir, 'tsconfig.json'), JSON.stringify({ compilerOptions: { paths: { project: ['./project.ts'] } } }));
      writeFileSync(join(projectDir, 'model.ts'), 'export interface Model { ancestor: number }');
      writeFileSync(join(childDir, 'model.ts'), 'export interface Model { child: string }');
      const overrides = Object.freeze({ paths: { model: ['./model.ts'] } });
      const host = { ...ts.sys, getCurrentDirectory: () => childDir };
      const containingFile = join(childDir, 'controller.ts');
      const control = ts.resolveModuleName('model', containingFile, overrides, host);
      const options = validateCompilerOptions(overrides, childDir);
      const resolved = ts.resolveModuleName('model', containingFile, options, host);
      expect(control.resolvedModule && normalize(control.resolvedModule.resolvedFileName)).to.equal(join(childDir, 'model.ts'));
      expect(resolved.resolvedModule?.resolvedFileName).to.equal(control.resolvedModule?.resolvedFileName);
    });
  });
  describe('tsconfig.json discovery', () => {
    it('should read moduleResolution from the project tsconfig.json', () => {
      const options = validateCompilerOptions(undefined, fixtureDir);
      expect(options.moduleResolution).to.equal(ts.ModuleResolutionKind.Bundler);
    });

    it('should read customConditions from the project tsconfig.json', () => {
      const options = validateCompilerOptions(undefined, fixtureDir);
      expect(options.customConditions).to.deep.equal(['source']);
    });

    it('should return empty options when no tsconfig.json exists in the given directory', () => {
      const options = validateCompilerOptions(undefined, '/');
      expect(options.moduleResolution).to.be.undefined;
      expect(options.customConditions).to.be.undefined;
    });
  });

  describe('compilerOptions overrides', () => {
    it('preserves normalized numeric enum overrides from object and JavaScript configs', () => {
      const overrides: ts.CompilerOptions = {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        moduleResolution: ts.ModuleResolutionKind.Node10,
        newLine: ts.NewLineKind.CarriageReturnLineFeed,
      };
      const options = validateCompilerOptions(overrides, fixtureDir);
      expect(options).to.include(overrides);
    });

    it('preserves compiler options normalized by TypeScript, including library filenames', () => {
      const overrides = ts.convertCompilerOptionsFromJson({ module: 'commonjs', target: 'es2022', lib: ['es2022'] }, projectDir);
      expect(overrides.errors).to.deep.equal([]);
      expect(validateCompilerOptions(overrides.options, projectDir)).to.deep.equal(overrides.options);
    });

    it('preserves config paths and resolution state produced by the TypeScript config parser', () => {
      const parsed = ts.parseJsonConfigFileContent({ compilerOptions: { baseUrl: '.', paths: { external: ['./external.ts'] } } }, ts.sys, projectDir, undefined, join(projectDir, 'other.json'));
      const options = validateCompilerOptions(parsed.options, fixtureDir);
      expect(options).to.deep.include(parsed.options);
      expect(options.moduleResolution).to.equal(ts.ModuleResolutionKind.Bundler);
    });

    it('preserves parser metadata that controls package self-name resolution', () => {
      const packageDir = join(projectDir, 'package');
      mkdirSync(join(packageDir, 'src'), { recursive: true });
      mkdirSync(join(packageDir, 'dist'));
      writeFileSync(join(packageDir, 'package.json'), JSON.stringify({ name: 'self-pkg', exports: { '.': './dist/model.d.ts' } }));
      writeFileSync(join(packageDir, 'src/model.ts'), 'export interface Model { source: string }');
      writeFileSync(join(packageDir, 'dist/model.d.ts'), 'export interface Model { declaration: string }');
      const configPath = join(projectDir, 'tsconfig.json');
      writeFileSync(configPath, JSON.stringify({ compilerOptions: { module: 'nodenext', moduleResolution: 'nodenext', rootDir: './package/src', outDir: './package/dist' } }));
      const parsed = ts.getParsedCommandLineOfConfigFile(
        configPath,
        {},
        {
          ...ts.sys,
          onUnRecoverableConfigFileDiagnostic: diagnostic => {
            throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
          },
        },
      );
      if (!parsed) {
        throw new Error('Expected the valid project configuration to parse');
      }
      const overrides = Object.freeze(parsed.options);
      const containingFile = join(packageDir, 'src/controller.ts');
      const control = ts.resolveModuleName('self-pkg', containingFile, overrides, ts.sys);
      const options = validateCompilerOptions(overrides, projectDir);
      const resolved = ts.resolveModuleName('self-pkg', containingFile, options, ts.sys);
      const discovered = validateCompilerOptions(undefined, projectDir);
      const discoveredResolution = ts.resolveModuleName('self-pkg', containingFile, discovered, ts.sys);
      expect(control.resolvedModule && normalize(control.resolvedModule.resolvedFileName)).to.equal(join(packageDir, 'dist/model.d.ts'));
      expect(resolved.resolvedModule?.resolvedFileName).to.equal(control.resolvedModule?.resolvedFileName);
      expect(discoveredResolution.resolvedModule?.resolvedFileName).to.equal(control.resolvedModule?.resolvedFileName);
      expect(options.configFile).to.equal(overrides.configFile);
    });

    it('should apply compilerOptions on top of tsconfig.json settings', () => {
      const options = validateCompilerOptions({ customConditions: ['custom'] }, fixtureDir);
      expect(options.customConditions).to.deep.equal(['custom']);
      expect(options.moduleResolution).to.equal(ts.ModuleResolutionKind.Bundler);
    });

    it('lets native enum overrides win over project options', () => {
      const options = validateCompilerOptions({ moduleResolution: ts.ModuleResolutionKind.Node16 }, fixtureDir);
      expect(options.moduleResolution).to.equal(ts.ModuleResolutionKind.Node16);
    });
  });

  describe('conditional package exports', () => {
    it('selects the source condition from project options with a default-condition control', () => {
      const packageDir = join(projectDir, 'node_modules', 'conditional-pkg');
      mkdirSync(packageDir, { recursive: true });
      writeFileSync(join(packageDir, 'package.json'), JSON.stringify({ name: 'conditional-pkg', exports: { '.': { source: './source.ts', types: './types.d.ts' } } }));
      writeFileSync(join(packageDir, 'source.ts'), 'export interface Widget { source: string }');
      writeFileSync(join(packageDir, 'types.d.ts'), 'export interface Widget { declaration: string }');
      writeFileSync(join(projectDir, 'tsconfig.json'), JSON.stringify({ compilerOptions: { module: 'esnext', moduleResolution: 'bundler', customConditions: ['source'] } }));
      const options = validateCompilerOptions(undefined, projectDir);
      const containingFile = join(projectDir, 'controller.ts');
      const source = ts.resolveModuleName('conditional-pkg', containingFile, options, ts.sys);
      const control = ts.resolveModuleName('conditional-pkg', containingFile, { ...options, customConditions: [] }, ts.sys);
      expect(source.resolvedModule && normalize(source.resolvedModule.resolvedFileName)).to.equal(join(packageDir, 'source.ts'));
      expect(control.resolvedModule && normalize(control.resolvedModule.resolvedFileName)).to.equal(join(packageDir, 'types.d.ts'));
    });
  });

  describe('cross-package type resolution', () => {
    const controllerPath = normalize(join(__dirname, '../../fixtures/tsconfig-bundler/controller.ts'));

    it('cannot resolve the external package without project options', () => {
      expect(() => new MetadataGenerator(controllerPath).Generate()).to.throw(/Could not find declarations for type 'Widget'/);
    });

    it('should expand Widget from a cross-package import when tsconfig is read', () => {
      const options = validateCompilerOptions(undefined, fixtureDir);
      const metadata = new MetadataGenerator(controllerPath, options).Generate();
      const widgetType = metadata.referenceTypeMap['Widget'];
      expect(widgetType).to.exist;
      const propNames = resolveProperties(widgetType).map(p => p.name);
      expect(propNames).to.include.members(['id', 'name', 'active']);
    });

    it('should expand z.infer<> from a cross-package import when tsconfig is read', () => {
      const options = validateCompilerOptions(undefined, fixtureDir);
      const metadata = new MetadataGenerator(controllerPath, options).Generate();
      const zodWidgetType = metadata.referenceTypeMap['ZodWidget'];
      expect(zodWidgetType).to.exist;
      const propNames = resolveProperties(zodWidgetType).map(p => p.name);
      expect(propNames).to.include.members(['id', 'label', 'enabled']);
    });
  });
});
