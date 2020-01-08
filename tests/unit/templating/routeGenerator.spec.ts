import { expect } from 'chai';
import 'mocha';
import { Tsoa } from '../../../src/metadataGeneration/tsoa';
import { RouteGenerator } from '../../../src/routeGeneration/routeGenerator';

describe('RouteGenerator', () => {
  describe('.buildModels', () => {
    it('should produce models where additionalProperties are not allowed unless explicitly stated', () => {
      // Arrange
      const stringType: Tsoa.Type = {
        dataType: 'string',
      };
      const refThatShouldNotAllowExtras = 'refThatShouldNotAllowExtras';
      const refWithExtraStrings = 'refWithExtraStrings';
      const generator = new RouteGenerator(
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
                },
              ],
              refName: refThatShouldNotAllowExtras,
            },
            [refWithExtraStrings]: {
              additionalProperties: stringType,
              dataType: 'refObject',
              properties: [],
              refName: refThatShouldNotAllowExtras,
            },
          },
        },
        {
          entryFile: 'mockEntryFile',
          routesDir: 'mockRoutesDir',
        },
        {
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
});
