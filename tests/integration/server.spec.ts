/// <reference path="../../typings/index.d.ts" />
import {app} from '../fixtures/server';
import {TestModel} from '../fixtures/testModel';
import * as chai from 'chai';
import * as request from 'supertest';

const expect = chai.expect;

describe('Server', () => {
    it('can handle get request with no path argument', () => {
        return verifyGetRequest('/GetTest', (err, res) => {
            const model = res.body as TestModel;
            expect(model.id).to.equal(1);
        });
    });

    it('can handle get request with path argument', () => {
        return verifyGetRequest('/GetTest/Current', (err, res) => {
            const model = res.body as TestModel;
            expect(model.id).to.equal(1);
        });
    });

    it('can handle get request with collection return value', () => {
        return verifyGetRequest('/GetTest/Multi', (err, res) => {
            const models = res.body as TestModel[];
            expect(models.length).to.equal(3);
            models.forEach(m => {
                expect(m.id).to.equal(1);
            });
        });
    });

    it('can handle get request with path and query parameters', () => {
        return verifyGetRequest(`/GetTest/${1}/${true}/test?booleanParam=true&stringParam=test1234&numberParam=1234`, (err, res) => {
            const model = res.body as TestModel;
            expect(model.id).to.equal(1);
        });
    });

    it('returns error if missing required query parameter', () => {
        return verifyGetRequest(`/GetTest/${1}/${true}/test?booleanParam=true&stringParam=test1234`, (err: any, res: any) => {
            expect(err.message).to.equal('numberParam is a required parameter.');
        }, 400);
    });

    it('parses path parameters', () => {
        const numberValue = 600;
        const boolValue = false;
        const stringValue = 'the-string';

        return verifyGetRequest(`/GetTest/${numberValue}/${boolValue}/${stringValue}?booleanParam=true&stringParam=test1234&numberParam=1234`, (err, res) => {
            const model = res.body as TestModel;
            expect(model.numberValue).to.equal(numberValue);
            expect(model.boolValue).to.equal(boolValue);
            expect(model.stringValue).to.equal(stringValue);
        });
    });

    it('parses query parameters', () => {
        const numberValue = 600;
        const stringValue = 'the-string';

        return verifyGetRequest(`/GetTest/1/true/testing?booleanParam=true&stringParam=test1234&numberParam=${numberValue}&optionalStringParam=${stringValue}`, (err, res) => {
            const model = res.body as TestModel;
            expect(model.optionalString).to.equal(stringValue);
        });
    });

    it('parsed body parameters', () => {
        const data: TestModel = {
            boolArray: [true, false],
            boolValue: false,
            id: 1,
            modelValue: { email: 'test@test.com', id: 2 },
            modelsArray: [ { email: 'test@test.com', id: 1 } ],
            numberArray: [1, 2],
            numberValue: 5,
            optionalString: 'test1234',
            stringArray: ['test', 'testtwo'],
            stringValue: 'test1234'
        };

        return verifyPostRequest('/PostTest', {
            model: data
        }, (err: any, res: any) => {
            const model = res.body as TestModel;
            expect(model).to.deep.equal(model);
        });
    });

    it('returns error if missing required path parameter', () => {
        return verifyGetRequest(`/GetTest/${1}/${true}?booleanParam=true&stringParam=test1234`, (err: any, res: any) => {
            expect(err).to.contain('Cannot GET');
        }, 404);
    });

    function verifyGetRequest(path: string, verifyResponse: (err: any, res: request.Response) => any, expectedStatus?: number) {
        return verifyRequest(verifyResponse, request => request.get(path), expectedStatus);
    }

    function verifyPostRequest(path: string, data: any, verifyResponse: (err: any, res: request.Response) => any, expectedStatus?: number) {
        return verifyRequest(verifyResponse, request => request.post(path).send(data), expectedStatus);
    }

    function verifyRequest(
        verifyResponse: (err: any, res: request.Response) => any,
        methodOperation: (request: request.SuperTest) => request.Test,
        expectedStatus?: number
    ) {
        expectedStatus = expectedStatus || 200;
        return new Promise((resolve, reject) => {
            methodOperation(request(app))
                .expect(expectedStatus)
                .end((err, res) => {
                    let parsedError: any;
                    try {
                        parsedError = JSON.parse((res.error as any).text);
                    } catch (err) {
                        parsedError = (res.error as any).text;
                    }

                    if (err) {
                        reject({
                            error: err,
                            response: parsedError
                        });
                        return;
                    }

                    verifyResponse(parsedError, res);
                    resolve();
                });
        });
    }
});
