import { expect } from 'chai';
import { Swagger } from '../../../src/swagger/swagger';

export const defaultModelName = '#/definitions/TestModel';

export function VerifyPath(
  spec: Swagger.Spec,
  route: string,
  getOperation: ((path: Swagger.Path) => Swagger.Operation | undefined),
  isCollection?: boolean,
  isNoContent?: boolean,
  givenModelName?: string,
) {
  const modelName = givenModelName || defaultModelName;
  const path = spec.paths[route];
  expect(path, `Path object for ${route} route wasn\'t generated.`).to.exist;

  const operation = getOperation(path);
  if (!operation) { throw new Error(`Method for ${route} route wasn\'t generated.`); }
  if (!operation.responses) { throw new Error(`Response object for ${route} route wasn\'t generated.`); }

  if (isNoContent) {
    const successResponse = operation.responses['204'];
    expect(successResponse, `204 response for ${route} route wasn\'t generated.`).to.exist;
    return path;
  }

  const successResponse = operation.responses['200'];
  expect(successResponse, `200 response for ${route} route wasn\'t generated.`).to.exist;

  if (!successResponse.schema) { throw new Error(`Schema for 200 response ${route} route wasn\'t generated.`); }

  if (isCollection) {
    expect(successResponse.schema.type).to.equal('array');
    expect((successResponse.schema.items as any).$ref).to.equal(modelName);
  } else {
    expect(successResponse.schema.$ref).to.equal(modelName);
  }

  return path;
}
