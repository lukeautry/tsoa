import { expect } from 'chai';
import { readFileSync } from 'fs';
import { join } from 'path';
import { runInThisContext } from 'vm';
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
        mapping: [
          ['TEXT', 'TextContentBlock'],
          ['IMAGE', 'ImageContentBlock'],
          ['CAROUSEL', 'CarouselContentBlock'],
        ],
      });
    });

    it('detects the discriminator of a nullable union', () => {
      const action = context.controllers.flatMap(controller => controller.actions).find(a => a.name === 'postNullableContentBlockBody');
      expect(action?.parameters.body.discriminator).to.deep.equal({
        propertyName: 'type',
        mapping: [
          ['TEXT', 'TextContentBlock'],
          ['IMAGE', 'ImageContentBlock'],
          ['CAROUSEL', 'CarouselContentBlock'],
        ],
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
        if (!specDiscriminator) {
          expect(routeDiscriminator, name).to.equal(undefined);
          continue;
        }
        const byTag = (a: string[], b: string[]) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
        const mapping = Object.entries(specDiscriminator.mapping ?? {})
          .map(([value, ref]) => [value, ref.replace('#/components/schemas/', '')])
          .sort(byTag);
        expect(routeDiscriminator?.propertyName, name).to.equal(specDiscriminator.propertyName);
        expect([...(routeDiscriminator?.mapping ?? [])].sort(byTag), name).to.deep.equal(mapping);
      }
    });

    it('keeps a __proto__ tag value in the mapping', () => {
      expect(aliasType('SpecialTagUnion').discriminator).to.deep.equal({
        propertyName: 'kind',
        mapping: [
          ['__proto__', 'PrototypeTagBlock'],
          ['constructor', 'ConstructorTagBlock'],
          ['plain', 'PlainTagBlock'],
        ],
      });
    });

    it('renders a __proto__ tag value into the generated models as an ordinary entry', () => {
      const template = readFileSync(join(__dirname, '../../../packages/cli/src/routeGeneration/templates/express.hbs'), 'utf8');
      // The template is checked out with CRLF line endings on Windows
      const rendered = generator.buildContent(template).replace(/\r\n/g, '\n');
      const prefix = 'const models: TsoaRoute.Models = ';
      const prefixIndex = rendered.indexOf(prefix);
      expect(prefixIndex, 'models declaration in the rendered routes').to.not.equal(-1);
      const start = prefixIndex + prefix.length;
      const endIndex = rendered.indexOf('\n};\n', start);
      expect(endIndex, 'end of the models literal in the rendered routes').to.not.equal(-1);
      const end = endIndex + 2;
      const renderedModels = runInThisContext(`(${rendered.slice(start, end)})`);
      const discriminator = renderedModels.SpecialTagUnion.type.discriminator;

      expect(discriminator.mapping).to.deep.include(['__proto__', 'PrototypeTagBlock']);
      expect(Object.getPrototypeOf(renderedModels)).to.equal(Object.prototype);
      expect(Object.getPrototypeOf(discriminator)).to.equal(Object.prototype);
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

    describe('binaryBody', () => {
      const buildActions = (bodyType?: Tsoa.Type) => {
        const parameters: Tsoa.Parameter[] = bodyType ? [{ parameterName: 'body', name: 'body', in: 'body', required: true, type: bodyType, validators: {}, deprecated: false }] : [];
        const generator = new DefaultRouteGenerator(
          {
            controllers: [
              {
                location: 'controller.ts',
                methods: [{ extensions: [], isHidden: false, method: 'post', name: 'upload', parameters, path: '', responses: [], security: [], type: { dataType: 'void' } }],
                name: '',
                path: '',
              },
            ],
            referenceTypeMap: {},
          },
          { bodyCoercion: true, entryFile: 'mockEntryFile', routesDir: '.', noImplicitAdditionalProperties: 'silently-remove-extras' },
        );
        return generator.buildContent('{{#each controllers}}{{#each actions}}{{binaryBody}}{{/each}}{{/each}}');
      };

      it('is set for a method with a binary body', () => {
        expect(buildActions({ dataType: 'binary' })).to.equal('true');
      });

      it('is not set for a method with a buffer body', () => {
        expect(buildActions({ dataType: 'buffer' })).to.equal('false');
      });

      it('is not set for a method without a body', () => {
        expect(buildActions()).to.equal('false');
      });
    });
  });
});
