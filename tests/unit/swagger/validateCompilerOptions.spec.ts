import { expect } from 'chai';
import 'mocha';
import { join, normalize } from 'path';
import * as ts from 'typescript';
import { validateCompilerOptions } from '@tsoa/cli/cli';
import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { Tsoa } from '@tsoa/runtime';

// Unwrap nested refAlias chains until we reach a type with properties.
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

// Fixture: tests/fixtures/tsconfig-bundler/tsconfig.json sets
//   moduleResolution: "bundler" and customConditions: ["source"]
const fixtureDir = normalize(join(__dirname, '../../fixtures/tsconfig-bundler'));

describe('validateCompilerOptions', () => {
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
      // Pass a directory that has no tsconfig.json anywhere in its ancestry
      // (we use the filesystem root, which never has one)
      const options = validateCompilerOptions(undefined, '/');
      expect(options.moduleResolution).to.be.undefined;
      expect(options.customConditions).to.be.undefined;
    });
  });

  describe('compilerOptions overrides', () => {
    it('should apply compilerOptions on top of tsconfig.json settings', () => {
      const options = validateCompilerOptions({ customConditions: ['custom'] }, fixtureDir);
      // Override takes precedence over tsconfig value
      expect(options.customConditions).to.deep.equal(['custom']);
      // moduleResolution from tsconfig is still present
      expect(options.moduleResolution).to.equal(ts.ModuleResolutionKind.Bundler);
    });

    it('should convert string enum values in compilerOptions (e.g. moduleResolution)', () => {
      const options = validateCompilerOptions({ moduleResolution: 'node16' }, fixtureDir);
      expect(options.moduleResolution).to.equal(ts.ModuleResolutionKind.Node16);
    });
  });

  describe('cross-package type resolution', () => {
    // The fixture tsconfig maps 'external-pkg' via paths to a local .ts source file.
    // Without reading the tsconfig, TypeScript cannot find external-pkg and treats
    // Widget as `any`, so it never appears in the reference type map.
    const controllerPath = normalize(join(__dirname, '../../fixtures/tsconfig-bundler/controller.ts'));

    it('should expand Widget from a cross-package import when tsconfig is read', () => {
      const options = validateCompilerOptions(undefined, fixtureDir);
      const metadata = new MetadataGenerator(controllerPath, options).Generate();
      const widgetType = metadata.referenceTypeMap['Widget'];
      expect(widgetType).to.exist;
      const propNames = resolveProperties(widgetType).map(p => p.name);
      expect(propNames).to.include.members(['id', 'name', 'active']);
    });

    it('should expand z.infer<> from a cross-package import when tsconfig is read', () => {
      // This is the core failure mode: without reading tsconfig.json, TypeScript
      // defaults to Node10/CommonJS resolution and cannot follow the paths mapping
      // to the .ts source. As a result, ZodWidget resolves to `any` and is absent
      // from the reference type map — the same way z.infer<> collapses to {} when
      // read from compiled .d.ts files that lack the full Zod generic structure.
      const options = validateCompilerOptions(undefined, fixtureDir);
      const metadata = new MetadataGenerator(controllerPath, options).Generate();
      const zodWidgetType = metadata.referenceTypeMap['ZodWidget'];
      expect(zodWidgetType).to.exist;
      // ZodWidget is a refAlias wrapping z.infer<>, which itself is a refAlias
      // wrapping the resolved nestedObjectLiteral — traverse the chain.
      const propNames = resolveProperties(zodWidgetType).map(p => p.name);
      expect(propNames).to.include.members(['id', 'label', 'enabled']);
    });
  });
});
