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
      const diagnostics = createProgram([entryFile], options).getSemanticDiagnostics();
      expect(diagnostics.map(diagnostic => flattenDiagnosticMessageText(diagnostic.messageText, '\n'))).to.deep.equal([]);
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
        expect(diagnostics).to.deep.equal([]);
      });

      const literalCases = [
        { field: 'stringAliasFirst', types: [{ $ref: '#/components/schemas/Identifier' }, { type: 'string', enum: ['yellow'] }], accepted: ['xenon', 'yellow'], rejected: ['zinc', 7] },
        { field: 'stringLiteralFirst', types: [{ type: 'string', enum: ['yellow'] }, { $ref: '#/components/schemas/Identifier' }], accepted: ['xenon', 'yellow'], rejected: ['zinc', 7] },
        { field: 'numberAliasFirst', types: [{ $ref: '#/components/schemas/Minimum' }, { type: 'number', enum: [7] }], accepted: [10, 42, 7], rejected: [8, '8'] },
        { field: 'numberLiteralFirst', types: [{ type: 'number', enum: [7] }, { $ref: '#/components/schemas/Minimum' }], accepted: [10, 42, 7], rejected: [8, '8'] },
        { field: 'aliases', types: [{ $ref: '#/components/schemas/Identifier' }, { $ref: '#/components/schemas/OtherIdentifier' }], accepted: ['xenon', 'yellow'], rejected: ['zinc', 7] },
        { field: 'reversedAliases', types: [{ $ref: '#/components/schemas/OtherIdentifier' }, { $ref: '#/components/schemas/Identifier' }], accepted: ['xenon', 'yellow'], rejected: ['zinc', 7] },
        { field: 'stringFirst', types: [{ type: 'string' }, { type: 'string', enum: ['yellow'] }], accepted: ['xenon', 'yellow', 'zinc'], rejected: [7] },
        { field: 'literalBeforeString', types: [{ type: 'string', enum: ['yellow'] }, { type: 'string' }], accepted: ['xenon', 'yellow', 'zinc'], rejected: [7] },
        {
          field: 'numberFirst',
          types: [
            { type: 'number', format: 'double' },
            { type: 'number', enum: [7] },
          ],
          accepted: [7, 8, 42],
          rejected: ['8'],
        },
        {
          field: 'literalBeforeNumber',
          types: [
            { type: 'number', enum: [7] },
            { type: 'number', format: 'double' },
          ],
          accepted: [7, 8, 42],
          rejected: ['8'],
        },
        {
          field: 'stringEnumAliasFirst',
          types: [{ $ref: '#/components/schemas/Identifier' }, { $ref: '#/components/schemas/Choice' }],
          accepted: ['xenon', 'yellow', 'green'],
          rejected: ['zinc', 7],
        },
        {
          field: 'stringEnumFirst',
          types: [{ $ref: '#/components/schemas/Choice' }, { $ref: '#/components/schemas/Identifier' }],
          accepted: ['xenon', 'yellow', 'green'],
          rejected: ['zinc', 7],
        },
        {
          field: 'enumMemberAliasFirst',
          types: [{ $ref: '#/components/schemas/Identifier' }, { $ref: '#/components/schemas/Choice.Yellow' }],
          accepted: ['xenon', 'yellow'],
          rejected: ['zinc', 'green', 7],
        },
        {
          field: 'enumMemberFirst',
          types: [{ $ref: '#/components/schemas/Choice.Yellow' }, { $ref: '#/components/schemas/Identifier' }],
          accepted: ['xenon', 'yellow'],
          rejected: ['zinc', 'green', 7],
        },
        {
          field: 'numericEnumAliasFirst',
          types: [{ $ref: '#/components/schemas/Minimum' }, { $ref: '#/components/schemas/NumericChoice' }],
          accepted: [10, 42, 7, 9],
          rejected: [8, '8'],
        },
        {
          field: 'numericEnumFirst',
          types: [{ $ref: '#/components/schemas/NumericChoice' }, { $ref: '#/components/schemas/Minimum' }],
          accepted: [10, 42, 7, 9],
          rejected: [8, '8'],
        },
        {
          field: 'templateAliasFirst',
          types: [{ $ref: '#/components/schemas/Identifier' }, { type: 'string' }],
          accepted: ['xenon', 'yellow', 'zinc'],
          rejected: [7],
        },
        {
          field: 'templateFirst',
          types: [{ type: 'string' }, { $ref: '#/components/schemas/Identifier' }],
          accepted: ['xenon', 'yellow', 'zinc'],
          rejected: [7],
        },
      ];
      const validLiterals = Object.fromEntries(literalCases.map(({ field, accepted }) => [field, accepted[0]]));
      for (const { field, types, accepted, rejected } of literalCases) {
        it(`keeps ${field} alternatives in the generated schema`, () => {
          expect(schemas.LiteralAlternatives.properties![field]).to.have.all.keys('anyOf');
          expect(schemas.LiteralAlternatives.properties![field].anyOf).to.have.deep.members(types);
          expect(schemas.Minimum).to.deep.equal({ type: 'number', format: 'double', minimum: 10 });
        });

        it(`validates ${field} alternatives without body coercion`, () => {
          for (const value of accepted) {
            expect(validate('LiteralAlternatives', { ...validLiterals, [field]: value }), `${field} accepts ${JSON.stringify(value)}`).to.equal(true);
          }
          for (const value of rejected) {
            expect(validate('LiteralAlternatives', { ...validLiterals, [field]: value }), `${field} rejects ${JSON.stringify(value)}`).to.equal(false);
          }
        });
      }

      it('keeps enum schema references and their values', () => {
        expect(schemas.Choice).to.deep.equal({ type: 'string', enum: ['yellow', 'green'] });
        expect(schemas['Choice.Yellow']).to.deep.equal({ type: 'string', enum: ['yellow'] });
        expect(schemas.NumericChoice).to.deep.equal({ type: 'number', enum: [7, 9] });
      });

      const validControls = { neverLast: 'xenon', neverFirst: 'xenon', anyLast: 'xenon', anyFirst: 'xenon', unknownLast: 'xenon', unknownFirst: 'xenon' };
      for (const field of ['neverLast', 'neverFirst']) {
        it(`ignores the empty ${field} alternative`, () => {
          expect(schemas.UnionControls.properties![field]).to.deep.equal({ $ref: '#/components/schemas/Identifier' });
          expect(validate('UnionControls', { ...validControls, [field]: 'xenon' })).to.equal(true);
          expect(validate('UnionControls', { ...validControls, [field]: 'zinc' })).to.equal(false);
        });
      }
      for (const field of ['anyLast', 'anyFirst', 'unknownLast', 'unknownFirst']) {
        it(`retains the broad ${field} alternative`, () => {
          expect(schemas.UnionControls.properties![field]).to.have.all.keys('anyOf');
          expect(schemas.UnionControls.properties![field].anyOf).to.have.deep.members([{ $ref: '#/components/schemas/Identifier' }, {}]);
          for (const value of ['xenon', 'zinc', 7, {}]) {
            expect(validate('UnionControls', { ...validControls, [field]: value }), `${field} accepts ${JSON.stringify(value)}`).to.equal(true);
          }
        });
      }

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
