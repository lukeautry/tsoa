import { ExtendedSpecConfig } from '@tsoa/cli/cli';
import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { SpecGenerator3 } from '@tsoa/cli/swagger/specGenerator3';
import { Swagger } from '@tsoa/runtime';
import { expect } from 'chai';
import 'mocha';
import { getDefaultOptions } from '../../fixtures/defaultOptions';

describe('Complex Type Resolution for OpenAPI 3.0.0', () => {
  const metadata = new MetadataGenerator('./fixtures/controllers/complexTypeController.ts').Generate();
  const defaultConfig = getDefaultOptions();
  const defaultOptions: ExtendedSpecConfig = {
    ...defaultConfig.spec,
    noImplicitAdditionalProperties: 'ignore',
    entryFile: defaultConfig.entryFile,
  };

  interface SpecAndName {
    spec: Swagger.Spec3;
    specName: 'specDefault';
  }

  const specDefault: SpecAndName = {
    spec: new SpecGenerator3(metadata, defaultOptions).GetSpec(),
    specName: 'specDefault',
  };

  const allSpecs: SpecAndName[] = [specDefault];

  function forSpec(chosenSpec: SpecAndName): string {
    return `for the ${chosenSpec.specName} spec`;
  }

  allSpecs.forEach(currentSpec => {
    describe(`for ${currentSpec.specName}`, () => {
      describe('Zod z.infer types', () => {
        it('should generate correct OpenAPI spec for @Body with z.infer<UserSchema>', () => {
          const path = currentSpec.spec.paths['/ComplexType/ZodUserBody'];
          expect(path).to.exist;
          expect(path.post).to.exist;

          const operation = path.post!;
          expect(operation.requestBody).to.exist;
          expect(operation.requestBody!.content).to.exist;
          expect(operation.requestBody!.content['application/json']).to.exist;

          const requestBodySchema = operation.requestBody!.content['application/json'].schema as Swagger.Schema3;
          expect(requestBodySchema).to.exist;

          // Should be either a reference to a component or an inline object
          if (requestBodySchema.$ref) {
            expect(requestBodySchema.$ref).to.match(/^#\/components\/schemas\//);

            const schemaName = requestBodySchema.$ref.replace('#/components/schemas/', '');
            const componentSchema = currentSpec.spec.components?.schemas?.[schemaName];
            expect(componentSchema).to.exist;
            expect(componentSchema?.type).to.equal('object');
            expect(componentSchema?.properties).to.exist;

            const properties = componentSchema?.properties;
            expect(properties).to.have.property('id');
            expect(properties).to.have.property('name');
            expect(properties).to.have.property('email');
            expect(properties).to.have.property('age');
            expect(properties).to.have.property('isActive');
            expect(properties).to.have.property('tags');
            expect(properties).to.have.property('metadata');
          } else {
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
          const path = currentSpec.spec.paths['/ComplexType/ZodProductBody'];
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
            const componentSchema = currentSpec.spec.components?.schemas?.[schemaName];
            expect(componentSchema).to.exist;
            expect(componentSchema?.type).to.equal('object');
            expect(componentSchema?.properties).to.exist;

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
      });

      describe('Generic types', () => {
        it('should generate correct OpenAPI spec for @Body with GenericWrapper', () => {
          const path = currentSpec.spec.paths['/ComplexType/SimpleGenericBody'];
          expect(path).to.exist;
          expect(path.post).to.exist;

          const operation = path.post!;
          expect(operation.requestBody).to.exist;
          expect(operation.requestBody!.content).to.exist;
          expect(operation.requestBody!.content['application/json']).to.exist;
        });

        it('should generate correct OpenAPI spec for @Body with interface generic', () => {
          const path = currentSpec.spec.paths['/ComplexType/InterfaceGenericBody'];
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
          const path = currentSpec.spec.paths['/ComplexType/SimpleQuery'];
          expect(path).to.exist;
          expect(path.get).to.exist;

          const operation = path.get!;
          expect(operation.parameters).to.be.an('array');
          expect(operation.parameters!.length).to.be.greaterThan(0);

          operation.parameters!.forEach(parameter => {
            expect(parameter.in).to.equal('query');
          });
        });

        it('should generate correct OpenAPI spec for @Query with union types', () => {
          const path = currentSpec.spec.paths['/ComplexType/UnionQuery'];
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
          const path = currentSpec.spec.paths['/ComplexType/EnumQuery'];
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

      describe('Pagination queries', () => {
        it('should generate correct OpenAPI spec for @Queries with pagination schema', () => {
          const path = currentSpec.spec.paths['/ComplexType/PaginationQuery'];
          expect(path).to.exist;
          expect(path.get).to.exist;

          const operation = path.get!;
          expect(operation.parameters).to.be.an('array');
          expect(operation.parameters!.length).to.be.greaterThan(0);

          operation.parameters!.forEach(parameter => {
            expect(parameter.in).to.equal('query');
          });

          const paramNames = operation.parameters!.map(p => p.name);
          expect(paramNames).to.include('page');
          expect(paramNames).to.include('limit');
          expect(paramNames).to.include('sortBy');
          expect(paramNames).to.include('sortOrder');
        });
      });

      describe('Discriminated union types', () => {
        it('should NOT generate oneOf/discriminator for a union whose members are inline object literals (not $ref-able)', () => {
          // UserEvent's members are inline nestedObjectLiteral types (no separate declaration of
          // their own), so they aren't $ref-able and must keep using anyOf.
          const path = currentSpec.spec.paths['/ComplexType/DiscriminatedUnionBody'];
          expect(path).to.exist;
          expect(path.post).to.exist;

          const operation = path.post!;
          let schema = operation.requestBody!.content['application/json'].schema as Swagger.Schema3 | Swagger.Schema31;
          expect(schema).to.exist;

          // UserEvent is itself a refAlias to another refAlias, so follow every $ref hop until we
          // reach the actual union schema.
          while (schema.$ref) {
            const schemaName = schema.$ref.replace('#/components/schemas/', '');
            const nextSchema = currentSpec.spec.components?.schemas?.[schemaName];
            expect(nextSchema, `expected component schema "${schemaName}" to exist`).to.exist;
            schema = nextSchema!;
          }

          expect(schema.oneOf).to.not.exist;
          expect(schema.discriminator).to.not.exist;
          expect(schema.anyOf).to.be.an('array').with.length(3);
        });

        it('should generate oneOf + discriminator for a union of named interfaces sharing a literal discriminant property', () => {
          const path = currentSpec.spec.paths['/ComplexType/ContentBlockBody'];
          expect(path).to.exist;
          expect(path.post).to.exist;

          const operation = path.post!;
          const requestBodySchema = operation.requestBody!.content['application/json'].schema as Swagger.Schema3;
          expect(requestBodySchema).to.exist;
          expect(requestBodySchema.$ref).to.equal('#/components/schemas/ContentBlock');

          const contentBlockSchema = currentSpec.spec.components?.schemas?.['ContentBlock'];
          expect(contentBlockSchema).to.exist;
          expect(contentBlockSchema!.anyOf).to.not.exist;
          expect(contentBlockSchema!.oneOf).to.deep.equal([
            { $ref: '#/components/schemas/TextContentBlock' },
            { $ref: '#/components/schemas/ImageContentBlock' },
            { $ref: '#/components/schemas/CarouselContentBlock' },
          ]);
          expect(contentBlockSchema!.discriminator).to.deep.equal({
            propertyName: 'type',
            mapping: {
              TEXT: '#/components/schemas/TextContentBlock',
              IMAGE: '#/components/schemas/ImageContentBlock',
              CAROUSEL: '#/components/schemas/CarouselContentBlock',
            },
          });
        });

        it('should generate oneOf + discriminator + nullable:true for a nullable discriminated union', () => {
          const path = currentSpec.spec.paths['/ComplexType/NullableContentBlockBody'];
          expect(path).to.exist;
          expect(path.post).to.exist;

          const requestBodySchema = path.post!.requestBody!.content['application/json'].schema as Swagger.Schema3;
          expect(requestBodySchema).to.exist;

          expect(requestBodySchema.anyOf).to.not.exist;
          expect(requestBodySchema.nullable).to.equal(true);
          expect(requestBodySchema.oneOf).to.deep.equal([
            { $ref: '#/components/schemas/TextContentBlock' },
            { $ref: '#/components/schemas/ImageContentBlock' },
            { $ref: '#/components/schemas/CarouselContentBlock' },
          ]);
          expect(requestBodySchema.discriminator).to.deep.equal({
            propertyName: 'type',
            mapping: {
              TEXT: '#/components/schemas/TextContentBlock',
              IMAGE: '#/components/schemas/ImageContentBlock',
              CAROUSEL: '#/components/schemas/CarouselContentBlock',
            },
          });
        });

        it('should generate correct OpenAPI spec for @Body with user created event', () => {
          const path = currentSpec.spec.paths['/ComplexType/UserCreatedEventBody'];
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
            const componentSchema = currentSpec.spec.components?.schemas?.[schemaName];
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
          const path = currentSpec.spec.paths['/ComplexType/UserUpdatedEventBody'];
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
            const componentSchema = currentSpec.spec.components?.schemas?.[schemaName];
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
          const path = currentSpec.spec.paths['/ComplexType/UserDeletedEventBody'];
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
            const componentSchema = currentSpec.spec.components?.schemas?.[schemaName];
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
          expect(currentSpec.spec).to.exist;
          expect(currentSpec.spec.openapi).to.exist;
          expect(currentSpec.spec.paths).to.exist;
          expect(currentSpec.spec.components).to.exist;
          expect(currentSpec.spec.components.schemas).to.exist;
        });
      });
    });
  });
});
