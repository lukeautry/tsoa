import { expect } from 'chai';
import { Swagger } from '@tsoa/runtime';

export function VerifyPathableParameter(params: Swagger.PathParameter[], paramValue: string, paramType: string, paramIn: string, formatType?: string) {
  const parameter = verifyParameter(params, paramValue, paramIn);
  expect(parameter.type).to.equal(paramType);
  if (formatType) {
    expect(parameter.format).to.equal(formatType);
  }
}

export function VerifyPathableStringParameter(params: Swagger.PathParameter[], paramValue: string, paramType: string, paramIn: string, min?: number, max?: number, pattern?: string) {
  const parameter = verifyParameter(params, paramValue, paramIn);
  expect(parameter.type).to.equal(paramType);
  if (min) {
    expect(parameter.minLength).to.equal(min);
  }
  if (max) {
    expect(parameter.maxLength).to.equal(max);
  }
  if (pattern) {
    expect(parameter.pattern).to.equal(pattern);
  }
}

export function VerifyPathableNumberParameter(params: Swagger.PathParameter[], paramValue: string, paramType: string, paramIn: string, formatType?: string, min?: number, max?: number) {
  const parameter = verifyParameter(params, paramValue, paramIn);
  expect(parameter.type).to.equal(paramType);
  if (formatType) {
    expect(parameter.format).to.equal(formatType);
  }
  if (min) {
    expect(parameter.minimum).to.equal(min);
  }
  if (max) {
    expect(parameter.maximum).to.equal(max);
  }
}

export function VerifyBodyParameter(params: Swagger.PathParameter[], paramValue: string, paramType: string, paramIn: string) {
  const parameter = verifyParameter(params, paramValue, paramIn) as any;
  expect(parameter.schema.$ref).to.equal(paramType);
}

function verifyParameter(params: Swagger.PathParameter[], paramValue: string, paramIn: string) {
  const parameter = params.filter(p => p.name === paramValue)[0];
  expect(parameter, `Path parameter '${paramValue}' wasn't generated.`).to.exist;
  expect(parameter.in).to.equal(paramIn);

  return parameter;
}
