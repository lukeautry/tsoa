import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { DefaultRouteGenerator } from '@tsoa/cli/routeGeneration/defaultRouteGenerator';
import { FieldErrors, TsoaRoute, ValidationService } from '@tsoa/runtime';
import { expect } from 'chai';
import 'mocha';

describe('Explicit null alternatives in unions', () => {
  const models: TsoaRoute.Models = {
    NullAlias: { dataType: 'refAlias', type: { dataType: 'enum', enums: [null] } },
    IndirectNull: { dataType: 'refAlias', type: { ref: 'NullAlias' } },
    NestedAlias: { dataType: 'refAlias', type: { dataType: 'union', subSchemas: [{ dataType: 'string' }, { ref: 'IndirectNull' }] } },
    ObjectWithNullableProperty: { dataType: 'refObject', properties: { value: { ref: 'NullAlias' } } },
    Cycle: { dataType: 'refAlias', type: { ref: 'Cycle' } },
    NullableCycle: { dataType: 'refAlias', type: { dataType: 'union', subSchemas: [{ ref: 'NullableCycle' }, { ref: 'NullAlias' }] } },
  };
  const alternatives: TsoaRoute.PropertySchema[] = [{ ref: 'NullAlias' }, { ref: 'IndirectNull' }, { ref: 'NestedAlias' }, { ref: 'NullableCycle' }];

  for (const alternative of alternatives) {
    for (const reversed of [false, true]) {
      for (const bodyCoercion of [false, true]) {
        for (const isBodyParam of [false, true]) {
          it(`preserves null for ${alternative.ref}, reversed=${reversed}, bodyCoercion=${bodyCoercion}, body=${isBodyParam}`, () => {
            const subSchemas: TsoaRoute.PropertySchema[] = [{ dataType: 'boolean' }, alternative];
            const property: TsoaRoute.PropertySchema = { dataType: 'union', required: true, subSchemas: reversed ? subSchemas.reverse() : subSchemas };
            const service = new ValidationService(models, { bodyCoercion, noImplicitAdditionalProperties: 'ignore' });
            const errors: FieldErrors = {};

            expect(service.ValidateParam(property, null, 'value', errors, isBodyParam)).to.equal(null);
            expect(errors).to.deep.equal({});
          });
        }
      }
    }
  }

  for (const reversed of [false, true]) {
    it(`preserves aliased null alongside Buffer, reversed=${reversed}`, () => {
      const subSchemas: TsoaRoute.PropertySchema[] = [{ dataType: 'buffer' }, { ref: 'IndirectNull' }];
      const service = new ValidationService(models, { bodyCoercion: true, noImplicitAdditionalProperties: 'ignore' });
      const errors: FieldErrors = {};

      expect(service.ValidateParam({ dataType: 'union', subSchemas: reversed ? subSchemas.reverse() : subSchemas }, null, 'value', errors, true)).to.equal(null);
      expect(errors).to.deep.equal({});
    });
  }

  const nonNullAlternatives: TsoaRoute.PropertySchema[] = [
    { dataType: 'enum', enums: ['null'] },
    { dataType: 'array', array: { ref: 'NullAlias' } },
    { ref: 'ObjectWithNullableProperty' },
    { ref: 'Cycle' },
  ];
  for (const alternative of nonNullAlternatives) {
    it(`keeps boolean coercion when ${alternative.ref ?? alternative.dataType} has no explicit null alternative`, () => {
      const service = new ValidationService(models, { bodyCoercion: true, noImplicitAdditionalProperties: 'ignore' });
      const errors: FieldErrors = {};

      expect(service.ValidateParam({ dataType: 'union', subSchemas: [{ dataType: 'boolean' }, alternative] }, null, 'value', errors, true)).to.equal(false);
      expect(errors).to.deep.equal({});
    });
  }

  it('keeps ordinary coercion after repeated null selections on the same service', () => {
    const service = new ValidationService(models, { bodyCoercion: true, noImplicitAdditionalProperties: 'ignore' });
    const property: TsoaRoute.PropertySchema = { dataType: 'union', subSchemas: [{ dataType: 'boolean' }, { ref: 'IndirectNull' }] };
    const errors: FieldErrors = {};

    expect(service.ValidateParam(property, null, 'value', errors, true)).to.equal(null);
    expect(service.ValidateParam(property, 'false', 'value', errors, true)).to.equal(false);
    expect(service.ValidateParam(property, 'true', 'value', errors, true)).to.equal(true);
    expect(service.ValidateParam(property, null, 'value', errors, true)).to.equal(null);
    expect(errors).to.deep.equal({});
  });

  it('preserves a null default through a nullable alias', () => {
    const service = new ValidationService(models, { bodyCoercion: true, noImplicitAdditionalProperties: 'ignore' });
    const property: TsoaRoute.PropertySchema = { dataType: 'union', required: true, default: null, subSchemas: [{ dataType: 'boolean' }, { ref: 'IndirectNull' }] };
    const errors: FieldErrors = {};

    expect(service.ValidateParam(property, undefined, 'value', errors, true)).to.equal(null);
    expect(errors).to.deep.equal({});
  });

  it('keeps a union member default when the input is undefined', () => {
    const service = new ValidationService({}, { bodyCoercion: true, noImplicitAdditionalProperties: 'ignore' });
    const property: TsoaRoute.PropertySchema = { dataType: 'union', required: true, subSchemas: [{ dataType: 'boolean', default: true }, { dataType: 'undefined' }] };
    const errors: FieldErrors = {};

    expect(service.ValidateParam(property, undefined, 'value', errors, true)).to.equal(true);
    expect(errors).to.deep.equal({});
  });

  it('preserves null in generated alias schemas, nested unions, and arrays', () => {
    const entryFile = './fixtures/controllers/nullUnionController.ts';
    const metadata = new MetadataGenerator(entryFile, { strictNullChecks: true, experimentalDecorators: true }).Generate();
    const models = new DefaultRouteGenerator(metadata, { entryFile, routesDir: './fixtures', noImplicitAdditionalProperties: 'ignore', bodyCoercion: true }).buildModels();
    const parameter = metadata.controllers[0].methods[0].parameters[0];
    if (parameter.type.dataType !== 'refObject') {
      throw new Error('Expected a generated object body');
    }
    const input = { direct: null, alias: null, indirect: null, nested: null, values: [null, true, false] };
    const expected = { direct: null, alias: null, indirect: null, nested: null, values: [null, true, false] };
    const errors: FieldErrors = {};
    const service = new ValidationService(models, { bodyCoercion: true, noImplicitAdditionalProperties: 'ignore' });

    expect(service.ValidateParam({ ref: parameter.type.refName, required: parameter.required }, input, 'body', errors, true)).to.deep.equal(expected);
    expect(errors).to.deep.equal({});
  });
});
