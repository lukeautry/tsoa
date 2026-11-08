import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { DefaultRouteGenerator } from '@tsoa/cli/routeGeneration/defaultRouteGenerator';
import { SpecGenerator3 } from '@tsoa/cli/swagger/specGenerator3';
import { FieldErrors, Swagger, ValidationService } from '@tsoa/runtime';
import { expect } from 'chai';
import 'mocha';
import { createProgram, flattenDiagnosticMessageText } from 'typescript';
import { getDefaultExtendedOptions } from '../../fixtures/defaultOptions';

describe('Written union candidates', () => {
  const entryFile = './fixtures/unionCandidates/unionCandidatesController.ts';
  for (const strict of [false, true]) {
    describe(`strict ${strict}`, () => {
      const options = { strict, experimentalDecorators: true, skipLibCheck: true, types: [], lib: ['lib.es2021.d.ts'] };
      const metadata = new MetadataGenerator(entryFile, options).Generate();
      const spec = new SpecGenerator3(metadata, getDefaultExtendedOptions('', entryFile)).GetSpec();
      const schemas = JSON.parse(JSON.stringify(spec.components.schemas!)) as Record<string, Swagger.Schema3>;
      const models = new DefaultRouteGenerator(metadata, { entryFile, routesDir: './fixtures', noImplicitAdditionalProperties: 'ignore', bodyCoercion: false }).buildModels();
      const validate = (ref: string, value: unknown) => {
        const errors: FieldErrors = {};
        new ValidationService(models, { bodyCoercion: false, noImplicitAdditionalProperties: 'ignore' }).ValidateParam({ ref, required: true }, value, 'body', errors, true);
        return Object.keys(errors).length === 0;
      };

      it('type-checks the fixture', () => {
        const diagnostics = createProgram([entryFile], options).getSemanticDiagnostics();
        expect(diagnostics.map(diagnostic => flattenDiagnosticMessageText(diagnostic.messageText, '\n'))).to.deep.equal([]);
      });

      it('keeps both annotated generic array alternatives in schemas', () => {
        expect(schemas['Box_Identifier.OtherIdentifier_'].properties!.value).to.deep.equal({
          anyOf: [
            { type: 'array', items: { $ref: '#/components/schemas/Identifier' } },
            { type: 'array', items: { $ref: '#/components/schemas/OtherIdentifier' } },
          ],
        });
        expect(schemas.Identifier).to.deep.equal({ type: 'string', pattern: '^x' });
        expect(schemas.OtherIdentifier).to.deep.equal({ type: 'string', pattern: '^y' });
      });

      it('validates both annotated generic array alternatives', () => {
        for (const [value, accepted] of [
          ['xenon', true],
          ['yellow', true],
          ['zinc', false],
        ] as const) {
          expect(validate('Box_Identifier.OtherIdentifier_', { value: [value] }), value).to.equal(accepted);
        }
      });

      it('keeps both annotated generic model alternatives in schemas', () => {
        expect(schemas['ItemBox_Identifier.OtherIdentifier_'].properties!.value).to.deep.equal({
          anyOf: [{ $ref: '#/components/schemas/Item_Identifier_' }, { $ref: '#/components/schemas/Item_OtherIdentifier_' }],
        });
        expect(schemas.Item_Identifier_.properties!.value).to.deep.equal({ $ref: '#/components/schemas/Identifier' });
        expect(schemas.Item_OtherIdentifier_.properties!.value).to.deep.equal({ $ref: '#/components/schemas/OtherIdentifier' });
      });

      it('validates both annotated generic model alternatives', () => {
        for (const [value, accepted] of [
          ['xenon', true],
          ['yellow', true],
          ['zinc', false],
        ] as const) {
          expect(validate('ItemBox_Identifier.OtherIdentifier_', { value: { value } }), value).to.equal(accepted);
        }
      });

      it('distinguishes multiple generic candidates without relying on consumption order', () => {
        const properties = schemas['DistinctBox_Identifier.number_'].properties!;
        expect(properties.arrays.anyOf).to.deep.equal([
          { type: 'array', items: { $ref: '#/components/schemas/Identifier' } },
          { type: 'array', items: { type: 'number', format: 'double' } },
          { type: 'array', items: { type: 'boolean' } },
        ]);
        expect(properties.items.anyOf).to.deep.equal([
          { $ref: '#/components/schemas/Item_Identifier_' },
          { $ref: '#/components/schemas/Item_number_' },
          { $ref: '#/components/schemas/Item_boolean_' },
        ]);
        const ref = 'DistinctBox_Identifier.number_';
        for (const value of ['xenon', 42, true]) {
          expect(validate(ref, { arrays: [value], items: { value } })).to.equal(true);
        }
        expect(validate(ref, { arrays: ['yellow'], items: { value: 'yellow' } })).to.equal(false);
        expect(validate(ref, { arrays: [{}], items: { value: {} } })).to.equal(false);
      });
    });
  }
});
