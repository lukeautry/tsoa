import { expect } from 'chai';
import 'mocha';
import { MetadataGenerator } from '../../../src/metadataGeneration/metadataGenerator';
import { SpecGenerator3 } from '../../../src/swagger/specGenerator3';
import { Swagger } from '../../../src/swagger/swagger';
import { getDefaultOptions } from '../../fixtures/defaultOptions';

describe('Definition generation for OpenAPI 3.0.0', () => {
  const metadata = new MetadataGenerator('./tests/fixtures/controllers/getController.ts').Generate();
  const spec = new SpecGenerator3(metadata, getDefaultOptions()).GetSpec();

  describe('servers', () => {
    it('should replace the parent schemes element', () => {
      expect(spec).to.not.have.property('schemes');
      expect(spec.servers[0].url).to.match(/^https/);
    });

    it('should replace the parent host element', () => {
      expect(spec).to.not.have.property('host');
      expect(spec.servers[0].url).to.match(/localhost:3000/);
    });

    it('should replace the parent basePath element', () => {
      expect(spec).to.not.have.property('basePath');
      expect(spec.servers[0].url).to.match(/\/v1/);
    });
  });

  describe('security', () => {
    it('should replace the parent securityDefinitions with securitySchemes within components', () => {
      expect(spec).to.not.have.property('securityDefinitions');
      expect(spec.components.securitySchemes).to.be.ok;
    });

    it('should replace type: basic with type: http and scheme: basic', () => {
      if (!spec.components.securitySchemes) { throw new Error('No security schemes.'); }
      if (!spec.components.securitySchemes.basic) { throw new Error('No basic security scheme.'); }

      const basic = spec.components.securitySchemes.basic as Swagger.BasicSecurity3;

      expect(basic.type).to.equal('http');
      expect(basic.scheme).to.equal('basic');
    });
  });

  describe('paths', () => {
    describe('requestBody', () => {
      it('should replace the body parameter with a requestBody', () => {
        const metadataPost = new MetadataGenerator('./tests/fixtures/controllers/postController.ts').Generate();
        const specPost = new SpecGenerator3(metadataPost, getDefaultOptions()).GetSpec();

        if (!specPost.paths) { throw new Error('Paths are not defined.'); }
        if (!specPost.paths['/PostTest']) { throw new Error('PostTest path not defined.'); }
        if (!specPost.paths['/PostTest'].post) { throw new Error('PostTest post method not defined.'); }

        const method = specPost.paths['/PostTest'].post;

        if (!method || !method.parameters) { throw new Error('Parameters not defined.'); }

        expect(method.parameters).to.deep.equal([]);

        if (!method.requestBody) { throw new Error('Request body not defined.'); }

        expect(method.requestBody.content['application/json'].schema).to.deep.equal({
          '$ref': '#/components/schemas/TestModel'
        });
      });
    });
  });

  describe('components', () => {
    describe('schemas', () => {
      it('should replace definitions with schemas', () => {
        if (!spec.components.schemas) { throw new Error('Schemas not defined.'); }

        expect(spec).to.not.have.property('definitions');
        expect(spec.components.schemas.TestModel).to.exist;
      });

      it('should replace x-nullable with nullable', () => {
        if (!spec.components.schemas) { throw new Error('Schemas not defined.'); }
        if (!spec.components.schemas.TestModel) { throw new Error('TestModel not defined.'); }

        const testModel = spec.components.schemas.TestModel;

        expect(testModel.properties.optionalString).to.not.have.property('x-nullable');
        expect(testModel.properties.optionalString.nullable).to.be.true;
      });
    });
  });
});
