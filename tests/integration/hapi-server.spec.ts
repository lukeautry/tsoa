import 'mocha';
import { server } from '../fixtures/hapi/server';
import { TestModel, TestClassModel } from '../fixtures/testModel';
import * as chai from 'chai';
import * as request from 'supertest';

const expect = chai.expect;
const basePath = '/v1';

describe('Server', () => {
  it('can handle get request with no path argument', () => {
    return verifyGetRequest(basePath + '/GetTest', (err, res) => {
      const model = res.body as TestModel;
      expect(model.id).to.equal(1);
    });
  });

  it('can handle get request with path argument', () => {
    return verifyGetRequest(basePath + '/GetTest/Current', (err, res) => {
      const model = res.body as TestModel;
      expect(model.id).to.equal(1);
    });
  });

  it('can handle get request with collection return value', () => {
    return verifyGetRequest(basePath + '/GetTest/Multi', (err, res) => {
      const models = res.body as TestModel[];
      expect(models.length).to.equal(3);
      models.forEach(m => {
        expect(m.id).to.equal(1);
      });
    });
  });

  it('can handle get request with path and query parameters', () => {
    return verifyGetRequest(basePath + `/GetTest/${1}/${true}/test?booleanParam=true&stringParam=test1234&numberParam=1234`, (err, res) => {
      const model = res.body as TestModel;
      expect(model.id).to.equal(1);
    });
  });

  it('returns error if missing required query parameter', () => {
    return verifyGetRequest(basePath + `/GetTest/${1}/${true}/test?booleanParam=true&stringParam=test1234`, (err: any, res: any) => {
      expect(JSON.parse(err.text).message).to.equal('numberParam is a required parameter.');
    }, 400);
  });

  it('parses path parameters', () => {
    const numberValue = 600;
    const boolValue = false;
    const stringValue = 'the-string';

    return verifyGetRequest(basePath + `/GetTest/${numberValue}/${boolValue}/${stringValue}?booleanParam=true&stringParam=test1234&numberParam=1234`, (err, res) => {
      const model = res.body as TestModel;
      expect(model.numberValue).to.equal(numberValue);
      expect(model.boolValue).to.equal(boolValue);
      expect(model.stringValue).to.equal(stringValue);
    });
  });

  it('parses query parameters', () => {
    const numberValue = 600;
    const stringValue = 'the-string';

    return verifyGetRequest(basePath + `/GetTest/1/true/testing?booleanParam=true&stringParam=test1234&numberParam=${numberValue}&optionalStringParam=${stringValue}`, (err, res) => {
      const model = res.body as TestModel;
      expect(model.optionalString).to.equal(stringValue);
    });
  });

  it('parsed body parameters', () => {
    const data = getFakeModel();

    return verifyPostRequest(basePath + '/PostTest', data, (err: any, res: any) => {
      const model = res.body as TestModel;
      expect(model).to.deep.equal(model);
    });
  });

  it('parses class model as body parameter', () => {
    const data = getFakeClassModel();

    return verifyPostRequest(basePath + '/PostTest/WithClassModel', data, (err: any, res: any) => {
      const model = res.body as TestClassModel;
      expect(model.id).to.equal(700); // this gets changed on the server
    });
  });

  it('should reject invalid strings', () => {
    const invalidValues = [null, 1, undefined, {}];

    return Promise.all(invalidValues.map((value: any) => {
      const data = getFakeModel();
      data.stringValue = value;

      return verifyPostRequest(basePath + '/PostTest', data, (err: any, res: any) => null, 400);
    }));
  });

  it('should parse valid date', () => {
    const data = getFakeModel();
    data.dateValue = '2016-01-01T00:00:00Z' as any;

    return verifyPostRequest(basePath + '/PostTest', data, (err: any, res: any) => {
      expect(res.body.dateValue).to.equal('2016-01-01T00:00:00.000Z');
    }, 200);
  });

  it('should parse valid date as query param', () => {
    return verifyGetRequest(basePath + '/GetTest/DateParam?date=2016-01-01T00:00:00Z', (err: any, res: any) => {
      expect(res.body.dateValue).to.equal('2016-01-01T00:00:00.000Z');
    }, 200);
  });

  it('should reject invalid dates', () => {
    const invalidValues = [1, {}];

    return Promise.all(invalidValues.map((value: any) => {
      const data = getFakeModel();
      data.dateValue = value;

      return verifyPostRequest(basePath + '/PostTest', data, (err: any, res: any) => null, 400);
    }));
  });

  it('should reject invalid numbers', () => {
    const invalidValues = ['test', null, undefined, {}];

    return Promise.all(invalidValues.map((value: any) => {
      const data = getFakeModel();
      data.numberValue = value;

      return verifyPostRequest(basePath + '/PostTest', data, (err: any, res: any) => null, 400);
    }));
  });

  it('returns error if missing required path parameter', () => {
    return verifyGetRequest(basePath + `/GetTest/${1}/${true}?booleanParam=true&stringParam=test1234`, (err: any, res: any) => {
      expect(JSON.parse(err.text).error).to.equal('Not Found');
    }, 404);
  });

  it('returns error if invalid request', () => {
    const data = getFakeModel();
    data.dateValue = 1 as any;

    return verifyPostRequest(basePath + '/PostTest', data, (err: any, res: any) => {
      expect(JSON.parse(err.text).message).to.equal('dateValue should be a valid ISO 8601 date, i.e. YYYY-MM-DDTHH:mm:ss');
    }, 400);
  });

  it('returns error if thrown in controller', () => {
    return verifyGetRequest(basePath + '/GetTest/ThrowsError', (err: any, res: any) => {
      expect(JSON.parse(err.text).message).to.equal('error thrown');
    }, 400);
  });

  function verifyGetRequest(path: string, verifyResponse: (err: any, res: request.Response) => any, expectedStatus?: number) {
    return verifyRequest(verifyResponse, request => request.get(path), expectedStatus);
  }

  function verifyPostRequest(path: string, data: any, verifyResponse: (err: any, res: request.Response) => any, expectedStatus?: number) {
    return verifyRequest(verifyResponse, request => request.post(path).send(data), expectedStatus);
  }

  function verifyRequest(
    verifyResponse: (err: any, res: any) => any,
    methodOperation: (request: request.SuperTest<any>) => request.Test,
    expectedStatus = 200
  ) {
    return new Promise((resolve, reject) => {
      methodOperation(request(server.listener))
        .expect(expectedStatus)
        .end((err: any, res: any) => {
          let parsedError: any;
          try {
            parsedError = JSON.parse((res.error as any));
          } catch (err) {
            parsedError = (res.error as any);
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

  function getFakeModel(): TestModel {
    return {
      boolArray: [true, false],
      boolValue: false,
      id: 1,
      modelValue: { email: 'test@test.com', id: 2 },
      modelsArray: [{ email: 'test@test.com', id: 1 }],
      numberArray: [1, 2],
      numberValue: 5,
      optionalString: 'test1234',
      stringArray: ['test', 'testtwo'],
      stringValue: 'test1234'
    };
  }

  function getFakeClassModel() {
    const model = new TestClassModel('test', 'test', 'test');
    model.id = 100;
    model.publicStringProperty = 'test';
    model.stringProperty = 'test';

    return model;
  }
});
