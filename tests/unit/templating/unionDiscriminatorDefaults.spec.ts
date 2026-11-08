import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { DefaultRouteGenerator } from '@tsoa/cli/routeGeneration/defaultRouteGenerator';
import { SpecGenerator3 } from '@tsoa/cli/swagger/specGenerator3';
import { Swagger } from '@tsoa/runtime';
import { FieldErrors, ValidationService } from '@tsoa/runtime/routeGeneration/templateHelpers';
import { expect } from 'chai';
import 'mocha';

describe('Union discriminator defaults in generated metadata', () => {
  const entryFile = './fixtures/unionDiscriminatorDefaults/controller.ts';
  const metadata = new MetadataGenerator(entryFile).Generate();
  const modes = ['ignore', 'silently-remove-extras', 'throw-on-extras'] as const;

  for (const mode of modes) {
    const models = new DefaultRouteGenerator(metadata, {
      entryFile,
      routesDir: '.',
      bodyCoercion: true,
      noImplicitAdditionalProperties: mode,
    }).buildModels();
    const service = new ValidationService(models, { bodyCoercion: true, noImplicitAdditionalProperties: mode });
    const schemas = new SpecGenerator3(metadata, { entryFile, outputDirectory: '.', noImplicitAdditionalProperties: mode }).GetSpec().components.schemas!;

    for (const memberKind of ['Object', 'Inline']) {
      const unionName = `NullDefault${memberKind}Union`;
      const memberName = `NullDefault${memberKind}A`;
      const otherMemberName = `NullDefault${memberKind}B`;

      it(`normalizes a missing ${memberKind} tag from its null default with ${mode}`, () => {
        const input = {};
        const errors: FieldErrors = {};
        const result = service.ValidateParam({ ref: unionName }, input, 'body', errors, true);

        expect(errors).to.deep.equal({});
        expect(result).to.deep.equal({ kind: 'null' });
        expect(input).to.deep.equal({});
      });

      it(`rejects a null default for a string tag without body coercion with ${memberKind} and ${mode}`, () => {
        const errors: FieldErrors = {};
        const strictService = new ValidationService(models, { bodyCoercion: false, noImplicitAdditionalProperties: mode });
        const result = strictService.ValidateParam({ ref: unionName }, {}, 'body', errors, true);

        expect(result).to.equal(undefined);
        expect(errors.body.message).to.contain('Could not match the union');
      });

      it(`preserves the required ${memberKind} tag and discriminator in the spec with ${mode}`, () => {
        const member = schemas[memberName] as Swagger.Schema3;
        const union = schemas[unionName] as Swagger.Schema3;

        expect(member.required).to.deep.equal(['kind']);
        expect(member.properties!.kind).to.deep.include({ type: 'string', enum: ['null'], default: null });
        expect(union.oneOf).to.deep.equal([{ $ref: `#/components/schemas/${memberName}` }, { $ref: `#/components/schemas/${otherMemberName}` }]);
        expect(union.discriminator).to.deep.equal({
          propertyName: 'kind',
          mapping: { null: `#/components/schemas/${memberName}`, B: `#/components/schemas/${otherMemberName}` },
        });
      });
    }
  }
});
