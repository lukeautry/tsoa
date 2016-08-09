import {Swagger} from '../../../src/swagger/swagger';
import * as chai from 'chai';

const expect = chai.expect;
export const modelName = '#/definitions/TestModel';

export function VerifyPath(
    spec: Swagger.Spec,
    route: string,
    getOperation: (path: Swagger.Path) => Swagger.Operation,
    isCollection?: boolean,
    isNoContent?: boolean
) {
    const path = spec.paths[route];
    expect(path, `Path object for ${route} route wasn\'t generated.`).to.exist;

    const operation = getOperation(path);
    expect(operation, `Method for ${route} route wasn\'t generated.`).to.exist;
    expect(operation.responses, `Response object for ${route} route wasn\'t generated.`).to.exist;

    if (isNoContent) {
        const successResponse = operation.responses['204'];
        expect(successResponse, `204 response for ${route} route wasn\'t generated.`).to.exist;
        return path;
    }

    const successResponse = operation.responses['200'];
    expect(successResponse, `200 response for ${route} route wasn\'t generated.`).to.exist;
    expect(successResponse.schema, `Schema for 200 response ${route} route wasn\'t generated.`).to.exist;

    if (isCollection) {
        expect(successResponse.schema.type).to.equal('array');
        expect((successResponse.schema.items as any).$ref).to.equal(modelName);
    } else {
        expect(successResponse.schema.$ref).to.equal(modelName);
    }

    return path;
}
