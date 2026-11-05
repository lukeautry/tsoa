import { ExtendedSpecConfig } from '@tsoa/cli/cli';
import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { SpecGenerator2 } from '@tsoa/cli/swagger/specGenerator2';
import { SpecGenerator3 } from '@tsoa/cli/swagger/specGenerator3';
import { SpecGenerator31 } from '@tsoa/cli/swagger/specGenerator31';
import { DefaultRouteGenerator } from '@tsoa/cli/routeGeneration/defaultRouteGenerator';
import { FieldErrors, Swagger, Tsoa, TsoaRoute, ValidationService } from '@tsoa/runtime';
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

        const expectOneOfOnKind = (name: string, mapping: Record<string, string>) => {
          const unionSchema = currentSpec.spec.components?.schemas?.[name] as Swagger.Schema3;
          expect(unionSchema, `expected component schema "${name}" to exist`).to.exist;
          expect(unionSchema.anyOf).to.not.exist;
          expect(unionSchema.oneOf).to.deep.equal(Object.values(mapping).map($ref => ({ $ref })));
          expect(unionSchema.discriminator).to.deep.equal({ propertyName: 'kind', mapping });
        };

        it('should generate oneOf + discriminator when classes implement interfaces that declare the tag', () => {
          expectOneOfOnKind('ImplementedTagUnion', {
            'implemented-first': '#/components/schemas/ImplementedTagFirst',
            'implemented-second': '#/components/schemas/ImplementedTagSecond',
          });
        });

        it('should generate oneOf + discriminator when a member declares an inherited tag again', () => {
          expectOneOfOnKind('RedeclaredTagUnion', {
            redeclared: '#/components/schemas/RedeclaredTagChild',
            sibling: '#/components/schemas/RedeclaredTagSibling',
          });
        });

        it('should generate oneOf + discriminator for a union of aliases of inline object types', () => {
          expectOneOfOnKind('AliasedTagUnion', {
            first: '#/components/schemas/AliasedTagFirst',
            second: '#/components/schemas/AliasedTagSecond',
          });
        });

        it('should keep the nullable $ref for a single tagged type that can be null', () => {
          const path = currentSpec.spec.paths['/ComplexType/NullableSingleTagBody'];
          expect(path).to.exist;
          expect(path.post).to.exist;

          expect(path.post!.requestBody!.content['application/json'].schema).to.deep.equal({
            allOf: [{ $ref: '#/components/schemas/SingleTagBlock' }],
            nullable: true,
          });
        });

        describe('unions whose tag cannot discriminate', () => {
          const expectAnyOfWithoutDiscriminator = (name: string, memberCount: number) => {
            const unionSchema = currentSpec.spec.components?.schemas?.[name] as Swagger.Schema3;
            expect(unionSchema, `expected component schema "${name}" to exist`).to.exist;
            expect(unionSchema.oneOf).to.not.exist;
            expect(unionSchema.discriminator).to.not.exist;
            expect(unionSchema.anyOf).to.be.an('array').with.length(memberCount);
          };

          it('should keep anyOf when the shared tag has a default', () => {
            expect(currentSpec.spec.components?.schemas?.DefaultedTagFirst.required).to.not.exist;
            expect(currentSpec.spec.components?.schemas?.DefaultedTagSecond.required).to.not.exist;
            expectAnyOfWithoutDiscriminator('DefaultedTagUnion', 2);
          });

          it('should keep anyOf when the tag is optional on one member', () => {
            expect(currentSpec.spec.components?.schemas?.RequiredTagBlock.required).to.deep.equal(['kind', 'requiredValue']);
            expect(currentSpec.spec.components?.schemas?.OptionalTagBlock.required).to.deep.equal(['optionalValue']);
            expectAnyOfWithoutDiscriminator('OptionalTagUnion', 2);
          });

          it('should keep anyOf when tag values overlap between members', () => {
            expectAnyOfWithoutDiscriminator('OverlappingTagUnion', 2);
          });

          it('should keep anyOf when a member has no schema of its own', () => {
            expectAnyOfWithoutDiscriminator('MixedMemberUnion', 2);
          });

          it('should keep anyOf when a member overrides the inherited tag with an unconstrained type', () => {
            const kind = currentSpec.spec.components?.schemas?.UnconstrainedTagChild.properties?.kind;
            expect(kind).to.exist;
            expect(kind!.enum).to.not.exist;
            expectAnyOfWithoutDiscriminator('UnconstrainedTagUnion', 2);
          });

          it('should keep anyOf when two properties could both discriminate', () => {
            expectAnyOfWithoutDiscriminator('AmbiguousTagUnion', 2);
          });

          it('should keep anyOf when the tag property is named "__proto__"', () => {
            expectAnyOfWithoutDiscriminator('PrototypeNamedTagUnion', 2);
          });
        });

        it('should list tag values such as "__proto__" and "constructor" as mapping keys', () => {
          const unionSchema = currentSpec.spec.components?.schemas?.SpecialTagUnion as Swagger.Schema3;
          expect(unionSchema, 'expected component schema "SpecialTagUnion" to exist').to.exist;
          expect(unionSchema.oneOf).to.deep.equal([
            { $ref: '#/components/schemas/PrototypeTagBlock' },
            { $ref: '#/components/schemas/ConstructorTagBlock' },
            { $ref: '#/components/schemas/PlainTagBlock' },
          ]);
          expect(unionSchema.discriminator?.propertyName).to.equal('kind');
          expect(Object.entries(unionSchema.discriminator!.mapping!)).to.deep.equal([
            ['__proto__', '#/components/schemas/PrototypeTagBlock'],
            ['constructor', '#/components/schemas/ConstructorTagBlock'],
            ['plain', '#/components/schemas/PlainTagBlock'],
          ]);
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

      describe('Types the type checker evaluates', () => {
        const schemas = () => currentSpec.spec.components.schemas!;
        // Drops undefined-valued keys so schemas can be compared deeply.
        const resolve = (schema: unknown): Swagger.Schema3 => {
          const { $ref } = (schema ?? {}) as Swagger.Schema3;
          return $ref ? resolve(schemas()[$ref.replace('#/components/schemas/', '')]) : (JSON.parse(JSON.stringify(schema)) as Swagger.Schema3);
        };
        const response = (path: string) => currentSpec.spec.paths[`/ComplexType/Checked/${path}`].get!.responses['200'].content!['application/json'].schema as Swagger.Schema3;

        it('should resolve typeof a const object', () => {
          const config = resolve(response('TypeofConst'));
          expect(config.properties?.mode).to.deep.include({ type: 'string', enum: ['a'] });
          expect(config.properties?.retries).to.deep.include({ type: 'number', enum: [3] });
        });

        it('should resolve indexed access by an enum member', () => {
          expect(resolve(response('IndexedByEnum'))).to.deep.include({ type: 'object', properties: { foo: { type: 'string' } }, required: ['foo'] });
        });

        it('should evaluate intrinsic string types', () => {
          const shout = resolve(resolve(response('Intrinsic')).properties?.value);
          expect(shout.type).to.equal('string');
          expect(shout.enum).to.have.members(['ABC', 'DEF']);
        });

        it('should resolve template literal types with an open part to string', () => {
          expect(resolve(resolve(response('TemplateLiteral')).properties?.id)).to.deep.equal({ type: 'string' });
        });

        it('should evaluate Exclude over a discriminated union', () => {
          const members = resolve(response('Exclude')).anyOf!.map(resolve);
          expect(members.map(member => member.properties?.type)).to.deep.equal([
            { type: 'string', enum: ['a'], nullable: false },
            { type: 'string', enum: ['b'], nullable: false },
          ]);
        });

        it('should resolve the keys and values of a const object', () => {
          const { role, value } = resolve(response('KeysAndValues')).properties!;
          expect(resolve(role)).to.deep.include({ type: 'string', enum: ['admin', 'user'] });
          expect(resolve(value)).to.deep.include({ type: 'number', enum: [1, 2] });
        });

        it('should keep validators of aliased property types through Omit', () => {
          expect(resolve(response('Omit')).properties?.id).to.deep.equal({ $ref: '#/components/schemas/UUID' });
          expect(resolve(schemas().UUID)).to.deep.equal({ type: 'string', pattern: '^[0-9a-f-]{36}$' });
        });

        it('should instantiate utility types inside generic aliases', () => {
          const [partial, required] = resolve(response('OnlyRequire')).allOf!.map(resolve);
          expect(partial.properties).to.have.all.keys('id', 'name', 'age');
          expect(partial.required).to.equal(undefined);
          expect(required.properties).to.have.all.keys('id');
          expect(required.required).to.deep.equal(['id']);
        });

        it('should remap keys with `as`', () => {
          expect(resolve(response('Getters'))).to.deep.include({ required: ['getId', 'getAge'] });
        });

        it('should include inherited properties of models that reference each other', () => {
          const item = resolve(response('Tree'));
          expect(item.properties).to.have.all.keys('items', 'name');
          expect(item.properties?.items).to.deep.equal({ type: 'array', items: { $ref: '#/components/schemas/TreeItem' } });
        });

        it('should resolve z.input and z.output, aliased or written inline', () => {
          const operation = currentSpec.spec.paths['/ComplexType/Checked/ZodInputOutput'].post!;
          const input = resolve(operation.requestBody!.content['application/json'].schema);
          const output = resolve(operation.responses['200'].content!['application/json'].schema);
          expect(input.properties).to.have.all.keys('email', 'plan');
          expect(input.required).to.deep.equal(['email']);
          expect(output.properties).to.have.all.keys('email', 'plan');
          expect(output.required).to.have.members(['email', 'plan']);

          const inline = currentSpec.spec.paths['/ComplexType/Checked/ZodInputInline'].post!.requestBody!.content['application/json'].schema;
          expect(resolve(inline)).to.deep.equal(input);
        });

        it('should take the own properties of each generic base once, in heritage order', () => {
          const bases = resolve(response('GenericBases')).properties!;
          const expected = {
            patchFirst: ['patch', 'base', 'own'],
            patchLast: ['base', 'patch', 'own'],
            mappedFirst: ['held', 'base', 'own'],
            mappedLast: ['base', 'held', 'own'],
          };
          for (const [name, order] of Object.entries(expected)) {
            const model = resolve(bases[name]);
            expect(Object.keys(model.properties!), name).to.deep.equal(order);
            expect(model.properties?.base.description, name).to.equal('Declared by the base');
          }
          expect(resolve(bases.patchFirst).properties?.patch).to.deep.equal({ $ref: '#/components/schemas/Profile', description: 'The patched value' });
          expect(resolve(bases.patchLast).properties?.patch).to.deep.equal(resolve(bases.patchFirst).properties?.patch);
        });

        it('should give each template literal type argument its own name', () => {
          const { user, org, numbered } = resolve(response('GenericNames')).properties!;
          expect([user.$ref, org.$ref, numbered.$ref]).to.deep.equal([
            '#/components/schemas/Labeled_user__string__',
            '#/components/schemas/Labeled_org__string__',
            '#/components/schemas/Labeled_user__number__',
          ]);
          expect(resolve(user).properties?.value).to.deep.equal({ type: 'string' });
        });

        it('should publish a heritage base that the model refers to, and only then', () => {
          const operation = currentSpec.spec.paths['/ComplexType/Checked/RecursiveBase'].post!;
          const node = resolve(operation.requestBody!.content['application/json'].schema);
          expect(node.properties?.children).to.deep.equal({ type: 'array', items: { $ref: '#/components/schemas/TreeNodeBase' } });
          expect(resolve(schemas().TreeNodeBase).properties?.children).to.deep.equal({ type: 'array', items: { $ref: '#/components/schemas/TreeNodeBase' } });

          expect(resolve(operation.responses['200'].content!['application/json'].schema).properties).to.have.all.keys('plain', 'extra');
          expect(schemas()).to.not.have.property('PlainBase');
        });

        it('should keep the alias and validators of a generic union member', () => {
          const body = currentSpec.spec.paths['/ComplexType/Checked/AliasInGenericUnion'].post!.requestBody!.content['application/json'].schema;
          expect(resolve(body).properties?.value.anyOf).to.deep.equal([{ $ref: '#/components/schemas/Nullable_Identifier_' }, { type: 'number', format: 'double' }]);
          expect(resolve(schemas().Nullable_Identifier_)).to.deep.equal({ allOf: [{ $ref: '#/components/schemas/Identifier' }], nullable: true });
          expect(resolve(schemas().Identifier)).to.deep.equal({ type: 'string', pattern: '^x' });

          const strict = new MetadataGenerator('./fixtures/controllers/complexTypeController.ts', { strict: true }).Generate();
          const nullable = strict.referenceTypeMap.Nullable_Identifier_ as Tsoa.RefAliasType;
          expect(JSON.parse(JSON.stringify(nullable.type))).to.deep.equal({
            dataType: 'union',
            types: [
              { dataType: 'refAlias', refName: 'Identifier', type: { dataType: 'string' }, validators: { pattern: { value: '^x' } }, deprecated: false },
              { dataType: 'enum', enums: [null] },
            ],
          });
        });

        describe('unions and recursion validated through the generated route models', () => {
          const models = new DefaultRouteGenerator(metadata, {
            entryFile: defaultConfig.entryFile,
            routesDir: './fixtures',
            noImplicitAdditionalProperties: 'ignore',
            bodyCoercion: false,
          }).buildModels();
          const validate = (schema: TsoaRoute.PropertySchema, value: unknown) => {
            const errors: FieldErrors = {};
            // Without coercion, which would wrap a non-array value in an array and retry.
            new ValidationService(models, { bodyCoercion: false, noImplicitAdditionalProperties: 'ignore' }).ValidateParam({ ...schema, required: true }, value, 'body', errors, true);
            return Object.keys(errors).length === 0;
          };

          it('should keep annotated alternatives whose types the checker collapses', () => {
            const body = currentSpec.spec.paths['/ComplexType/Checked/AnnotatedAlternatives'].post!.requestBody!.content['application/json'].schema;
            expect(body).to.deep.equal({ anyOf: [{ $ref: '#/components/schemas/Identifier' }, { $ref: '#/components/schemas/OtherIdentifier' }] });
            const either: TsoaRoute.PropertySchema = { dataType: 'union', subSchemas: [{ ref: 'Identifier' }, { ref: 'OtherIdentifier' }] };
            expect(validate(either, 'xenon')).to.equal(true);
            expect(validate(either, 'yellow')).to.equal(true);
            expect(validate(either, 'zinc')).to.equal(false);
          });

          it('should keep the written element of a generic array union', () => {
            expect(resolve(schemas().ArrayUnionBox_Identifier_).properties?.value.anyOf?.[0]).to.deep.equal({ type: 'array', items: { $ref: '#/components/schemas/Identifier' } });
            expect(validate({ ref: 'ArrayUnionBox_Identifier_' }, { value: ['xenon'] })).to.equal(true);
            expect(validate({ ref: 'ArrayUnionBox_Identifier_' }, { value: ['yellow'] })).to.equal(false);
            expect(validate({ ref: 'NullableArrayBox_string_' }, { value: [null, 'a'] })).to.equal(true);
          });

          it('should resolve a generic alias that refers to itself', () => {
            expect(resolve(schemas().RecursiveTree_string_)).to.deep.equal({ anyOf: [{ type: 'string' }, { type: 'array', items: { $ref: '#/components/schemas/RecursiveTree_string_' } }] });
            expect(resolve(schemas().RecursiveGenericTree_number_).anyOf?.[1]).to.deep.equal({ type: 'array', items: { $ref: '#/components/schemas/RecursiveGenericTree_number_' } });
            expect(validate({ ref: 'RecursiveTree_string_' }, ['a', ['b', ['c']]])).to.equal(true);
            expect(validate({ ref: 'RecursiveTree_string_' }, ['a', [{ b: 'c' }]])).to.equal(false);
          });
        });

        it('should use an optional toJSON, also under strictNullChecks', () => {
          expect(resolve(schemas().OptionalToJson)).to.deep.equal({ type: 'object', properties: { b: { type: 'number', format: 'double' } }, required: ['b'] });
          const strict = new MetadataGenerator('./fixtures/controllers/complexTypeController.ts', { strict: true }).Generate();
          expect(strict.referenceTypeMap.OptionalToJson).to.deep.include({ dataType: 'refAlias', refName: 'OptionalToJson' });
        });

        it('should resolve type parameter defaults that refer to earlier parameters', () => {
          const pair = resolve(response('DefaultTypeArguments'));
          expect(pair.properties).to.deep.equal({ first: { type: 'string' }, second: { type: 'string' } });
        });

        it('should name computed keys by their value and leave out symbol keys', () => {
          const model = resolve(response('ComputedKeys'));
          expect(model.properties).to.have.all.keys('fromConst', 'literal-key', 'id');
          expect(model.required).to.have.members(['fromConst', 'literal-key', 'id']);
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

describe('Discriminated unions in other OpenAPI versions', () => {
  const metadata = new MetadataGenerator('./fixtures/controllers/complexTypeController.ts').Generate();
  const defaultConfig = getDefaultOptions();
  const options: ExtendedSpecConfig = {
    ...defaultConfig.spec,
    noImplicitAdditionalProperties: 'ignore',
    entryFile: defaultConfig.entryFile,
  };

  it('should generate oneOf + discriminator for OpenAPI 3.1.0', () => {
    const contentBlockSchema = new SpecGenerator31(metadata, options).GetSpec().components?.schemas?.['ContentBlock'];
    expect(contentBlockSchema, 'expected component schema "ContentBlock" to exist').to.exist;
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

  it('should not generate oneOf or discriminator for OpenAPI 2.0', () => {
    const swagger2 = new SpecGenerator2(metadata, options).GetSpec();
    expect(swagger2.definitions?.['ContentBlock'], 'expected definition "ContentBlock" to exist').to.exist;
    expect(JSON.stringify(swagger2)).to.not.match(/"(oneOf|discriminator)"/);
  });
});
