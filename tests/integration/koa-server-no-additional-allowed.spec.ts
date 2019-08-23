import { expect } from 'chai';
import 'mocha';
import * as request from 'supertest';
import { server } from '../fixtures/koaNoAdditional/server';
import { Gender, GenericRequest, ParameterTestModel, TestModel, ValidateMapStringToAny, ValidateMapStringToNumber, ValidateModel } from '../fixtures/testModel';

const basePath = '/v1';

describe('Koa Server (with noImplicitAdditionalProperties turned on)', () => {
  // While the purpose of this file (koa-server-no-additional-allowed.spec.ts) is to test the validation of POST bodies, we should have at least one GET test
  it('can handle get request to root controller`s path', () => {
    return verifyGetRequest(basePath, (err, res) => {
      const model = res.body as TestModel;
      expect(model.id).to.equal(1);
    });
  });

  it('should call out any additionalProperties', () => {
    const data = Object.assign({}, getFakeModel(), {
      someExtraProperty: 'someExtraValue',
    });

    return verifyPostRequest(
      basePath + '/PostTest',
      data,
      (err: any, res: any) => {
        const body = JSON.parse(err.text);
        expect(body.fields['model..someExtraProperty'].message).to.eql('"someExtraProperty" is an excess property and therefore is not allowed');
      },
      400,
    );
  });

  it('should call out any additionalProperties on Unions', () => {
    const data = {
      ...getFakeModel(),
      mixedUnion: { value1: 'hello', value2: 'extra' },
    };

    return verifyPostRequest(
      basePath + '/PostTest',
      data,
      (err: any, res: any) => {
        const body = JSON.parse(err.text);
        expect(body.fields['model.mixedUnion'].message).to.include('Could not match the union against any of the items.');
      },
      400,
    );
  });

  it('should be okay if there are no additionalProperties', () => {
    const data = getFakeModel();

    return verifyPostRequest(basePath + '/PostTest', data, (err: any, res: any) => {
      expect(err).to.equal(false);
      const model = res.body as TestModel;
      expect(model).to.deep.equal(data);
    });
  });

  it('correctly returns status code', () => {
    const data = getFakeModel();
    const path = basePath + '/PostTest/WithDifferentReturnCode';
    return verifyPostRequest(
      path,
      data,
      () => {
        return;
      },
      201,
    );
  });

  it('should reject invalid strings', () => {
    const invalidValues = [null, 1, undefined, {}];

    return Promise.all(
      invalidValues.map((value: any) => {
        const data = getFakeModel();
        data.stringValue = value;

        return verifyPostRequest(basePath + '/PostTest', data, () => null, 400);
      }),
    );
  });

  it('should reject invalid dates', () => {
    const invalidValues = [1, {}];

    return Promise.all(
      invalidValues.map((value: any) => {
        const data = getFakeModel();
        data.dateValue = value;

        return verifyPostRequest(basePath + '/PostTest', data, (err: any, res: any) => null, 400);
      }),
    );
  });

  it('should reject invalid numbers', () => {
    const invalidValues = ['test', null, undefined, {}];

    return Promise.all(
      invalidValues.map((value: any) => {
        const data = getFakeModel();
        data.numberValue = value;

        return verifyPostRequest(basePath + '/PostTest', data, (err: any, res: any) => null, 400);
      }),
    );
  });

  it('returns error if invalid request', () => {
    const data = getFakeModel();
    data.dateValue = 1 as any;

    return verifyPostRequest(
      basePath + '/PostTest',
      data,
      (err: any, res: any) => {
        const body = JSON.parse(err.text);
        expect(body.fields['model.dateValue'].message).to.equal('invalid ISO 8601 datetime format, i.e. YYYY-MM-DDTHH:mm:ss');
        expect(body.fields['model.dateValue'].value).to.equal(1);
      },
      400,
    );
  });

  describe('Validate', () => {
    it('should valid model validate', () => {
      const bodyModel = new ValidateModel();
      bodyModel.floatValue = 1.2;
      bodyModel.doubleValue = 1.2;
      bodyModel.intValue = 120;
      bodyModel.longValue = 120;
      bodyModel.booleanValue = true;
      bodyModel.arrayValue = [0, 2];
      bodyModel.dateValue = new Date('2017-01-01');
      bodyModel.datetimeValue = new Date('2017-01-01T00:00:00');

      bodyModel.numberMax10 = 10;
      bodyModel.numberMin5 = 5;
      bodyModel.stringMax10Lenght = 'abcdef';
      bodyModel.stringMin5Lenght = 'abcdef';
      bodyModel.stringPatternAZaz = 'aBcD';

      bodyModel.arrayMax5Item = [0, 1, 2, 3];
      bodyModel.arrayMin2Item = [0, 1];
      bodyModel.arrayUniqueItem = [0, 1, 2, 3];
      bodyModel.model = { value1: 'abcdef' };
      bodyModel.mixedUnion = { value1: '' };

      return verifyPostRequest(
        basePath + `/Validate/body`,
        bodyModel,
        (err, res) => {
          const { body } = res;

          expect(body.floatValue).to.equal(bodyModel.floatValue);
          expect(body.doubleValue).to.equal(bodyModel.doubleValue);
          expect(body.intValue).to.equal(bodyModel.intValue);
          expect(body.longValue).to.equal(bodyModel.longValue);
          expect(body.booleanValue).to.equal(bodyModel.booleanValue);
          expect(body.arrayValue).to.deep.equal(bodyModel.arrayValue);

          expect(new Date(body.dateValue)).to.deep.equal(new Date(bodyModel.dateValue));
          expect(new Date(body.datetimeValue)).to.deep.equal(new Date(bodyModel.datetimeValue));

          expect(body.numberMax10).to.equal(bodyModel.numberMax10);
          expect(body.numberMin5).to.equal(bodyModel.numberMin5);
          expect(body.stringMax10Lenght).to.equal(bodyModel.stringMax10Lenght);
          expect(body.stringMin5Lenght).to.equal(bodyModel.stringMin5Lenght);
          expect(body.stringPatternAZaz).to.equal(bodyModel.stringPatternAZaz);

          expect(body.arrayMax5Item).to.deep.equal(bodyModel.arrayMax5Item);
          expect(body.arrayMin2Item).to.deep.equal(bodyModel.arrayMin2Item);
          expect(body.arrayUniqueItem).to.deep.equal(bodyModel.arrayUniqueItem);
          expect(body.model).to.deep.equal(bodyModel.model);
          expect(body.mixedUnion).to.deep.equal(bodyModel.mixedUnion);
        },
        200,
      );
    });

    it('should validate string-to-number dictionary body', () => {
      const data: ValidateMapStringToNumber = {
        key1: 0,
        key2: 1,
        key3: -1,
      };
      const SUCCESS_BECAUSE_DICTIONARIES_ALLOW_ADDITIONAL_PROPERTIES = 200;
      return verifyPostRequest(basePath + '/Validate/map', data, (err, res) => null, SUCCESS_BECAUSE_DICTIONARIES_ALLOW_ADDITIONAL_PROPERTIES);
    });

    it('should reject string-to-string dictionary body', () => {
      const data: object = {
        key1: 'val0',
        key2: 'val1',
        key3: '-val1',
      };
      return verifyPostRequest(
        basePath + '/Validate/map',
        data,
        err => {
          const body = JSON.parse(err.text);

          // Although dictionaries/records allow additionalProperties they are still subject to their own validation
          const excessPropertyErrMessage = `"key1" is an excess property and therefore is not allowed`;
          const expectedErrorMessage = 'No matching model found in additionalProperties to validate key1';
          expect(body.fields['map..key1'].message).not.to.eql(excessPropertyErrMessage);
          expect(body.fields['map..key1'].message).to.eql(expectedErrorMessage);
        },
        400,
      );
    });

    it('should validate string-to-any dictionary body', () => {
      const data: ValidateMapStringToAny = {
        key1: '0',
        key2: 1,
        key3: -1,
      };

      const SUCCESS_BECAUSE_ANY_ACCEPTS_ADDITIONAL_PROPERTIES = 200;
      return verifyPostRequest(basePath + '/Validate/mapAny', data, (err, res) => null, SUCCESS_BECAUSE_ANY_ACCEPTS_ADDITIONAL_PROPERTIES);
    });

    it('should validate string-to-any dictionary body with falsy values', () => {
      const data: ValidateMapStringToAny = {
        array: [],
        false: false,
        null: null,
        string: '',
        zero: 0,
      };
      return verifyPostRequest(
        basePath + '/Validate/mapAny',
        data,
        (err, res) => {
          const response = res.body as any[];
          expect(response.sort()).to.eql([[], '', 0, false, null]);
        },
        200,
      );
    });
  });

  describe('Parameter data', () => {
    it('parses body parameters', () => {
      const data: ParameterTestModel = {
        age: 45,
        firstname: 'Tony',
        gender: Gender.MALE,
        human: true,
        lastname: 'Stark',
        weight: 82.1,
      };
      return verifyPostRequest(
        basePath + '/ParameterTest/Body',
        data,
        (err, res) => {
          const model = res.body as ParameterTestModel;
          expect(model.firstname).to.equal('Tony');
          expect(model.lastname).to.equal('Stark');
          expect(model.age).to.equal(45);
          expect(model.weight).to.equal(82.1);
          expect(model.human).to.equal(true);
          expect(model.gender).to.equal(Gender.MALE);
        },
        200,
      );
    });

    it('parses body props parameters', () => {
      const data: ParameterTestModel = {
        age: 45,
        firstname: 'Tony',
        gender: Gender.MALE,
        human: true,
        lastname: 'Stark',
        weight: 82.1,
      };
      return verifyPostRequest(
        basePath + '/ParameterTest/BodyProps',
        data,
        (err, res) => {
          const model = res.body as ParameterTestModel;
          expect(model.firstname).to.equal('Tony');
          expect(model.lastname).to.equal('Stark');
          expect(model.age).to.equal(45);
          expect(model.weight).to.equal(82.1);
          expect(model.human).to.equal(true);
          expect(model.gender).to.equal(Gender.MALE);
        },
        200,
      );
    });

    it('can post request with a generic body', () => {
      const data: GenericRequest<TestModel> = {
        name: 'something',
        value: getFakeModel(),
      };
      return verifyPostRequest(basePath + '/PostTest/GenericBody', data, (err, res) => {
        const model = res.body as TestModel;
        expect(model.id).to.equal(1);
      });
    });
  });

  it('shutdown server', () => server.close());

  function verifyGetRequest(path: string, verifyResponse: (err: any, res: request.Response) => any, expectedStatus?: number) {
    return verifyRequest(verifyResponse, request => request.get(path), expectedStatus);
  }

  function verifyPostRequest(path: string, data: any, verifyResponse: (err: any, res: request.Response) => any, expectedStatus?: number) {
    return verifyRequest(verifyResponse, request => request.post(path).send(data), expectedStatus);
  }

  function verifyRequest(verifyResponse: (err: any, res: request.Response) => any, methodOperation: (request: request.SuperTest<any>) => request.Test, expectedStatus = 200) {
    return new Promise((resolve, reject) => {
      methodOperation(request(server))
        .expect(expectedStatus)
        .end((err: any, res: any) => {
          let parsedError: any;

          try {
            parsedError = JSON.parse(res.error as any);
          } catch (err) {
            parsedError = res.error as any;
          }

          if (err) {
            reject({
              error: err,
              response: parsedError,
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
      and: { value1: 'foo', value2: 'bar' },
      boolArray: [true, false],
      boolValue: false,
      id: 1,
      modelValue: { email: 'test@test.com', id: 2 },
      modelsArray: [{ email: 'test@test.com', id: 1 }],
      numberArray: [1, 2],
      numberValue: 5,
      object: { foo: 'bar' },
      objectArray: [{ foo1: 'bar1' }, { foo2: 'bar2' }],
      optionalString: 'test1234',
      or: { value1: 'Foo' },
      referenceAnd: { value1: 'foo', value2: 'bar' },
      strLiteralArr: ['Foo', 'Bar'],
      strLiteralVal: 'Foo',
      stringArray: ['test', 'testtwo'],
      stringValue: 'test1234',
    };
  }
});
