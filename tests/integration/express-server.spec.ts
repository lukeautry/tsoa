import { expect } from 'chai';
import 'mocha';
import * as request from 'supertest';
import { base64image } from '../fixtures/base64image';
import { app } from '../fixtures/express/server';
import { File } from '@tsoa/runtime';
import {
  Gender,
  GenericModel,
  GenericRequest,
  ParameterTestModel,
  TestClassModel,
  TestModel,
  UserResponseModel,
  ValidateMapStringToAny,
  ValidateMapStringToNumber,
  ValidateModel,
} from '../fixtures/testModel';
import { stateOf } from '../fixtures/controllers/middlewaresExpressController';
import { state } from '../fixtures/controllers/middlewaresHierarchyController';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const basePath = '/v1';

describe('Express Server', () => {
  it('can handle get request to root controller`s path', () => {
    return verifyGetRequest(basePath + '/', (err, res) => {
      const model = res.body as TestModel;
      expect(model.id).to.equal(1);
    });
  });

  it('can handle get request to root controller`s method path', () => {
    return verifyGetRequest(basePath + '/rootControllerMethodWithPath', (err, res) => {
      const model = res.body as TestModel;
      expect(model.id).to.equal(1);
    });
  });

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

  it('respects toJSON for class serialization', () => {
    return verifyGetRequest(basePath + '/GetTest/SimpleClassWithToJSON', (err, res) => {
      const getterClass = res.body;
      expect(getterClass).to.haveOwnProperty('a');
      expect(getterClass.a).to.equal('hello, world');
      expect(getterClass).to.not.haveOwnProperty('b');
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

  it('injects express request in parameters', () => {
    return verifyGetRequest(basePath + `/GetTest/Request`, (err, res) => {
      const model = res.body as TestModel;
      expect(model.id).to.equal(1);
      expect(model.stringValue).to.equal('fancyStringForContext');
    });
  });

  it('returns error if missing required query parameter', () => {
    return verifyGetRequest(
      basePath + `/GetTest/${1}/${true}/test?booleanParam=true&stringParam=test1234`,
      (err: any, res: any) => {
        const body = JSON.parse(err.text);
        expect(body.fields.numberParam.message).to.equal(`'numberParam' is required`);
      },
      400,
    );
  });

  it('returns error and custom error message', () => {
    return verifyGetRequest(
      basePath + `/GetTest/${1}/${true}/test?booleanParam=true&numberParam=1234`,
      (err: any, res: any) => {
        const body = JSON.parse(err.text);
        expect(body.fields.stringParam.message).to.equal(`Custom error message`);
      },
      400,
    );
  });

  it('parses path parameters', () => {
    const numberValue = 10;
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
    const numberValue = 10;
    const stringValue = 'the-string';

    return verifyGetRequest(basePath + `/GetTest/1/true/testing?booleanParam=true&stringParam=test1234&numberParam=${numberValue}&optionalStringParam=${stringValue}`, (err, res) => {
      const model = res.body as TestModel;
      expect(model.optionalString).to.equal(stringValue);
    });
  });

  it('Should return on @Res', () => {
    return verifyGetRequest(
      basePath + '/GetTest/Res',
      (err, res) => {
        const model = res.body as TestModel;
        expect(model.id).to.equal(1);
        expect(res.get('custom-header')).to.eq('hello');
      },
      400,
    );
  });

  [400, 500].forEach(statusCode =>
    it('Should support multiple status codes with the same @Res structure', () => {
      return verifyGetRequest(
        basePath + `/GetTest/MultipleStatusCodeRes?statusCode=${statusCode}`,
        (err, res) => {
          const model = res.body as TestModel;
          expect(model.id).to.equal(1);
          expect(res.get('custom-header')).to.eq('hello');
        },
        statusCode,
      );
    }),
  );

  it('Should not modify the response after headers sent', () => {
    return verifyGetRequest(
      basePath + '/GetTest/MultipleRes',
      (err, res) => {
        const model = res.body as TestModel;
        expect(model.id).to.equal(1);
        expect(res.get('custom-header')).to.eq('hello');
      },
      400,
    );
  });

  it('parses buffer parameter', () => {
    return verifyGetRequest(`${basePath}/GetTest/HandleBufferType?buffer=${base64image}`, (err, res) => {
      return;
    });
  });

  it('returns streamed responses', () => {
    return verifyGetRequest(`${basePath}/GetTest/HandleStreamType`, (err, res) => {
      expect(res.text).to.equal('testbuffer');
      return;
    });
  });

  it('should reject invalid additionalProperties', () => {
    const invalidValues = ['invalid', null, [], 1, { foo: null }, { foo: 1 }, { foo: [] }, { foo: {} }, { foo: { foo: 'bar' } }];

    return Promise.all(
      invalidValues.map((value: any) => {
        return verifyPostRequest(basePath + '/PostTest/Object', { obj: value }, (err: any, res: any) => null, 400);
      }),
    );
  });

  it('parsed body parameters', () => {
    const data = getFakeModel();

    return verifyPostRequest(basePath + '/PostTest', data, (err: any, res: any) => {
      const model = res.body as TestModel;
      expect(model).to.deep.equal(model);
    });
  });

  it('removes additional properties', () => {
    const model = getFakeModel();
    const data = {
      ...model,
      objLiteral: {
        ...model.objLiteral,
        extra: 123,
        nested: {
          bool: true,
          allNestedOptional: {},
          anotherExtra: 123,
        },
      },
    };

    return verifyPostRequest(basePath + '/PostTest', data, (err: any, res: any) => {
      const resModel = res.body as TestModel;
      expect(resModel).to.deep.equal({
        ...model,
        objLiteral: {
          ...model.objLiteral,
          nested: {
            bool: true,
            allNestedOptional: {},
          },
        },
      });
      expect(res.status).to.eq(200);
    });
  });

  it('correctly returns status code', () => {
    const data = getFakeModel();
    const path = basePath + '/PostTest/WithDifferentReturnCode';
    return verifyPostRequest(
      path,
      data,
      (err, res) => {
        return;
      },
      201,
    );
  });

  it('parses class model as body parameter', () => {
    const data = getFakeClassModel();

    return verifyPostRequest(basePath + '/PostTest/WithClassModel', data, (err: any, res: any) => {
      const model = res.body as TestClassModel;
      expect(model.id).to.equal(700); // this gets changed on the server
    });
  });

  it('correctly handles OPTIONS requests', () => {
    const path = basePath + '/OptionsTest/Current';
    return verifyRequest(
      (err, res) => {
        expect(res.text).to.equal('');
      },
      request => request.options(path),
      204,
    );
  });

  it('should reject invalid strings', () => {
    const invalidValues = [null, 1, undefined, {}];

    return Promise.all(
      invalidValues.map((value: any) => {
        const data = getFakeModel();
        data.stringValue = value;

        return verifyPostRequest(basePath + '/PostTest', data, (err: any, res: any) => null, 400);
      }),
    );
  });

  it('should parse valid date', () => {
    const data = getFakeModel();
    data.dateValue = '2016-01-01T00:00:00Z' as any;

    return verifyPostRequest(
      basePath + '/PostTest',
      data,
      (err: any, res: any) => {
        expect(res.body.dateValue).to.equal('2016-01-01T00:00:00.000Z');
      },
      200,
    );
  });

  it('should parse valid date as query param', () => {
    return verifyGetRequest(
      basePath + '/GetTest/DateParam?date=2016-01-01T00:00:00Z',
      (err: any, res: any) => {
        expect(res.body.dateValue).to.equal('2016-01-01T00:00:00.000Z');
      },
      200,
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

  it('returns error if missing required path parameter', () => {
    return verifyGetRequest(
      basePath + `/GetTest/${1}/${true}?booleanParam=true&stringParam=test1234`,
      (err: any, res: any) => {
        expect(err.text).to.contain('Cannot GET');
      },
      404,
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

  it('returns error if thrown in controller', () => {
    return verifyGetRequest(
      basePath + '/GetTest/ThrowsError',
      (err: any, res: any) => {
        const body = JSON.parse(err.text);
        expect(body.message).to.equal('error thrown');
      },
      400,
    );
  });

  it('can invoke middlewares installed in routes and paths', () => {
    expect(stateOf('route')).to.be.undefined;
    return verifyGetRequest(
      basePath + '/MiddlewareTestExpress/test1',
      (err, res) => {
        expect(stateOf('route')).to.be.true;
        expect(stateOf('test1')).to.be.true;
      },
      204,
    );
  });

  it('can invoke middlewares in the order they are defined by controller class hierarchy', () => {
    expect(state()).to.be.empty;
    return verifyGetRequest(
      basePath + '/MiddlewareHierarchyTestExpress/test1',
      (err, res) => {
        const expected = ['base', 'intermediate', 'route', 'test1'];
        expect(state()).to.eql(expected);
      },
      204,
    );
  });

  describe('Controller', () => {
    it('should normal status code', () => {
      return verifyGetRequest(
        basePath + `/Controller/normalStatusCode`,
        (err, res) => {
          expect(res.status).to.equal(200);
        },
        200,
      );
    });

    it('should normal status code with false boolean result', () => {
      return verifyGetRequest(
        basePath + `/Controller/falseStatusCode`,
        (err, res) => {
          expect(res.status).to.equal(200);
        },
        200,
      );
    });

    it('should normal status code with 0 result', () => {
      return verifyGetRequest(
        basePath + `/Controller/zeroStatusCode`,
        (err, res) => {
          expect(res.status).to.equal(200);
        },
        200,
      );
    });

    it('should no content status code', () => {
      return verifyGetRequest(
        basePath + `/Controller/noContentStatusCode`,
        (err, res) => {
          expect(res.status).to.equal(204);
        },
        204,
      );
    });

    it('should custom status code', () => {
      return verifyGetRequest(
        basePath + `/Controller/customStatusCode`,
        (err, res) => {
          expect(res.status).to.equal(205);
        },
        205,
      );
    });

    it('should custom header', () => {
      return verifyGetRequest(
        basePath + `/Controller/customHeader`,
        (err, res) => {
          expect(res.status).to.equal(204);
          expect(res.header.hero).to.equal('IronMan');
          expect(res.header.name).to.equal('Tony Stark');
          expect(res.header['set-cookie']).to.eql(['token=MY_AUTH_TOKEN;', 'refreshToken=MY_REFRESH_TOKEN;']);
        },
        204,
      );
    });
  });

  describe('NoExtends', () => {
    it('should ignore SuccessResponse code and use default code', () => {
      return verifyGetRequest(
        basePath + `/NoExtends/customSuccessResponseCode`,
        (err, res) => {
          expect(res.status).to.equal(204);
        },
        204,
      );
    });

    it('should ignore SuccessResponse enum code and use default code', () => {
      return verifyGetRequest(
        basePath + `/NoExtends/enumSuccessResponseCode`,
        (err, res) => {
          expect(res.status).to.equal(204);
        },
        204,
      );
    });

    it('should ignore SuccessResponse 2XX code and use default code', () => {
      return verifyGetRequest(
        basePath + `/NoExtends/rangedSuccessResponse`,
        (err, res) => {
          expect(res.status).to.equal(204);
        },
        204,
      );
    });
  });

  describe('Custom Content-Type', () => {
    it('should return custom content-type if given', () => {
      return verifyPostRequest(
        basePath + '/MediaTypeTest/Custom',
        { name: 'foo' },
        (err, res) => {
          expect(res.type).to.eq('application/vnd.mycompany.myapp.v2+json');
        },
        202,
      );
    });

    it('should return custom content-type based on "Accept" header', () => {
      return verifyRequest(
        (err, res) => {
          const { body, type } = res;
          expect(body.codename).to.eq('foo');
          expect(type).to.eq('application/vnd.mycompany.myapp.v4+json');
        },
        request => {
          return request.get(basePath + '/RequestAcceptHeaderTest/Multi/1').set({
            Accept: 'application/vnd.mycompany.myapp.v4+json',
          });
        },
        200,
      );
    });
  });

  describe('Validate', () => {
    it('should valid minDate and maxDate validation of date type', () => {
      const minDate = '2019-01-01';
      const maxDate = '2015-01-01';
      return verifyGetRequest(
        basePath + `/Validate/parameter/date?minDateValue=${minDate}&maxDateValue=${maxDate}`,
        (err, res) => {
          const { body } = res;
          expect(new Date(body.minDateValue)).to.deep.equal(new Date(minDate));
          expect(new Date(body.maxDateValue)).to.deep.equal(new Date(maxDate));
        },
        200,
      );
    });

    it('should invalid minDate and maxDate validation of date type', () => {
      const date = '2017-01-01';
      return verifyGetRequest(
        basePath + `/Validate/parameter/date?minDateValue=${date}&maxDateValue=${date}`,
        (err, res) => {
          const body = JSON.parse(err.text);
          expect(body.fields.minDateValue.message).to.equal(`minDate '2018-01-01'`);
          expect(body.fields.minDateValue.value).to.equal(date);
          expect(body.fields.maxDateValue.message).to.equal(`maxDate '2016-01-01'`);
          expect(body.fields.maxDateValue.value).to.equal(date);
        },
        400,
      );
    });

    it('should valid minDate and maxDate validation of datetime type', () => {
      const minDate = '2019-01-01T00:00:00';
      const maxDate = '2015-01-01T00:00:00';
      return verifyGetRequest(
        basePath + `/Validate/parameter/datetime?minDateValue=${minDate}&maxDateValue=${maxDate}`,
        (err, res) => {
          const { body } = res;
          expect(new Date(body.minDateValue)).to.deep.equal(new Date(minDate));
          expect(new Date(body.maxDateValue)).to.deep.equal(new Date(maxDate));
        },
        200,
      );
    });

    it('should invalid minDate and maxDate validation of datetime type', () => {
      const date = '2017-01-01T00:00:00';
      return verifyGetRequest(
        basePath + `/Validate/parameter/datetime?minDateValue=${date}&maxDateValue=${date}`,
        (err, res) => {
          const body = JSON.parse(err.text);
          expect(body.fields.minDateValue.message).to.equal(`minDate '2018-01-01T00:00:00'`);
          expect(body.fields.minDateValue.value).to.equal(date);
          expect(body.fields.maxDateValue.message).to.equal(`maxDate '2016-01-01T00:00:00'`);
          expect(body.fields.maxDateValue.value).to.equal(date);
        },
        400,
      );
    });

    it('should valid max and min validation of integer type', () => {
      return verifyGetRequest(
        basePath + `/Validate/parameter/integer?value=6&value_max=2`,
        (err, res) => {
          const { body } = res;
          expect(body.minValue).to.equal(6);
          expect(body.maxValue).to.equal(2);
        },
        200,
      );
    });

    it('should invalid max and min validation of integer type', () => {
      const value = 4;
      return verifyGetRequest(
        basePath + `/Validate/parameter/integer?value=${value}&value_max=${value}`,
        (err, res) => {
          const body = JSON.parse(err.text);
          expect(body.fields.value.message).to.equal('min 5');
          expect(body.fields.value.value).to.equal(String(value));
          expect(body.fields.value_max.message).to.equal('max 3');
          expect(body.fields.value_max.value).to.equal(String(value));
        },
        400,
      );
    });

    it('should valid max and min validation of float type', () => {
      return verifyGetRequest(
        basePath + `/Validate/parameter/float?minValue=5.6&maxValue=3.4`,
        (err, res) => {
          const { body } = res;
          expect(body.minValue).to.equal(5.6);
          expect(body.maxValue).to.equal(3.4);
        },
        200,
      );
    });

    it('should invalid max and min validation of float type', () => {
      const value = 4.5;
      return verifyGetRequest(
        basePath + `/Validate/parameter/float?minValue=${value}&maxValue=${value}`,
        (err, res) => {
          const body = JSON.parse(err.text);
          expect(body.fields.minValue.message).to.equal('min 5.5');
          expect(body.fields.minValue.value).to.equal(String(value));
          expect(body.fields.maxValue.message).to.equal('max 3.5');
          expect(body.fields.maxValue.value).to.equal(String(value));
        },
        400,
      );
    });

    it('should valid validation of boolean type', () => {
      return verifyGetRequest(
        basePath + `/Validate/parameter/boolean?boolValue=true`,
        (err, res) => {
          const { body } = res;
          expect(body.boolValue).to.equal(true);
        },
        200,
      );
    });

    it('should invalid validation of boolean type', () => {
      const value = 'true0001';
      return verifyGetRequest(
        basePath + `/Validate/parameter/boolean?boolValue=${value}`,
        (err, res) => {
          const body = JSON.parse(err.text);
          expect(body.fields.boolValue.message).to.equal('invalid boolean value');
          expect(body.fields.boolValue.value).to.equal(value);
        },
        400,
      );
    });

    it('should valid minLength, maxLength and pattern (quoted/unquoted) validation of string type', () => {
      return verifyGetRequest(
        basePath + `/Validate/parameter/string?minLength=abcdef&maxLength=ab&patternValue=aBcDf&quotedPatternValue=A`,
        (err, res) => {
          const { body } = res;

          expect(body.minLength).to.equal('abcdef');
          expect(body.maxLength).to.equal('ab');
          expect(body.patternValue).to.equal('aBcDf');
          expect(body.quotedPatternValue).to.equal('A');
        },
        200,
      );
    });

    it('should invalid minLength, maxLength and pattern (quoted/unquoted) validation of string type', () => {
      const value = '1234';
      return verifyGetRequest(
        basePath + `/Validate/parameter/string?minLength=${value}&maxLength=${value}&patternValue=${value}&quotedPatternValue=A@`,
        (err, res) => {
          const body = JSON.parse(err.text);

          expect(body.fields.minLength.message).to.equal('minLength 5');
          expect(body.fields.minLength.value).to.equal(value);
          expect(body.fields.maxLength.message).to.equal('maxLength 3');
          expect(body.fields.maxLength.value).to.equal(value);
          expect(body.fields.patternValue.message).to.equal("Not match in '^[a-zA-Z]+$'");
          expect(body.fields.patternValue.value).to.equal(value);
          expect(body.fields.quotedPatternValue.message).to.equal("Not match in '^([A-Z])(?!@)$'");
          expect(body.fields.quotedPatternValue.value).to.equal('A@');
        },
        400,
      );
    });

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
      bodyModel.quotedStringPatternA = 'A';

      bodyModel.arrayMax5Item = [0, 1, 2, 3];
      bodyModel.arrayMin2Item = [0, 1];
      bodyModel.arrayUniqueItem = [0, 1, 2, 3];
      bodyModel.model = { value1: 'abcdef' };
      bodyModel.mixedUnion = { value1: '' };
      bodyModel.intersection = { value1: 'one', value2: 'two' };
      bodyModel.singleBooleanEnum = true;

      bodyModel.nestedObject = {
        floatValue: 1.2,
        doubleValue: 1.2,
        intValue: 120,
        longValue: 120,
        booleanValue: true,
        arrayValue: [0, 2],
        dateValue: new Date('2017-01-01'),
        datetimeValue: new Date('2017-01-01T00:00:00'),

        numberMax10: 10,
        numberMin5: 5,
        stringMax10Lenght: 'abcdef',
        stringMin5Lenght: 'abcdef',
        stringPatternAZaz: 'aBcD',
        quotedStringPatternA: 'A',

        arrayMax5Item: [0, 1, 2, 3],
        arrayMin2Item: [0, 1],
        arrayUniqueItem: [0, 1, 2, 3],
        model: { value1: 'abcdef' },
        mixedUnion: { value1: '' },
        intersection: { value1: 'one', value2: 'two' },
      };

      bodyModel.typeAliases = {
        word: 'word',
        fourtyTwo: 42,
        intersectionAlias: { value1: 'value1', value2: 'value2' },
        unionAlias: { value2: 'value2' },
        nOLAlias: { value1: 'value1', value2: 'value2' },
        genericAlias: 'genericString',
        genericAlias2: {
          id: 1,
        },
        forwardGenericAlias: { value1: 'value1' },
      };

      bodyModel.nullableTypes = {
        numberOrNull: ('null' as unknown) as null,
        wordOrNull: null,
        maybeString: null,
        justNull: null,
      };

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
          expect(body.quotedStringPatternA).to.equal(bodyModel.quotedStringPatternA);

          expect(body.arrayMax5Item).to.deep.equal(bodyModel.arrayMax5Item);
          expect(body.arrayMin2Item).to.deep.equal(bodyModel.arrayMin2Item);
          expect(body.arrayUniqueItem).to.deep.equal(bodyModel.arrayUniqueItem);
          expect(body.model).to.deep.equal(bodyModel.model);
          expect(body.mixedUnion).to.deep.equal(bodyModel.mixedUnion);
          expect(body.intersection).to.deep.equal(bodyModel.intersection);
          expect(body.singleBooleanEnum).to.deep.equal(bodyModel.singleBooleanEnum);

          expect(body.nestedObject.floatValue).to.equal(bodyModel.nestedObject.floatValue);
          expect(body.nestedObject.doubleValue).to.equal(bodyModel.nestedObject.doubleValue);
          expect(body.nestedObject.intValue).to.equal(bodyModel.nestedObject.intValue);
          expect(body.nestedObject.longValue).to.equal(bodyModel.nestedObject.longValue);
          expect(body.nestedObject.booleanValue).to.equal(bodyModel.nestedObject.booleanValue);
          expect(body.nestedObject.arrayValue).to.deep.equal(bodyModel.nestedObject.arrayValue);

          expect(new Date(body.nestedObject.dateValue)).to.deep.equal(new Date(bodyModel.nestedObject.dateValue));
          expect(new Date(body.nestedObject.datetimeValue)).to.deep.equal(new Date(bodyModel.nestedObject.datetimeValue));

          expect(body.nestedObject.numberMax10).to.equal(bodyModel.nestedObject.numberMax10);
          expect(body.nestedObject.numberMin5).to.equal(bodyModel.nestedObject.numberMin5);
          expect(body.nestedObject.stringMax10Lenght).to.equal(bodyModel.nestedObject.stringMax10Lenght);
          expect(body.nestedObject.stringMin5Lenght).to.equal(bodyModel.nestedObject.stringMin5Lenght);
          expect(body.nestedObject.stringPatternAZaz).to.equal(bodyModel.nestedObject.stringPatternAZaz);
          expect(body.nestedObject.quotedStringPatternA).to.equal(bodyModel.nestedObject.quotedStringPatternA);

          expect(body.nestedObject.arrayMax5Item).to.deep.equal(bodyModel.nestedObject.arrayMax5Item);
          expect(body.nestedObject.arrayMin2Item).to.deep.equal(bodyModel.nestedObject.arrayMin2Item);
          expect(body.nestedObject.arrayUniqueItem).to.deep.equal(bodyModel.nestedObject.arrayUniqueItem);
          expect(body.nestedObject.model).to.deep.equal(bodyModel.nestedObject.model);
          expect(body.nestedObject.mixedUnion).to.deep.equal(bodyModel.nestedObject.mixedUnion);
          expect(body.nestedObject.intersection).to.deep.equal(bodyModel.nestedObject.intersection);
          expect(body.typeAliases).to.deep.equal(bodyModel.typeAliases);

          expect(body.nullableTypes.numberOrNull).to.equal(null);
          expect(body.nullableTypes.wordOrNull).to.equal(bodyModel.nullableTypes.wordOrNull);
          expect(body.nullableTypes.maybeString).to.equal(bodyModel.nullableTypes.maybeString);
          expect(body.nullableTypes.justNull).to.equal(bodyModel.nullableTypes.justNull);
        },
        200,
      );
    });

    it('should invalid model validate', () => {
      const bodyModel = new ValidateModel();
      bodyModel.floatValue = '120a' as any;
      bodyModel.doubleValue = '120a' as any;
      bodyModel.intValue = 1.2;
      bodyModel.longValue = 1.2;
      bodyModel.booleanValue = 'abc' as any;
      bodyModel.dateValue = 'abc' as any;
      bodyModel.datetimeValue = 'abc' as any;

      bodyModel.numberMax10 = 20;
      bodyModel.numberMin5 = 0;
      bodyModel.stringMax10Lenght = 'abcdefghijk';
      bodyModel.stringMin5Lenght = 'abcd';
      bodyModel.stringPatternAZaz = 'ab01234';
      bodyModel.quotedStringPatternA = 'A';

      bodyModel.arrayMax5Item = [0, 1, 2, 3, 4, 6, 7, 8, 9];
      bodyModel.arrayMin2Item = [0];
      bodyModel.arrayUniqueItem = [0, 0, 1, 1];
      bodyModel.model = 1 as any;
      bodyModel.mixedUnion = 123 as any;
      bodyModel.intersection = { value1: 'one' } as any;
      bodyModel.singleBooleanEnum = false as true;

      bodyModel.nestedObject = {
        floatValue: '120a' as any,
        doubleValue: '120a' as any,
        intValue: 1.2,
        longValue: 1.2,
        booleanValue: 'abc' as any,
        dateValue: 'abc' as any,
        datetimeValue: 'abc' as any,

        numberMax10: 20,
        numberMin5: 0,
        stringMax10Lenght: 'abcdefghijk',
        stringMin5Lenght: 'abcd',
        stringPatternAZaz: 'ab01234',
        quotedStringPatternA: 'A@',

        arrayMax5Item: [0, 1, 2, 3, 4, 6, 7, 8, 9],
        arrayMin2Item: [0],
        arrayUniqueItem: [0, 0, 1, 1],
        model: 1 as any,
        mixedUnion: 123 as any,
        intersection: { value1: 'one' } as any,
      } as any;

      bodyModel.typeAliases = {
        word: '',
        fourtyTwo: 41,
        intersectionAlias: { value2: 'value2' },
        unionAlias: {},
        nOLAlias: true,
        genericAlias: new ValidateModel(),
        genericAlias2: {
          id2: 2,
        },
        forwardGenericAlias: 123,
      } as any;

      bodyModel.nullableTypes = {
        // numberOrNull
        wordOrNull: '',
        maybeString: 1,
        justNull: undefined,
      } as any;

      return verifyPostRequest(
        basePath + `/Validate/body`,
        bodyModel,
        (err, res) => {
          const body = JSON.parse(err.text);

          expect(body.fields['body.floatValue'].message).to.equal('Invalid float error message.');
          expect(body.fields['body.floatValue'].value).to.equal(bodyModel.floatValue);
          expect(body.fields['body.doubleValue'].message).to.equal('Invalid double error message.');
          expect(body.fields['body.doubleValue'].value).to.equal(bodyModel.doubleValue);
          expect(body.fields['body.intValue'].message).to.equal('invalid integer number');
          expect(body.fields['body.intValue'].value).to.equal(bodyModel.intValue);
          expect(body.fields['body.longValue'].message).to.equal('Custom Required long number.');
          expect(body.fields['body.longValue'].value).to.equal(bodyModel.longValue);
          expect(body.fields['body.booleanValue'].message).to.equal('invalid boolean value');
          expect(body.fields['body.booleanValue'].value).to.equal(bodyModel.booleanValue);

          expect(body.fields['body.dateValue'].message).to.equal('invalid ISO 8601 date format, i.e. YYYY-MM-DD');
          expect(body.fields['body.dateValue'].value).to.equal(bodyModel.dateValue);
          expect(body.fields['body.datetimeValue'].message).to.equal('invalid ISO 8601 datetime format, i.e. YYYY-MM-DDTHH:mm:ss');
          expect(body.fields['body.datetimeValue'].value).to.equal(bodyModel.datetimeValue);

          expect(body.fields['body.numberMax10'].message).to.equal('max 10');
          expect(body.fields['body.numberMax10'].value).to.equal(bodyModel.numberMax10);
          expect(body.fields['body.numberMin5'].message).to.equal('min 5');
          expect(body.fields['body.numberMin5'].value).to.equal(bodyModel.numberMin5);
          expect(body.fields['body.stringMax10Lenght'].message).to.equal('maxLength 10');
          expect(body.fields['body.stringMax10Lenght'].value).to.equal(bodyModel.stringMax10Lenght);
          expect(body.fields['body.stringMin5Lenght'].message).to.equal('minLength 5');
          expect(body.fields['body.stringMin5Lenght'].value).to.equal(bodyModel.stringMin5Lenght);
          expect(body.fields['body.stringPatternAZaz'].message).to.equal("Not match in '^[a-zA-Z]+$'");
          expect(body.fields['body.stringPatternAZaz'].value).to.equal(bodyModel.stringPatternAZaz);

          expect(body.fields['body.arrayMax5Item'].message).to.equal('maxItems 5');
          expect(body.fields['body.arrayMax5Item'].value).to.deep.equal(bodyModel.arrayMax5Item);
          expect(body.fields['body.arrayMin2Item'].message).to.equal('minItems 2');
          expect(body.fields['body.arrayMin2Item'].value).to.deep.equal(bodyModel.arrayMin2Item);
          expect(body.fields['body.arrayUniqueItem'].message).to.equal('required unique array');
          expect(body.fields['body.arrayUniqueItem'].value).to.deep.equal(bodyModel.arrayUniqueItem);
          expect(body.fields['body.model'].message).to.equal('invalid object');
          expect(body.fields['body.model'].value).to.deep.equal(bodyModel.model);
          expect(body.fields['body.mixedUnion'].message).to.equal(
            'Could not match the union against any of the items. ' +
              'Issues: [{"body.mixedUnion":{"message":"invalid string value","value":123}},' +
              '{"body.mixedUnion":{"message":"invalid object","value":123}}]',
          );
          expect(body.fields['body.intersection'].message).to.equal('Could not match the intersection against every type. Issues: [{"body.intersection.value2":{"message":"\'value2\' is required"}}]');
          expect(body.fields['body.singleBooleanEnum'].message).to.equal('should be one of the following; [true]');

          expect(body.fields['body.nestedObject.floatValue'].message).to.equal('Invalid float error message.');
          expect(body.fields['body.nestedObject.floatValue'].value).to.equal(bodyModel.floatValue);
          expect(body.fields['body.nestedObject.doubleValue'].message).to.equal('Invalid double error message.');
          expect(body.fields['body.nestedObject.doubleValue'].value).to.equal(bodyModel.doubleValue);
          expect(body.fields['body.nestedObject.intValue'].message).to.equal('invalid integer number');
          expect(body.fields['body.nestedObject.intValue'].value).to.equal(bodyModel.intValue);
          expect(body.fields['body.nestedObject.longValue'].message).to.equal('Custom Required long number.');
          expect(body.fields['body.nestedObject.longValue'].value).to.equal(bodyModel.longValue);
          expect(body.fields['body.nestedObject.booleanValue'].message).to.equal('invalid boolean value');
          expect(body.fields['body.nestedObject.booleanValue'].value).to.equal(bodyModel.booleanValue);

          expect(body.fields['body.nestedObject.dateValue'].message).to.equal('invalid ISO 8601 date format, i.e. YYYY-MM-DD');
          expect(body.fields['body.nestedObject.dateValue'].value).to.equal(bodyModel.dateValue);
          expect(body.fields['body.nestedObject.datetimeValue'].message).to.equal('invalid ISO 8601 datetime format, i.e. YYYY-MM-DDTHH:mm:ss');
          expect(body.fields['body.nestedObject.datetimeValue'].value).to.equal(bodyModel.datetimeValue);

          expect(body.fields['body.nestedObject.numberMax10'].message).to.equal('max 10');
          expect(body.fields['body.nestedObject.numberMax10'].value).to.equal(bodyModel.numberMax10);
          expect(body.fields['body.nestedObject.numberMin5'].message).to.equal('min 5');
          expect(body.fields['body.nestedObject.numberMin5'].value).to.equal(bodyModel.numberMin5);
          expect(body.fields['body.nestedObject.stringMax10Lenght'].message).to.equal('maxLength 10');
          expect(body.fields['body.nestedObject.stringMax10Lenght'].value).to.equal(bodyModel.stringMax10Lenght);
          expect(body.fields['body.nestedObject.stringMin5Lenght'].message).to.equal('minLength 5');
          expect(body.fields['body.nestedObject.stringMin5Lenght'].value).to.equal(bodyModel.stringMin5Lenght);
          expect(body.fields['body.nestedObject.stringPatternAZaz'].message).to.equal("Not match in '^[a-zA-Z]+$'");
          expect(body.fields['body.nestedObject.stringPatternAZaz'].value).to.equal(bodyModel.stringPatternAZaz);

          expect(body.fields['body.nestedObject.arrayMax5Item'].message).to.equal('maxItems 5');
          expect(body.fields['body.nestedObject.arrayMax5Item'].value).to.deep.equal(bodyModel.arrayMax5Item);
          expect(body.fields['body.nestedObject.arrayMin2Item'].message).to.equal('minItems 2');
          expect(body.fields['body.nestedObject.arrayMin2Item'].value).to.deep.equal(bodyModel.arrayMin2Item);
          expect(body.fields['body.nestedObject.arrayUniqueItem'].message).to.equal('required unique array');
          expect(body.fields['body.nestedObject.arrayUniqueItem'].value).to.deep.equal(bodyModel.arrayUniqueItem);
          expect(body.fields['body.nestedObject.model'].message).to.equal('invalid object');
          expect(body.fields['body.nestedObject.model'].value).to.deep.equal(bodyModel.model);
          expect(body.fields['body.nestedObject.mixedUnion'].message).to.equal(
            'Could not match the union against any of the items. ' +
              'Issues: [{"body.nestedObject.mixedUnion":{"message":"invalid string value","value":123}},' +
              '{"body.nestedObject.mixedUnion":{"message":"invalid object","value":123}}]',
          );
          expect(body.fields['body.nestedObject.intersection'].message).to.equal(
            'Could not match the intersection against every type. Issues: [{"body.nestedObject.intersection.value2":{"message":"\'value2\' is required"}}]',
          );
          expect(body.fields['body.typeAliases.word'].message).to.equal('minLength 1');
          expect(body.fields['body.typeAliases.fourtyTwo'].message).to.equal('min 42');
          expect(body.fields['body.typeAliases.unionAlias'].message).to.contain('Could not match the union against any of the items');
          expect(body.fields['body.typeAliases.intersectionAlias'].message).to.equal(
            `Could not match the intersection against every type. Issues: [{"body.typeAliases.intersectionAlias.value1":{"message":"'value1' is required"}},{"body.typeAliases.intersectionAlias.value1":{"message":"'value1' is required"}}]`,
          );
          expect(body.fields['body.typeAliases.nOLAlias'].message).to.equal('invalid object');
          expect(body.fields['body.typeAliases.genericAlias'].message).to.equal('invalid string value');
          expect(body.fields['body.typeAliases.genericAlias2.id'].message).to.equal("'id' is required");
          expect(body.fields['body.typeAliases.forwardGenericAlias'].message).to.contain('Could not match the union against any of the items.');
          expect(body.fields['body.nullableTypes.numberOrNull'].message).to.equal("'numberOrNull' is required");
          expect(body.fields['body.nullableTypes.maybeString'].message).to.equal(
            `Could not match the union against any of the items. Issues: [{"body.nullableTypes.maybeString":{"message":"invalid string value","value":1}},{"body.nullableTypes.maybeString":{"message":"should be one of the following; [null]","value":1}}]`,
          );
          expect(body.fields['body.nullableTypes.wordOrNull'].message).to.equal(
            `Could not match the union against any of the items. Issues: [{"body.nullableTypes.wordOrNull":{"message":"minLength 1","value":""}},{"body.nullableTypes.wordOrNull":{"message":"should be one of the following; [null]","value":""}}]`,
          );
          expect(body.fields['body.nullableTypes.justNull'].message).to.equal("'justNull' is required");
        },
        400,
      );
    });

    it('should custom required error message', () => {
      return verifyGetRequest(
        basePath + `/Validate/parameter/customRequiredErrorMsg`,
        (err, res) => {
          const body = JSON.parse(err.text);
          expect(body.fields.longValue.message).to.equal('Required long number.');
        },
        400,
      );
    });

    it('should custom invalid datatype error message', () => {
      const value = '112ab';
      return verifyGetRequest(
        basePath + `/Validate/parameter/custominvalidErrorMsg?longValue=${value}`,
        (err, res) => {
          const body = JSON.parse(err.text);
          expect(body.fields.longValue.message).to.equal('Invalid long number.');
        },
        400,
      );
    });

    it('should validate string-to-number dictionary body', () => {
      const data: ValidateMapStringToNumber = {
        key1: 0,
        key2: 1,
        key3: -1,
      };
      return verifyPostRequest(basePath + '/Validate/map', data, (err, res) => {
        const response = res.body as number[];
        expect(response.sort()).to.eql([-1, 0, 1]);
      });
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
        (err, res) => {
          const body = JSON.parse(err.text);
          expect(body.fields['map.key1'].message).to.eql('No matching model found in additionalProperties to validate key1');
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
      return verifyPostRequest(basePath + '/Validate/mapAny', data, (err, res) => {
        const response = res.body as any[];
        expect(response.sort()).to.eql([-1, '0', 1]);
      });
    });

    it('should validate string-to-any dictionary body with falsy values', () => {
      const data: ValidateMapStringToAny = {
        array: [],
        false: false,
        null: null,
        string: '',
        zero: 0,
      };
      return verifyPostRequest(basePath + '/Validate/mapAny', data, (err, res) => {
        const response = res.body as any[];
        expect(response.sort()).to.eql([[], '', 0, false, null]);
      });
    });
  });

  describe('Security', () => {
    const emptyHandler = (err, res) => {
      // This is an empty handler
    };

    describe('Only API key', () => {
      it('returns the correct user for user id 1', () => {
        return verifyGetRequest(basePath + '/SecurityTest?access_token=abc123456', (err, res) => {
          const model = res.body as UserResponseModel;
          expect(model.id).to.equal(1);
        });
      });

      it('returns the correct user for user id 2', () => {
        return verifyGetRequest(basePath + '/SecurityTest?access_token=xyz123456', (err, res) => {
          const model = res.body as UserResponseModel;
          expect(model.id).to.equal(2);
        });
      });

      it('returns 401 for an invalid key', () => {
        return verifyGetRequest(basePath + '/SecurityTest?access_token=invalid', emptyHandler, 401);
      });
    });

    describe('API key or tsoa auth', () => {
      it('returns 200 if the API key is correct', () => {
        const path = '/SecurityTest/OauthOrApiKey?access_token=abc123456&tsoa=invalid';
        return verifyGetRequest(basePath + path, emptyHandler, 200);
      });

      it('returns 200 if tsoa auth is correct', () => {
        const path = '/SecurityTest/OauthOrApiKey?access_token=invalid&tsoa=abc123456';
        return verifyGetRequest(basePath + path, emptyHandler, 200);
      });

      it('returns 401 if neither API key nor tsoa auth are correct, last error to resolve is returned', () => {
        const path = '/SecurityTest/OauthOrApiKey?access_token=invalid&tsoa=invalid';
        return verifyGetRequest(
          basePath + path,
          err => {
            expect(JSON.parse(err.text).message).to.equal('api_key');
          },
          401,
        );
      });
    });

    describe('API key and tsoa auth', () => {
      it('returns 200 if API and tsoa auth are correct', () => {
        const path = '/SecurityTest/OauthAndApiKey?access_token=abc123456&tsoa=abc123456';
        return verifyGetRequest(basePath + path, emptyHandler, 200);
      });

      it('returns 401 if API key is incorrect', () => {
        const path = '/SecurityTest/OauthAndApiKey?access_token=abc123456&tsoa=invalid';
        return verifyGetRequest(basePath + path, emptyHandler, 401);
      });

      it('returns 401 if tsoa auth is incorrect', () => {
        const path = '/SecurityTest/OauthAndApiKey?access_token=invalid&tsoa=abc123456';
        return verifyGetRequest(basePath + path, emptyHandler, 401);
      });
    });
  });

  describe('Parameter data', () => {
    it('parses query parameters', () => {
      return verifyGetRequest(basePath + '/ParameterTest/Query?firstname=Tony&last_name=Stark&age=45&weight=82.1&human=true&gender=MALE&nicknames=Ironman&nicknames=Iron Man', (err, res) => {
        const model = res.body as ParameterTestModel;
        expect(model.firstname).to.equal('Tony');
        expect(model.lastname).to.equal('Stark');
        expect(model.age).to.equal(45);
        expect(model.weight).to.equal(82.1);
        expect(model.human).to.equal(true);
        expect(model.gender).to.equal('MALE');
        expect(model.nicknames).to.deep.equal(['Ironman', 'Iron Man']);
      });
    });

    it('parses path parameters', () => {
      return verifyGetRequest(basePath + '/ParameterTest/Path/Tony/Stark/45/82.1/true/MALE', (err, res) => {
        const model = res.body as ParameterTestModel;
        expect(model.firstname).to.equal('Tony');
        expect(model.lastname).to.equal('Stark');
        expect(model.age).to.equal(45);
        expect(model.weight).to.equal(82.1);
        expect(model.human).to.equal(true);
        expect(model.gender).to.equal('MALE');
      });
    });

    it('parses header parameters', () => {
      return verifyRequest(
        (err, res) => {
          const model = res.body as ParameterTestModel;
          expect(model.firstname).to.equal('Tony');
          expect(model.lastname).to.equal('Stark');
          expect(model.age).to.equal(45);
          expect(model.weight).to.equal(82.1);
          expect(model.human).to.equal(true);
          expect(model.gender).to.equal('MALE');
        },
        request => {
          return request.get(basePath + '/ParameterTest/Header').set({
            age: 45,
            firstname: 'Tony',
            gender: 'MALE',
            human: true,
            last_name: 'Stark',
            weight: 82.1,
          });
        },
        200,
      );
    });

    it('invalid header parameters have expected errors', () => {
      return verifyRequest(
        (err, res) => {
          const error = JSON.parse(err.text);
          expect(error.fields.firstname.message).to.equal("'firstname' is required");
          expect(error.fields.gender.message).to.equal("should be one of the following; ['MALE','FEMALE']");
          expect(error.fields.human.message).to.equal('invalid boolean value');

          // These have a custom error messages configured
          expect(error.fields.age.message).to.equal('age');
          expect(error.fields.weight.message).to.equal('weight');
        },
        request => {
          return request.get(basePath + '/ParameterTest/Header').set({
            age: 'asdf',
            gender: 'male',
            human: 123,
            last_name: 123,
            weight: 'hello',
          });
        },
        400,
      );
    });

    it('parses request parameters', () => {
      return verifyGetRequest(basePath + '/ParameterTest/Request?firstname=Tony&lastname=Stark&age=45&weight=82.1&human=true&gender=MALE', (err, res) => {
        const model = res.body as ParameterTestModel;
        expect(model.firstname).to.equal('Tony');
        expect(model.lastname).to.equal('Stark');
        expect(model.age).to.equal(45);
        expect(model.human).to.equal(true);
        expect(model.gender).to.equal('MALE');
      });
    });

    it('parses body parameters', () => {
      const data: ParameterTestModel = {
        age: 45,
        firstname: 'Tony',
        gender: Gender.MALE,
        human: true,
        lastname: 'Stark',
        weight: 82.1,
      };
      return verifyPostRequest(basePath + '/ParameterTest/Body', data, (err, res) => {
        const model = res.body as ParameterTestModel;
        expect(model.firstname).to.equal('Tony');
        expect(model.lastname).to.equal('Stark');
        expect(model.age).to.equal(45);
        expect(model.weight).to.equal(82.1);
        expect(model.human).to.equal(true);
        expect(model.gender).to.equal(Gender.MALE);
      });
    });

    it('parses body field parameters', () => {
      const data: ParameterTestModel = {
        age: 45,
        firstname: 'Tony',
        gender: Gender.MALE,
        human: true,
        lastname: 'Stark',
        weight: 82.1,
      };
      return verifyPostRequest(basePath + '/ParameterTest/BodyProps', data, (err, res) => {
        const model = res.body as ParameterTestModel;
        expect(model.firstname).to.equal('Tony');
        expect(model.lastname).to.equal('Stark');
        expect(model.age).to.equal(45);
        expect(model.weight).to.equal(82.1);
        expect(model.human).to.equal(true);
        expect(model.gender).to.equal(Gender.MALE);
      });
    });

    it('invalid body field parameters look good', () => {
      const data: any = {
        age: 'lkj',
        firstname: 23,
        gender: 'male',
        human: 123,
        lastname: 123,
        weight: 'hello',
      };
      return verifyPostRequest(
        basePath + '/ParameterTest/BodyProps',
        data,
        (err, res) => {
          const error = JSON.parse(err.text);
          expect(error.fields['body.firstname'].message).to.equal('invalid string value');
          expect(error.fields['body.lastname'].message).to.equal('invalid string value');
          expect(error.fields['body.gender'].message).to.equal("should be one of the following; ['MALE','FEMALE']");
          expect(error.fields['body.human'].message).to.equal('invalid boolean value');

          // these have custom error messages configured
          expect(error.fields['body.age'].message).to.equal('age');
          expect(error.fields['body.weight'].message).to.equal('weight');
        },
        400,
      );
    });

    it('can get request with generic type', () => {
      return verifyGetRequest(basePath + '/GetTest/GenericModel', (err, res) => {
        const model = res.body as GenericModel<TestModel>;
        expect(model.result.id).to.equal(1);
      });
    });

    it('can get request with generic array', () => {
      return verifyGetRequest(basePath + '/GetTest/GenericModelArray', (err, res) => {
        const model = res.body as GenericModel<TestModel[]>;
        expect(model.result[0].id).to.equal(1);
      });
    });

    it('can get request with generic primative type', () => {
      return verifyGetRequest(basePath + '/GetTest/GenericPrimitive', (err, res) => {
        const model = res.body as GenericModel<string>;
        expect(model.result).to.equal('a string');
      });
    });

    it('can get request with generic primative array', () => {
      return verifyGetRequest(basePath + '/GetTest/GenericPrimitiveArray', (err, res) => {
        const model = res.body as GenericModel<string[]>;
        expect(model.result[0]).to.equal('string one');
      });
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

  describe('Sub resource', () => {
    it('parses path parameters from the controller description', () => {
      const mainResourceId = 'main-123';

      return verifyGetRequest(basePath + `/SubResourceTest/${mainResourceId}/SubResource`, (err, res) => {
        expect(res.body).to.equal(mainResourceId);
      });
    });

    it('parses path parameters from the controller description and method description', () => {
      const mainResourceId = 'main-123';
      const subResourceId = 'sub-456';

      return verifyGetRequest(basePath + `/SubResourceTest/${mainResourceId}/SubResource/${subResourceId}`, (err, res) => {
        expect(res.body).to.equal(`${mainResourceId}:${subResourceId}`);
      });
    });
  });

  describe('file upload', () => {
    it('can post a file', () => {
      const formData = { someFile: '@../package.json' };
      return verifyFileUploadRequest(basePath + '/PostTest/File', formData, (err, res) => {
        const packageJsonBuffer = readFileSync(resolve(__dirname, '../package.json'));
        const returnedBuffer = Buffer.from(res.body.buffer);
        expect(res.body).to.not.be.undefined;
        expect(res.body.fieldname).to.equal('someFile');
        expect(res.body.originalname).to.equal('package.json');
        expect(res.body.encoding).to.be.not.undefined;
        expect(res.body.mimetype).to.equal('application/json');
        expect(Buffer.compare(returnedBuffer, packageJsonBuffer)).to.equal(0);
      });
    });

    it('can post a file without name', () => {
      const formData = { aFile: '@../package.json' };
      return verifyFileUploadRequest(basePath + '/PostTest/FileWithoutName', formData, (err, res) => {
        expect(res.body).to.not.be.undefined;
        expect(res.body.fieldname).to.equal('aFile');
      });
    });

    it('cannot post a file with wrong attribute name', async () => {
      const formData = { wrongAttributeName: '@../package.json' };
      try {
        await verifyFileUploadRequest(basePath + '/PostTest/File', formData);
      } catch (e) {
        expect(e.response.status).to.equal(500);
        expect(e.response.text).to.equal('{"message":"Unexpected field","name":"MulterError","status":500}');
      }
    });

    it('can post multiple files with other form fields', () => {
      const formData = {
        a: 'b',
        c: 'd',
        someFiles: ['@../package.json', '@../tsconfig.json'],
      };

      return verifyFileUploadRequest(basePath + '/PostTest/ManyFilesAndFormFields', formData, (err, res) => {
        for (const file of res.body as File[]) {
          const packageJsonBuffer = readFileSync(resolve(__dirname, `../${file.originalname}`));
          const returnedBuffer = Buffer.from(file.buffer);
          expect(file).to.not.be.undefined;
          expect(file.fieldname).to.be.not.undefined;
          expect(file.originalname).to.be.not.undefined;
          expect(file.encoding).to.be.not.undefined;
          expect(file.mimetype).to.equal('application/json');
          expect(Buffer.compare(returnedBuffer, packageJsonBuffer)).to.equal(0);
        }
      });
    });

    function verifyFileUploadRequest(
      path: string,
      formData: any,
      verifyResponse: (err: any, res: request.Response) => any = () => {
        /**/
      },
      expectedStatus?: number,
    ) {
      return verifyRequest(
        verifyResponse,
        request =>
          Object.keys(formData).reduce((req, key) => {
            const values = [].concat(formData[key]);
            values.forEach((v: any) => (v.startsWith('@') ? req.attach(key, resolve(__dirname, v.slice(1))) : req.field(key, v)));
            return req;
          }, request.post(path)),
        expectedStatus,
      );
    }
  });

  function verifyGetRequest(path: string, verifyResponse: (err: any, res: request.Response) => any, expectedStatus?: number) {
    return verifyRequest(verifyResponse, request => request.get(path), expectedStatus);
  }

  function verifyPostRequest(path: string, data: any, verifyResponse: (err: any, res: request.Response) => any, expectedStatus?: number) {
    return verifyRequest(verifyResponse, request => request.post(path).send(data), expectedStatus);
  }

  function verifyRequest(verifyResponse: (err: any, res: request.Response) => any, methodOperation: (request: request.SuperTest<any>) => request.Test, expectedStatus = 200) {
    return new Promise<void>((resolve, reject) => {
      methodOperation(request(app))
        .expect(expectedStatus)
        .end((err: any, res: any) => {
          let parsedError: any;
          try {
            parsedError = JSON.parse(res.error);
          } catch (err) {
            parsedError = res.error;
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
      modelsObjectIndirect: {
        key: {
          email: 'test@test.com',
          id: 1,
          testSubModel2: false,
        },
      },
      numberArray: [1, 2],
      numberArrayReadonly: [1, 2],
      numberValue: 5,
      objLiteral: {
        name: 'hello',
      },
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

  function getFakeClassModel() {
    const model = new TestClassModel('test', 'test', 'test', 'test', 'test');
    model.id = 100;
    model.publicStringProperty = 'test';
    model.stringProperty = 'test';
    model.account = { id: 1234 };
    model.enumKeys = 'OK';

    return model;
  }
});
