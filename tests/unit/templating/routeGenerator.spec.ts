import { expect } from 'chai';
import 'mocha';
import { Swagger, Tsoa, TsoaRoute } from '@tsoa/runtime';
import { SpecGenerator3 } from '@tsoa/cli/swagger/specGenerator3';
import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { DefaultRouteGenerator } from '@tsoa/cli/routeGeneration/defaultRouteGenerator';

describe('RouteGenerator', () => {
  describe('.buildModels', () => {
    it('should produce models where additionalProperties are not allowed unless explicitly stated', () => {
      // Arrange
      const stringType: Tsoa.Type = {
        dataType: 'string',
      };
      const refThatShouldNotAllowExtras = 'refThatShouldNotAllowExtras';
      const refWithExtraStrings = 'refWithExtraStrings';
      const generator = new DefaultRouteGenerator(
        {
          controllers: [],
          referenceTypeMap: {
            [refThatShouldNotAllowExtras]: {
              dataType: 'refObject',
              properties: [
                {
                  name: 'aStringOnTheObject',
                  required: true,
                  type: stringType,
                  validators: {},
                  deprecated: false,
                },
              ],
              refName: refThatShouldNotAllowExtras,
              deprecated: false,
            },
            [refWithExtraStrings]: {
              additionalProperties: stringType,
              dataType: 'refObject',
              properties: [],
              refName: refThatShouldNotAllowExtras,
              deprecated: false,
            },
          },
        },
        {
          bodyCoercion: true,
          entryFile: 'mockEntryFile',
          routesDir: 'mockRoutesDir',
          noImplicitAdditionalProperties: 'silently-remove-extras',
        },
      );

      // Act
      const models = generator.buildModels();

      // Assert
      const strictModel = models[refThatShouldNotAllowExtras];
      if (!strictModel) {
        throw new Error(`.buildModels should have created a model for ${refThatShouldNotAllowExtras}`);
      }
      if (strictModel.dataType !== 'refObject') {
        throw new Error(`Expected strictModel.dataType to be refObject`);
      }
      expect(strictModel.additionalProperties).to.equal(false);
      const stringDictionaryModel = models[refWithExtraStrings];
      if (!stringDictionaryModel) {
        throw new Error(`.buildModels should have created a model for ${refWithExtraStrings}`);
      }
      if (stringDictionaryModel.dataType !== 'refObject') {
        throw new Error(`.buildModels should have created a model for ${refThatShouldNotAllowExtras}`);
      }
      expect(stringDictionaryModel.additionalProperties).to.deep.equal({
        dataType: stringType.dataType,
      });
    });
  });

  describe('union discriminators', () => {
    const metadata = new MetadataGenerator('./fixtures/controllers/complexTypeController.ts').Generate();
    const generator = new DefaultRouteGenerator(metadata, {
      bodyCoercion: true,
      entryFile: 'mockEntryFile',
      routesDir: '.',
      noImplicitAdditionalProperties: 'silently-remove-extras',
    });
    const models = generator.buildModels();
    const context = generator['buildContext']();

    const aliasType = (name: string): TsoaRoute.PropertySchema => {
      const model = models[name];
      if (model?.dataType !== 'refAlias') {
        throw new Error(`Expected ${name} to be a refAlias model`);
      }
      return model.type;
    };

    it('maps the tag values of a discriminated union to its model names', () => {
      expect(aliasType('ContentBlock').discriminator).to.deep.equal({
        propertyName: 'type',
        mapping: { TEXT: 'TextContentBlock', IMAGE: 'ImageContentBlock', CAROUSEL: 'CarouselContentBlock' },
      });
    });

    it('detects the discriminator of a nullable union', () => {
      const action = context.controllers.flatMap(controller => controller.actions).find(a => a.name === 'postNullableContentBlockBody');
      expect(action?.parameters.body.discriminator).to.deep.equal({
        propertyName: 'type',
        mapping: { TEXT: 'TextContentBlock', IMAGE: 'ImageContentBlock', CAROUSEL: 'CarouselContentBlock' },
      });
    });

    for (const name of ['DefaultedTagUnion', 'OptionalTagUnion', 'OverlappingTagUnion', 'MixedMemberUnion', 'UnconstrainedTagUnion', 'PrototypeNamedTagUnion', 'AmbiguousTagUnion']) {
      it(`does not add a discriminator to ${name}`, () => {
        const type = aliasType(name);
        expect(type.dataType).to.equal('union');
        expect(type).to.not.have.property('discriminator');
      });
    }

    it('matches the discriminators of the generated spec', () => {
      const schemas = new SpecGenerator3(metadata, {
        entryFile: 'mockEntryFile',
        noImplicitAdditionalProperties: 'silently-remove-extras',
        outputDirectory: '.',
      }).GetSpec().components.schemas!;
      const unionAliases = Object.keys(models).filter(name => models[name].dataType === 'refAlias' && aliasType(name).dataType === 'union');
      const withSpecDiscriminator = unionAliases.filter(name => (schemas[name] as Swagger.Schema3).discriminator);
      expect(withSpecDiscriminator).to.include('ContentBlock');

      for (const name of unionAliases) {
        const specDiscriminator = (schemas[name] as Swagger.Schema3).discriminator;
        const routeDiscriminator = aliasType(name).discriminator;
        if (!specDiscriminator || name === 'SpecialTagUnion') {
          // SpecialTagUnion is the one union whose route models cannot carry its discriminator
          expect(routeDiscriminator, name).to.equal(undefined);
          continue;
        }
        const mapping = Object.fromEntries(Object.entries(specDiscriminator.mapping ?? {}).map(([value, ref]) => [value, ref.replace('#/components/schemas/', '')]));
        expect(routeDiscriminator, name).to.deep.equal({ propertyName: specDiscriminator.propertyName, mapping });
      }
    });

    it('does not add a discriminator when a tag value is __proto__', () => {
      const type = aliasType('SpecialTagUnion');
      expect(type.dataType).to.equal('union');
      expect(type).to.not.have.property('discriminator');
    });
  });

  describe('.buildContent', () => {
    it('strips .ts from the end of module paths but not from the middle', () => {
      const generator = new DefaultRouteGenerator(
        {
          controllers: [
            {
              location: 'controllerWith.tsInPath.ts',
              methods: [],
              name: '',
              path: '',
            },
          ],
          referenceTypeMap: {},
        },
        {
          bodyCoercion: true,
          entryFile: 'mockEntryFile',
          routesDir: '.',
          noImplicitAdditionalProperties: 'silently-remove-extras',
        },
      );

      const models = generator.buildContent('{{#each controllers}}{{modulePath}}{{/each}}');

      expect(models).to.equal('./controllerWith.tsInPath');
    });

    it('adds js for routes if esm is true', () => {
      const generator = new DefaultRouteGenerator(
        {
          controllers: [
            {
              location: 'controller.ts',
              methods: [],
              name: '',
              path: '',
            },
          ],
          referenceTypeMap: {},
        },
        {
          bodyCoercion: true,
          entryFile: 'mockEntryFile',
          routesDir: '.',
          noImplicitAdditionalProperties: 'silently-remove-extras',
          esm: true,
        },
      );

      const models = generator.buildContent('{{#each controllers}}{{modulePath}}{{/each}}');

      expect(models).to.equal('./controller.js');
    });

    it('adds mjs for routes if esm is true and source is mts', () => {
      const generator = new DefaultRouteGenerator(
        {
          controllers: [
            {
              location: 'controller.mts',
              methods: [],
              name: '',
              path: '',
            },
          ],
          referenceTypeMap: {},
        },
        {
          bodyCoercion: true,
          entryFile: 'mockEntryFile',
          routesDir: '.',
          noImplicitAdditionalProperties: 'silently-remove-extras',
          esm: true,
        },
      );

      const models = generator.buildContent('{{#each controllers}}{{modulePath}}{{/each}}');

      expect(models).to.equal('./controller.mjs');
    });

    it('adds cjs for routes if esm is true and source is cts', () => {
      const generator = new DefaultRouteGenerator(
        {
          controllers: [
            {
              location: 'controller.cts',
              methods: [],
              name: '',
              path: '',
            },
          ],
          referenceTypeMap: {},
        },
        {
          bodyCoercion: true,
          entryFile: 'mockEntryFile',
          routesDir: '.',
          noImplicitAdditionalProperties: 'silently-remove-extras',
          esm: true,
        },
      );

      const models = generator.buildContent('{{#each controllers}}{{modulePath}}{{/each}}');

      expect(models).to.equal('./controller.cjs');
    });

    it('uses ts for routes if esm is true and rewriteRelativeImportExtensions is true', () => {
      const generator = new DefaultRouteGenerator(
        {
          controllers: [
            {
              location: 'controller.ts',
              methods: [],
              name: '',
              path: '',
            },
          ],
          referenceTypeMap: {},
        },
        {
          bodyCoercion: true,
          entryFile: 'mockEntryFile',
          routesDir: '.',
          noImplicitAdditionalProperties: 'silently-remove-extras',
          esm: true,
          rewriteRelativeImportExtensions: true,
        },
      );

      const models = generator.buildContent('{{#each controllers}}{{modulePath}}{{/each}}');

      expect(models).to.equal('./controller.ts');
    });

    it('uses mts for routes if rewriteRelativeImportExtensions and esm is true and source is mts', () => {
      const generator = new DefaultRouteGenerator(
        {
          controllers: [
            {
              location: 'controller.mts',
              methods: [],
              name: '',
              path: '',
            },
          ],
          referenceTypeMap: {},
        },
        {
          bodyCoercion: true,
          entryFile: 'mockEntryFile',
          routesDir: '.',
          noImplicitAdditionalProperties: 'silently-remove-extras',
          esm: true,
          rewriteRelativeImportExtensions: true,
        },
      );

      const models = generator.buildContent('{{#each controllers}}{{modulePath}}{{/each}}');

      expect(models).to.equal('./controller.mts');
    });
  });
});
