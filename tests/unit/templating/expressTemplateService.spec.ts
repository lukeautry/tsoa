import { ExpressTemplateService } from '@tsoa/runtime/routeGeneration/templates/express/expressTemplateService';
import { ValidateError } from '@tsoa/runtime/routeGeneration/templateHelpers';
import type { TsoaRoute } from '@tsoa/runtime/routeGeneration/tsoa-route';
import { expect } from 'chai';
import type { Request as ExRequest, Response as ExResponse } from 'express';
import 'mocha';

describe('ExpressTemplateService body parameter', () => {
  const service = new ExpressTemplateService({}, { noImplicitAdditionalProperties: 'throw-on-extras', bodyCoercion: true });

  const objectWithFoo: TsoaRoute.ParameterSchema = {
    in: 'body',
    name: 'body',
    dataType: 'nestedObjectLiteral',
    nestedProperties: { foo: { dataType: 'boolean', required: true } },
    additionalProperties: false,
  };
  const objectWithOptionalFoo: TsoaRoute.ParameterSchema = { ...objectWithFoo, nestedProperties: { foo: { dataType: 'boolean' } } };
  const arrayOfStrings: TsoaRoute.ParameterSchema = { in: 'body', name: 'body', dataType: 'array', array: { dataType: 'string' } };

  const getValidatedArgs = (param: TsoaRoute.ParameterSchema, headers: Record<string, string> | undefined, body: unknown) =>
    service.getValidatedArgs({ args: { body: param }, request: { headers, body } as unknown as ExRequest, response: {} as ExResponse });

  describe('a request that carried no body bytes, with the empty object body-parser leaves', () => {
    const withoutBodyBytes: Array<[string, Record<string, string> | undefined]> = [
      ['no content-length', {}],
      ['content-length 0', { 'content-length': '0' }],
      ['no headers', undefined],
    ];

    for (const [description, headers] of withoutBodyBytes) {
      it(`treats the body as absent for an optional body parameter (${description})`, () => {
        expect(getValidatedArgs({ ...objectWithFoo, required: false }, headers, {})).to.deep.equal([undefined]);
      });

      it(`validates the empty object for a required body parameter (${description})`, () => {
        expect(() => getValidatedArgs({ ...objectWithFoo, required: true }, headers, {}))
          .to.throw(ValidateError)
          .with.property('fields')
          .that.has.property('body.foo');
      });

      it(`passes the empty object to a required body parameter that accepts any value (${description})`, () => {
        expect(getValidatedArgs({ in: 'body', name: 'body', dataType: 'any', required: true }, headers, {})).to.deep.equal([{}]);
      });
    }
  });

  describe('values the empty body rule leaves alone', () => {
    it('validates an empty object without a plain object prototype', () => {
      expect(() => getValidatedArgs({ ...objectWithFoo, required: false }, {}, Object.create(null)))
        .to.throw(ValidateError)
        .with.property('fields')
        .that.has.property('body.foo');
    });

    it('reports a missing body-prop parameter as on any request with a body', () => {
      const bodyProp: TsoaRoute.ParameterSchema = { in: 'body-prop', name: 'foo', dataType: 'boolean', required: true };
      expect(() => getValidatedArgs(bodyProp, {}, {}))
        .to.throw(ValidateError)
        .with.property('fields')
        .that.deep.equals({ 'body.foo': { message: "'foo' is required" } });
    });
  });

  describe('a request that carried body bytes', () => {
    it('keeps a sent empty object', () => {
      expect(getValidatedArgs({ ...objectWithOptionalFoo, required: true }, { 'content-length': '2' }, {})).to.deep.equal([{}]);
    });

    it('keeps a sent empty object when the length is unknown (transfer-encoding)', () => {
      expect(getValidatedArgs({ ...objectWithOptionalFoo, required: true }, { 'transfer-encoding': 'chunked' }, {})).to.deep.equal([{}]);
    });

    it('validates a sent empty object instead of dropping it', () => {
      expect(() => getValidatedArgs({ ...objectWithFoo, required: false }, { 'content-length': '2' }, {}))
        .to.throw(ValidateError)
        .with.property('fields')
        .that.has.property('body.foo');
    });

    it('keeps a sent empty array for a required array', () => {
      expect(getValidatedArgs({ ...arrayOfStrings, required: true }, { 'content-length': '2' }, [])).to.deep.equal([[]]);
    });

    const sentValues: Array<[string, TsoaRoute.ParameterSchema, unknown, string]> = [
      ['false', { in: 'body', name: 'body', dataType: 'boolean', required: true }, false, '5'],
      ['0', { in: 'body', name: 'body', dataType: 'double', required: true }, 0, '1'],
      ['null', { in: 'body', name: 'body', dataType: 'union', required: true, subSchemas: [{ dataType: 'string' }, { dataType: 'enum', enums: [null] }] }, null, '4'],
    ];

    for (const [description, param, value, length] of sentValues) {
      it(`passes a sent ${description} to the validator`, () => {
        expect(getValidatedArgs(param, { 'content-length': length }, value)).to.deep.equal([value]);
      });
    }
  });

  describe('a body set by middleware without request headers', () => {
    it('keeps a non-empty body', () => {
      expect(getValidatedArgs({ ...objectWithFoo, required: true }, undefined, { foo: true })).to.deep.equal([{ foo: true }]);
    });

    it('keeps an empty array', () => {
      expect(getValidatedArgs({ ...arrayOfStrings, required: true }, undefined, [])).to.deep.equal([[]]);
    });
  });
});
