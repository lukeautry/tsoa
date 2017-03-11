import { Swagger } from '../../../src/swagger/swagger';
import * as chai from 'chai';

const expect = chai.expect;

export function VerifyPathableParameter(params: Swagger.PathParameter[], paramValue: string, paramType: string, paramIn: string, formatType?: string) {
  const parameter = verifyParameter(params, paramValue, paramIn);
  expect(parameter.type).to.equal(paramType);
  if (formatType) {
    expect(parameter.format).to.equal(formatType);
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
