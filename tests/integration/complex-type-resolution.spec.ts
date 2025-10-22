import { expect } from 'chai';
import 'mocha';
import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { SpecGenerator3 } from '@tsoa/cli/swagger/specGenerator3';
import { Swagger } from '@tsoa/runtime';
import { getDefaultOptions } from '../fixtures/defaultOptions';
import { ExtendedSpecConfig } from '@tsoa/cli/cli';

describe('Complex Type Resolution Integration Tests', () => {
  const metadata = new MetadataGenerator('./fixtures/controllers/complexTypeController.ts').Generate();
  const defaultConfig = getDefaultOptions();
  const defaultOptions: ExtendedSpecConfig = {
    ...defaultConfig.spec,
    noImplicitAdditionalProperties: 'ignore',
    entryFile: defaultConfig.entryFile,
  };

  const spec: Swagger.Spec3 = new SpecGenerator3(metadata, defaultOptions).GetSpec();

  describe('Zod z.infer types', () => {
    it('should generate correct OpenAPI spec for @Body with z.infer<UserSchema>', () => {
      const path = spec.paths['/ComplexType/ZodUserBody'];
      expect(path).to.exist;
      expect(path.post).to.exist;

      const operation = path.post!;
      expect(operation.requestBody).to.exist;
      expect(operation.requestBody!.content).to.exist;
      expect(operation.requestBody!.content['application/json']).to.exist;

      // Check that the request body schema is properly resolved
      const requestBodySchema = operation.requestBody!.content['application/json'].schema as Swagger.Schema3;
      expect(requestBodySchema).to.exist;

      // Should be either a reference to a component or an inline object
      if (requestBodySchema.$ref) {
        expect(requestBodySchema.$ref).to.match(/^#\/components\/schemas\//);

        // Check that the referenced schema exists
        const schemaName = requestBodySchema.$ref.replace('#/components/schemas/', '');
        const componentSchema = spec.components?.schemas?.[schemaName];
        expect(componentSchema).to.exist;
        expect(componentSchema?.type).to.equal('object');
        expect(componentSchema?.properties).to.exist;

        // Check for expected properties from UserSchema
        const properties = componentSchema?.properties;
        expect(properties).to.have.property('id');
        expect(properties).to.have.property('name');
        expect(properties).to.have.property('email');
        expect(properties).to.have.property('age');
        expect(properties).to.have.property('isActive');
        expect(properties).to.have.property('tags');
        expect(properties).to.have.property('metadata');
      } else {
        // Inline object schema
        expect(requestBodySchema.type).to.equal('object');
        expect(requestBodySchema.properties).to.exist;

        const properties = requestBodySchema.properties;
        expect(properties).to.have.property('id');
        expect(properties).to.have.property('name');
        expect(properties).to.have.property('email');
        expect(properties).to.have.property('age');
        expect(properties).to.have.property('isActive');
        expect(properties).to.have.property('tags');
        expect(properties).to.have.property('metadata');
      }
    });

    it('should generate correct OpenAPI spec for @Body with z.infer<ProductSchema>', () => {
      const path = spec.paths['/ComplexType/ZodProductBody'];
      expect(path).to.exist;
      expect(path.post).to.exist;

      const operation = path.post!;
      expect(operation.requestBody).to.exist;
      expect(operation.requestBody!.content).to.exist;
      expect(operation.requestBody!.content['application/json']).to.exist;

      // Check that the request body schema is properly resolved
      const requestBodySchema = operation.requestBody!.content['application/json'].schema as Swagger.Schema3;
      expect(requestBodySchema).to.exist;

      if (requestBodySchema.$ref) {
        const schemaName = requestBodySchema.$ref.replace('#/components/schemas/', '');
        const componentSchema = spec.components?.schemas?.[schemaName];
        expect(componentSchema).to.exist;
        expect(componentSchema?.type).to.equal('object');
        expect(componentSchema?.properties).to.exist;

        // Check for expected properties from ProductSchema
        const properties = componentSchema?.properties;
        expect(properties).to.have.property('id');
        expect(properties).to.have.property('title');
        expect(properties).to.have.property('price');
        expect(properties).to.have.property('category');
        expect(properties).to.have.property('inStock');
        expect(properties).to.have.property('specifications');
      } else {
        expect(requestBodySchema.type).to.equal('object');
        expect(requestBodySchema.properties).to.exist;

        const properties = requestBodySchema.properties;
        expect(properties).to.have.property('id');
        expect(properties).to.have.property('title');
        expect(properties).to.have.property('price');
        expect(properties).to.have.property('category');
        expect(properties).to.have.property('inStock');
        expect(properties).to.have.property('specifications');
      }
    });

    it('should generate correct OpenAPI spec for @Body with z.infer types', () => {
      const path = spec.paths['/ComplexType/ZodUserBody'];
      expect(path).to.exist;
      expect(path.post).to.exist;

      const operation = path.post!;
      expect(operation.requestBody).to.exist;
      expect(operation.requestBody!.content).to.exist;
      expect(operation.requestBody!.content['application/json']).to.exist;
    });
  });

  describe('Generic types', () => {
    it('should generate correct OpenAPI spec for @Body with GenericWrapper', () => {
      const path = spec.paths['/ComplexType/SimpleGenericBody'];
      expect(path).to.exist;
      expect(path.post).to.exist;

      const operation = path.post!;
      expect(operation.requestBody).to.exist;
      expect(operation.requestBody!.content).to.exist;
      expect(operation.requestBody!.content['application/json']).to.exist;
    });

    it('should generate correct OpenAPI spec for @Body with interface generic', () => {
      const path = spec.paths['/ComplexType/InterfaceGenericBody'];
      expect(path).to.exist;
      expect(path.post).to.exist;

      const operation = path.post!;
      expect(operation.requestBody).to.exist;
      expect(operation.requestBody!.content).to.exist;
      expect(operation.requestBody!.content['application/json']).to.exist;
    });
  });

  describe('Simple query parameters', () => {
    it('should generate correct OpenAPI spec for @Query with simple types', () => {
      const path = spec.paths['/ComplexType/SimpleQuery'];
      expect(path).to.exist;
      expect(path.get).to.exist;

      const operation = path.get!;
      expect(operation.parameters).to.be.an('array');
      expect(operation.parameters!.length).to.be.greaterThan(0);

      // Check that all parameters are query parameters
      operation.parameters!.forEach(parameter => {
        expect(parameter.in).to.equal('query');
      });
    });

    it('should generate correct OpenAPI spec for @Query with union types', () => {
      const path = spec.paths['/ComplexType/UnionQuery'];
      expect(path).to.exist;
      expect(path.get).to.exist;

      const operation = path.get!;
      expect(operation.parameters).to.be.an('array');
      expect(operation.parameters).to.have.length(1);

      const parameter = operation.parameters![0];
      expect(parameter.in).to.equal('query');
      expect(parameter.name).to.equal('status');
    });

    it('should generate correct OpenAPI spec for @Query with enum types', () => {
      const path = spec.paths['/ComplexType/EnumQuery'];
      expect(path).to.exist;
      expect(path.get).to.exist;

      const operation = path.get!;
      expect(operation.parameters).to.be.an('array');
      expect(operation.parameters).to.have.length(1);

      const parameter = operation.parameters![0];
      expect(parameter.in).to.equal('query');
      expect(parameter.name).to.equal('priority');
    });
  });

  describe('Error handling', () => {
    it('should not crash when processing complex types', () => {
      // This test passes if the metadata generation completes without throwing
      expect(metadata).to.exist;
      expect(metadata.controllers).to.be.an('array');
      expect(metadata.controllers.length).to.be.greaterThan(0);
    });

    it('should generate valid OpenAPI spec for all complex types', () => {
      // This test passes if the spec generation completes without throwing
      expect(spec).to.exist;
      expect(spec.openapi).to.exist;
      expect(spec.paths).to.exist;
    });
  });

  describe('Pagination queries', () => {
    it('should generate correct OpenAPI spec for @Queries with pagination schema', () => {
      const path = spec.paths['/ComplexType/PaginationQuery'];
      expect(path).to.exist;
      expect(path.get).to.exist;

      const operation = path.get!;
      expect(operation.parameters).to.be.an('array');
      expect(operation.parameters!.length).to.be.greaterThan(0);

      // Check that all parameters are query parameters
      operation.parameters!.forEach(parameter => {
        expect(parameter.in).to.equal('query');
      });

      // Check for expected pagination parameters
      const paramNames = operation.parameters!.map(p => p.name);
      expect(paramNames).to.include('page');
      expect(paramNames).to.include('limit');
      expect(paramNames).to.include('sortBy');
      expect(paramNames).to.include('sortOrder');
    });
  });

  describe('Discriminated union types', () => {
    it('should generate correct OpenAPI spec for @Body with discriminated union', () => {
      const path = spec.paths['/ComplexType/DiscriminatedUnionBody'];
      expect(path).to.exist;
      expect(path.post).to.exist;

      const operation = path.post!;
      expect(operation.requestBody).to.exist;
      expect(operation.requestBody!.content).to.exist;
      expect(operation.requestBody!.content['application/json']).to.exist;

      const requestBodySchema = operation.requestBody!.content['application/json'].schema as Swagger.Schema3;
      expect(requestBodySchema).to.exist;

      // Check that it's a discriminated union (oneOf with discriminator)
      if ((requestBodySchema as any).oneOf) {
        expect((requestBodySchema as any).oneOf).to.be.an('array');
        expect((requestBodySchema as any).oneOf.length).to.be.greaterThan(1);
        expect((requestBodySchema as any).discriminator).to.exist;
        expect((requestBodySchema as any).discriminator.propertyName).to.equal('type');
      }
    });

    it('should generate correct OpenAPI spec for @Body with user created event', () => {
      const path = spec.paths['/ComplexType/UserCreatedEventBody'];
      expect(path).to.exist;
      expect(path.post).to.exist;

      const operation = path.post!;
      expect(operation.requestBody).to.exist;
      expect(operation.requestBody!.content).to.exist;
      expect(operation.requestBody!.content['application/json']).to.exist;

      const requestBodySchema = operation.requestBody!.content['application/json'].schema as Swagger.Schema3;
      expect(requestBodySchema).to.exist;

      if (requestBodySchema.$ref) {
        const schemaName = requestBodySchema.$ref.replace('#/components/schemas/', '');
        const componentSchema = spec.components?.schemas?.[schemaName];
        expect(componentSchema).to.exist;
        expect(componentSchema?.type).to.equal('object');
        expect(componentSchema?.properties).to.exist;

        const properties = componentSchema?.properties;
        expect(properties).to.have.property('type');
        expect(properties).to.have.property('userId');
        expect(properties).to.have.property('email');
        expect(properties).to.have.property('createdAt');
      }
    });

    it('should generate correct OpenAPI spec for @Body with user updated event', () => {
      const path = spec.paths['/ComplexType/UserUpdatedEventBody'];
      expect(path).to.exist;
      expect(path.post).to.exist;

      const operation = path.post!;
      expect(operation.requestBody).to.exist;
      expect(operation.requestBody!.content).to.exist;
      expect(operation.requestBody!.content['application/json']).to.exist;

      const requestBodySchema = operation.requestBody!.content['application/json'].schema as Swagger.Schema3;
      expect(requestBodySchema).to.exist;

      if (requestBodySchema.$ref) {
        const schemaName = requestBodySchema.$ref.replace('#/components/schemas/', '');
        const componentSchema = spec.components?.schemas?.[schemaName];
        expect(componentSchema).to.exist;
        expect(componentSchema?.type).to.equal('object');
        expect(componentSchema?.properties).to.exist;

        const properties = componentSchema?.properties;
        expect(properties).to.have.property('type');
        expect(properties).to.have.property('userId');
        expect(properties).to.have.property('changes');
        expect(properties).to.have.property('updatedAt');
      }
    });

    it('should generate correct OpenAPI spec for @Body with user deleted event', () => {
      const path = spec.paths['/ComplexType/UserDeletedEventBody'];
      expect(path).to.exist;
      expect(path.post).to.exist;

      const operation = path.post!;
      expect(operation.requestBody).to.exist;
      expect(operation.requestBody!.content).to.exist;
      expect(operation.requestBody!.content['application/json']).to.exist;

      const requestBodySchema = operation.requestBody!.content['application/json'].schema as Swagger.Schema3;
      expect(requestBodySchema).to.exist;

      if (requestBodySchema.$ref) {
        const schemaName = requestBodySchema.$ref.replace('#/components/schemas/', '');
        const componentSchema = spec.components?.schemas?.[schemaName];
        expect(componentSchema).to.exist;
        expect(componentSchema?.type).to.equal('object');
        expect(componentSchema?.properties).to.exist;

        const properties = componentSchema?.properties;
        expect(properties).to.have.property('type');
        expect(properties).to.have.property('userId');
        expect(properties).to.have.property('deletedAt');
        expect(properties).to.have.property('reason');
      }
    });
  });

  describe('Schema validation', () => {
    it('should generate valid JSON schemas for complex types', () => {
      // Check that the spec has valid structure
      expect(spec).to.exist;
      expect(spec.openapi).to.exist;
      expect(spec.paths).to.exist;
      expect(spec.components).to.exist;
      expect(spec.components.schemas).to.exist;
    });
  });
});
