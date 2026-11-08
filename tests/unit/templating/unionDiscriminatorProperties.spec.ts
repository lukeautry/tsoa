import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { DefaultRouteGenerator } from '@tsoa/cli/routeGeneration/defaultRouteGenerator';
import { FieldErrors, ValidationService } from '@tsoa/runtime/routeGeneration/templateHelpers';
import { expect } from 'chai';
import 'mocha';

describe('Union discriminator property names in generated metadata', () => {
  const entryFile = './fixtures/unionDiscriminatorProperties/controller.ts';
  const metadata = new MetadataGenerator(entryFile).Generate();
  const modes = ['ignore', 'silently-remove-extras', 'throw-on-extras'] as const;

  for (const mode of modes) {
    const models = new DefaultRouteGenerator(metadata, {
      entryFile,
      routesDir: '.',
      bodyCoercion: false,
      noImplicitAdditionalProperties: mode,
    }).buildModels();
    const service = new ValidationService(models, { bodyCoercion: false, noImplicitAdditionalProperties: mode });

    for (const [unionName, propertyName] of Object.entries({ ConstructorUnion: 'constructor', ToStringUnion: 'toString' })) {
      it(`requires an own ${propertyName} tag with ${mode}`, () => {
        for (const input of [{}, { [propertyName]: undefined }]) {
          const errors: FieldErrors = {};
          const result = service.ValidateParam({ ref: unionName }, input, 'body', errors, true);

          expect(result).to.equal(undefined);
          expect(errors).to.deep.equal({ [`body.${propertyName}`]: { message: `'${propertyName}' is required`, value: undefined } });
        }
      });

      it(`accepts known own ${propertyName} tags with ${mode}`, () => {
        for (const tag of ['first', 'second']) {
          const input = { [propertyName]: tag };
          const errors: FieldErrors = {};
          const result = service.ValidateParam({ ref: unionName }, input, 'body', errors, true);

          expect(errors).to.deep.equal({});
          expect(result).to.deep.equal(input);
        }
      });

      it(`rejects an unknown own ${propertyName} tag with ${mode}`, () => {
        const errors: FieldErrors = {};
        const result = service.ValidateParam({ ref: unionName }, { [propertyName]: 'unknown' }, 'body', errors, true);

        expect(result).to.equal(undefined);
        expect(errors).to.deep.equal({
          [`body.${propertyName}`]: { message: "should be one of the following; ['first','second']", value: 'unknown' },
        });
      });
    }
  }
});
