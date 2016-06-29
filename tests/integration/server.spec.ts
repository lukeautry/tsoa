/// <reference path="../../typings/index.d.ts" />
import {app} from '../fixtures/server';
import {TestModel} from '../fixtures/testModel';
import {Exception} from '../../src/routing/exceptions';
import * as chai from 'chai';
import * as request from 'supertest';

describe('Server', () => {
    it('can handle get request with no path argument', () => {
        return verifyRequest('/GetTest', (err, res) => {
            const model = res.body as TestModel;
            chai.expect(model.id).to.equal(1);
        });
    });

    it('can handle get request with path argument', () => {
        return verifyRequest('/GetTest/Current', (err, res) => {
            const model = res.body as TestModel;
            chai.expect(model.id).to.equal(1);
        });
    });

    it('can handle get request with collection return value', () => {
        return verifyRequest('/GetTest/Multi', (err, res) => {
            const models = res.body as TestModel[];
            chai.expect(models.length).to.equal(3);
            models.forEach(m => {
                chai.expect(m.id).to.equal(1);
            });
        });
    });

    it('can handle get request with path and query parameters', () => {
        return verifyRequest(`/GetTest/${1}/${true}/test?booleanParam=true&stringParam=test1234&numberParam=1234`, (err, res) => {
            const model = res.body as TestModel;
            chai.expect(model.id).to.equal(1);
        });
    });

    // @Get('{numberPathParam}/{booleanPathParam}/{stringPathParam}')
    // public async getModelByParams(
    //     numberPathParam: number,
    //     stringPathParam: string,
    //     booleanPathParam: boolean,
    //     booleanParam: boolean,
    //     stringParam: string,
    //     numberParam: number,
    //     optionalStringParam?: string): Promise<TestModel> {
    //     return new ModelService().getModel();
    // }

    function verifyRequest(path: string, verifyResponse: (err: any, res: request.Response) => any, expectedStatus?: number) {
        expectedStatus = expectedStatus || 200;
        return new Promise((resolve, reject) => {
            request(app)
                .get(path)
                .expect(expectedStatus)
                .end((err, res) => {
                    if (err) {
                        const error = (res.error as any).text as string;
                        reject({
                            error: err,
                            response: JSON.parse(error)
                        });
                        return;
                    }

                    verifyResponse(err, res);
                    resolve();
                });
        });
    }
});
