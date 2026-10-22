import { expect } from 'chai';
import 'mocha';
import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { SpecGenerator3 } from '@tsoa/cli/swagger/specGenerator3';
import { getDefaultExtendedOptions } from 'fixtures/defaultOptions';

describe('Duplicate model definitions', () => {
  describe('accepted duplicates', () => {
    const metadata = new MetadataGenerator('./fixtures/controllers/duplicateModelsController.ts').Generate();
    const spec = new SpecGenerator3(metadata, getDefaultExtendedOptions()).GetSpec();

    it('resolves same-named declarations to the declaration marked with @tsoaModel', () => {
      const schema = spec.components.schemas?.DesignatedDuplicateModel;
      if (!schema || !('properties' in schema)) {
        throw new Error('DesignatedDuplicateModel schema is missing or has no properties');
      }
      expect(schema.properties).to.have.property('canonicalValue');
      expect(schema.properties).to.not.have.property('wrongValue');
    });

    it('references the canonical model from both same-named usages', () => {
      const holderNames = ['DesignatedModelHolder', 'DuplicateDesignatedModelHolder'];
      for (const holderName of holderNames) {
        const holder = spec.components.schemas?.[holderName];
        if (!holder || !('properties' in holder) || !holder.properties) {
          throw new Error(`${holderName} schema is missing or has no properties`);
        }
        expect(holder.properties.model).to.have.property('$ref', '#/components/schemas/DesignatedDuplicateModel', holderName);
      }
    });

    it('treats byte-identical copies of a declaration file as one model', () => {
      const schema = spec.components.schemas?.CopiedDuplicateModel;
      if (!schema || !('properties' in schema)) {
        throw new Error('CopiedDuplicateModel schema is missing or has no properties');
      }
      expect(schema.properties).to.have.property('id');
    });

    it('treats verbatim copies of a declaration in different files as one model', () => {
      const schema = spec.components.schemas?.VerbatimDuplicateEnum;
      if (!schema || !('enum' in schema)) {
        throw new Error('VerbatimDuplicateEnum schema is missing or is not an enum');
      }
      expect(schema.enum).to.deep.equal(['A', 'B']);
    });

    it('treats a built declaration file as the source file its declaration map points to', () => {
      const schema = spec.components.schemas?.BuiltDuplicateModel;
      if (!schema || !('properties' in schema)) {
        throw new Error('BuiltDuplicateModel schema is missing or has no properties');
      }
      expect(schema.properties).to.have.property('value');
    });

    it('treats verbatim copies of a merged const + type alias pair as one model', () => {
      const schema = spec.components.schemas?.MergedConstEnum;
      if (!schema || !('enum' in schema)) {
        throw new Error('MergedConstEnum schema is missing or is not an enum');
      }
      expect(schema.enum).to.deep.equal(['ON', 'OFF']);
    });

    it('treats enum-like declarations with the same literal value set as one model', () => {
      const schema = spec.components.schemas?.ValueSetEnum;
      if (!schema || !('enum' in schema)) {
        throw new Error('ValueSetEnum schema is missing or is not an enum');
      }
      expect(schema.enum).to.have.members(['ALPHA', 'BETA']);
    });

    it('treats plain interfaces with the same property signatures as one model', () => {
      const schema = spec.components.schemas?.ShapeDuplicateModel;
      if (!schema || !('properties' in schema)) {
        throw new Error('ShapeDuplicateModel schema is missing or has no properties');
      }
      expect(schema.properties).to.have.property('id');
      expect(schema.properties).to.have.property('count');
    });

    it('keeps the rendered declaration validators when a same-shaped copy carries none', () => {
      const validatedMetadata = new MetadataGenerator('./fixtures/controllers/validatorConflictController.ts').Generate();
      const validatedSpec = new SpecGenerator3(validatedMetadata, getDefaultExtendedOptions()).GetSpec();
      const schema = validatedSpec.components.schemas?.ValidatedDuplicateModel;
      if (!schema || !('properties' in schema) || !schema.properties) {
        throw new Error('ValidatedDuplicateModel schema is missing or has no properties');
      }
      expect(schema.properties.code).to.have.property('minLength', 2);
    });

    it('does not apply a @tsoaModel designation to a same-named model in another namespace', () => {
      const canonical = spec.components.schemas?.NamespacedDuplicateModel;
      if (!canonical || !('properties' in canonical)) {
        throw new Error('NamespacedDuplicateModel schema is missing or has no properties');
      }
      expect(canonical.properties).to.have.property('canonical');

      const namespaced = spec.components.schemas?.['DuplicateModelNs.NamespacedDuplicateModel'];
      if (!namespaced || !('properties' in namespaced)) {
        throw new Error('DuplicateModelNs.NamespacedDuplicateModel schema is missing or has no properties');
      }
      expect(namespaced.properties).to.have.property('nested');
      expect(namespaced.properties).to.not.have.property('canonical');
    });
  });

  describe('conflicting duplicates', () => {
    it('still throws for genuinely different same-named models', () => {
      expect(() => new MetadataGenerator('./fixtures/controllers/conflictingModelsController.ts').Generate()).to.throw(/Found 2 different model definitions for model ConflictingDuplicateModel/);
    });

    it('still throws for same-text type aliases whose merged const values differ', () => {
      expect(() => new MetadataGenerator('./fixtures/controllers/mergedConstConflictController.ts').Generate()).to.throw(/Found 2 different model definitions for model MergedConstConflictEnum/);
    });

    it('throws when two different declarations of one name are both marked with @tsoaModel', () => {
      expect(() => new MetadataGenerator('./fixtures/controllers/multiDesignatedModelsController.ts').Generate()).to.throw(/Multiple models for MultiDesignatedModel marked with '@tsoaModel'/);
    });
  });
});
