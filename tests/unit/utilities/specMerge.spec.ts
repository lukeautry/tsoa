import 'mocha';
import { expect } from 'chai';
import { getDefaultExtendedOptions } from '../../fixtures/defaultOptions';
import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { ExtendedSpecConfig } from '@tsoa/cli/cli';
import { Swagger } from '@tsoa/runtime';
import { SpecGenerator3 } from '@tsoa/cli/swagger/specGenerator3';

describe('specMergins', () => {
  const metadata = new MetadataGenerator('./fixtures/controllers/getController.ts').Generate();
  const defaultOptions: ExtendedSpecConfig = getDefaultExtendedOptions();

  describe('recursive', () => {
    const addedParameter: Swagger.Parameter3 = {
      name: 'deepQueryParamObject',
      in: 'query',
      style: 'deepObject',
      explode: true,
      description: 'Accepts a deep Object as query param',
      examples: {
        color: {
          description: 'Setting a rgb color',
          value: { color: 'rgba(100, 23, 12, 1)' },
        },
      },
      schema: {
        type: 'object',
        additionalProperties: true,
      },
    };

    const options: ExtendedSpecConfig = {
      ...defaultOptions,
      specMerging: 'recursive',
      spec: {
        paths: {
          '/GetTest/DateParam': {
            get: {
              operationId: 'OverriddenId',
              parameters: [addedParameter],
            },
          },
        },
      },
    };
    const mergedSpec = new SpecGenerator3(metadata, options).GetSpec();

    it('does not merge arrays, but overwrites instead', () => {
      expect(mergedSpec.paths['/GetTest/DateParam'].get?.parameters).to.deep.eq([addedParameter]);
    });

    it('merges deep object, overriding primitives', () => {
      expect(mergedSpec.paths['/GetTest/DateParam'].get?.operationId).to.eq('OverriddenId');
    });

    it('does not affect anything else', () => {
      const originalSpec = new SpecGenerator3(metadata, defaultOptions).GetSpec();

      originalSpec.paths['/GetTest/DateParam'].get!.operationId = 'OverriddenId';
      originalSpec.paths['/GetTest/DateParam'].get!.parameters = [addedParameter];

      expect(mergedSpec).to.deep.eq(originalSpec);
    });
  });

  describe('deepMerging', () => {
    const addedParameter: Swagger.Parameter3 = {
      name: 'appearance',
      in: 'query',
      style: 'deepObject',
      explode: true,
      description: 'Accepts an object containing style information for the marker',
      examples: {
        color: {
          description: 'Setting a rgb color',
          value: { color: 'rgba(100, 23, 12, 1)' },
        },
      },
      schema: {
        type: 'object',
        additionalProperties: true,
      },
    };

    const options: ExtendedSpecConfig = {
      ...defaultOptions,
      specMerging: 'deepmerge',
      spec: {
        paths: {
          '/GetTest/DateParam': {
            get: {
              operationId: 'OverriddenId',
              parameters: [addedParameter],
            },
          },
        },
      },
    };
    const mergedSpec = new SpecGenerator3(metadata, options).GetSpec();

    it('merges arrays', () => {
      expect(mergedSpec.paths['/GetTest/DateParam'].get?.parameters).to.deep.eq([
        {
          description: undefined,
          example: undefined,
          in: 'query',
          name: 'date',
          required: true,
          schema: { format: 'date-time', type: 'string', default: undefined, items: undefined, enum: undefined },
        },
        addedParameter,
      ]);
    });

    it('merges deep object, overriding primitives', () => {
      expect(mergedSpec.paths['/GetTest/DateParam'].get?.operationId).to.eq('OverriddenId');
    });

    it('does not affect anything else', () => {
      const originalSpec = new SpecGenerator3(metadata, defaultOptions).GetSpec();

      originalSpec.paths['/GetTest/DateParam'].get!.operationId = 'OverriddenId';

      originalSpec.paths['/GetTest/DateParam'].get?.parameters?.push(addedParameter as any);

      expect(mergedSpec).to.deep.eq(originalSpec);
    });
  });
});
