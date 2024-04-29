import { File } from '@tsoa/runtime';
import { expect } from 'chai';
import { readFileSync } from 'fs';
import 'mocha';
import { resolve } from 'path';
import * as request from 'supertest';
import { stateOf } from '../fixtures/controllers/middlewaresHapiController';
import { server } from '../fixtures/hapi/server';
import { Gender, GenericModel, GenericRequest, Model, ParameterTestModel, TestClassModel, TestModel, ValidateMapStringToAny, ValidateMapStringToNumber, ValidateModel } from '../fixtures/testModel';

const basePath = '/v1';

describe('Hapi Server', () => {
  it('can handle get request to root controller`s path', () => {
    return verifyGetRequest(basePath, (_err, res) => {
      const model = res.body as TestModel;
      expect(model.id).to.equal(1);
    });
  });

  it('can handle get request to root controller`s method path', () => {
    return verifyGetRequest(basePath + '/rootControllerMethodWithPath', (_err, res) => {
      const model = res.body as TestModel;
      expect(model.id).to.equal(1);
    });
  });

  it('can handle get request with no path argument', () => {
    return verifyGetRequest(basePath + '/GetTest', (_err, res) => {
      const model = res.body as TestModel;
      expect(model.id).to.equal(1);
    });
  });

  it('can handle get request with path argument', () => {
    return verifyGetRequest(basePath + '/GetTest/Current', (_err, res) => {
      const model = res.body as TestModel;
      expect(model.id).to.equal(1);
    });
  });

  it('respects toJSON for class serialization', () => {
    return verifyGetRequest(basePath + '/GetTest/SimpleClassWithToJSON', (_err, res) => {
      const getterClass = res.body;
      expect(getterClass).to.haveOwnProperty('a');
      expect(getterClass.a).to.equal('hello, world');
      expect(getterClass).to.not.haveOwnProperty('b');
    });
  });

  it('can handle get request with collection return value', () => {
    return verifyGetRequest(basePath + '/GetTest/Multi', (_err, res) => {
      const models = res.body as TestModel[];
      expect(models.length).to.equal(3);
      models.forEach(m => {
        expect(m.id).to.equal(1);
      });
    });
  });

  it('can handle get request with path and query parameters', () => {
    return verifyGetRequest(basePath + `/GetTest/${1}/true/test?booleanParam=true&stringParam=test1234&numberParam=1234`, (_err, res) => {
      const model = res.body as TestModel;
      expect(model.id).to.equal(1);
    });
  });

  it('returns error if missing required query parameter', () => {
    return verifyGetRequest(
      basePath + `/GetTest/${1}/true/test?booleanParam=true&stringParam=test1234`,
      (err: any, _res: any) => {
        const body = JSON.parse(err.text);
        expect(body.fields.numberParam.message).to.equal(`'numberParam' is required`);
      },
      400,
    );
  });

  it('returns error and custom error message', () => {
    return verifyGetRequest(
      basePath + `/GetTest/${1}/true/test?booleanParam=true&numberParam=1234`,
      (err: any, _res: any) => {
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

    return verifyGetRequest(basePath + `/GetTest/${numberValue}/${boolValue.toString()}/${stringValue}?booleanParam=true&stringParam=test1234&numberParam=1234`, (_err, res) => {
      const model = res.body as TestModel;
      expect(model.numberValue).to.equal(numberValue);
      expect(model.boolValue).to.equal(boolValue);
      expect(model.stringValue).to.equal(stringValue);
    });
  });

  it('parses query parameters', () => {
    const numberValue = 10;
    const stringValue = 'the-string';

    return verifyGetRequest(basePath + `/GetTest/1/true/testing?booleanParam=true&stringParam=test1234&numberParam=${numberValue}&optionalStringParam=${stringValue}`, (_err, res) => {
      const model = res.body as TestModel;
      expect(model.optionalString).to.equal(stringValue);
    });
  });

  it('parses queries parameters in one single object', () => {
    const numberValue = 10;
    const boolValue = true;
    const stringValue = 'the-string';

    return verifyGetRequest(basePath + `/GetTest/AllQueriesInOneObject?booleanParam=${boolValue.toString()}&stringParam=${stringValue}&numberParam=${numberValue}`, (_err, res) => {
      const queryParams = res.body as TestModel;

      expect(queryParams.numberValue).to.equal(numberValue);
      expect(queryParams.boolValue).to.equal(boolValue);
      expect(queryParams.stringValue).to.equal(stringValue);
      expect(queryParams.optionalString).to.be.undefined;
    });
  });

  it('accepts any parameter using a wildcard', () => {
    const object = {
      foo: 'foo',
      bar: 10,
      baz: true,
    };

    return verifyGetRequest(basePath + `/GetTest/WildcardQueries?foo=${object.foo}&bar=${object.bar}&baz=${String(object.baz)}`, (_err, res) => {
      const queryParams = res.body as TestModel;

      expect(queryParams.anyType.foo).to.equal(object.foo);
      expect(queryParams.anyType.bar).to.equal(String(object.bar));
      expect(queryParams.anyType.baz).to.equal(String(object.baz));
    });
  });

  it('should reject incompatible entries for typed wildcard', () => {
    const object = {
      foo: '2',
      bar: 10,
      baz: true,
    };

    return verifyGetRequest(
      basePath + `/GetTest/TypedRecordQueries?foo=${object.foo}&bar=${object.bar}&baz=${String(object.baz)}`,
      (err, _res) => {
        const body = JSON.parse(err.text);
        expect(body.fields['queryParams.baz'].message).to.equal('invalid float number');
      },
      400,
    );
  });

  it('accepts numbered parameters using a wildcard', () => {
    const object = {
      foo: '3',
      bar: 10,
    };

    return verifyGetRequest(basePath + `/GetTest/TypedRecordQueries?foo=${object.foo}&bar=${object.bar}`, (_err, res) => {
      const queryParams = res.body as TestModel;

      expect(queryParams.anyType.foo).to.equal(Number(object.foo));
      expect(queryParams.anyType.bar).to.equal(object.bar);
    });
  });

  it('parsed body parameters', () => {
    const data = getFakeModel();

    return verifyPostRequest(basePath + '/PostTest', data, (_err: any, res: any) => {
      const model = res.body as TestModel;
      expect(model).to.deep.equal(model);
    });
  });

  it('correctly returns status code', () => {
    const data = getFakeModel();
    const path = basePath + '/PostTest/WithDifferentReturnCode';
    return verifyPostRequest(
      path,
      data,
      (_err, _res) => {
        return;
      },
      201,
    );
  });

  it('parses class model as body parameter', () => {
    const data = getFakeClassModel();

    return verifyPostRequest(basePath + '/PostTest/WithClassModel', data, (_err: any, res: any) => {
      const model = res.body as TestClassModel;
      expect(model.id).to.equal(700); // this gets changed on the server
    });
  });

  it('correctly handles OPTIONS requests', () => {
    const path = basePath + '/OptionsTest/Current';
    return verifyRequest(
      (_err, res) => {
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

        return verifyPostRequest(basePath + '/PostTest', data, (_err: any, _res: any) => null, 400);
      }),
    );
  });

  it('should parse valid date', () => {
    const data = getFakeModel();
    data.dateValue = '2016-01-01T00:00:00Z' as any;

    return verifyPostRequest(
      basePath + '/PostTest',
      data,
      (_err: any, res: any) => {
        expect(res.body.dateValue).to.equal('2016-01-01T00:00:00.000Z');
      },
      200,
    );
  });

  it('should parse valid date as query param', () => {
    return verifyGetRequest(
      basePath + '/GetTest/DateParam?date=2016-01-01T00:00:00Z',
      (_err: any, res: any) => {
        expect(res.body.dateValue).to.equal('2016-01-01T00:00:00.000Z');
      },
      200,
    );
  });

  it('should reject invalid additionalProperties', () => {
    const invalidValues = ['invalid', null, [], 1, { foo: null }, { foo: 1 }, { foo: [] }, { foo: {} }, { foo: { foo: 'bar' } }];

    return Promise.all(
      invalidValues.map((value: any) => {
        return verifyPostRequest(basePath + '/PostTest/Object', { obj: value }, (_err: any, _res: any) => null, 400);
      }),
    );
  });

  it('should reject invalid dates', () => {
    const invalidValues = [1, {}];

    return Promise.all(
      invalidValues.map((value: any) => {
        const data = getFakeModel();
        data.dateValue = value;

        return verifyPostRequest(basePath + '/PostTest', data, (_err: any, _res: any) => null, 400);
      }),
    );
  });

  it('should reject invalid numbers', () => {
    const invalidValues = ['test', null, undefined, {}];

    return Promise.all(
      invalidValues.map((value: any) => {
        const data = getFakeModel();
        data.numberValue = value;

        return verifyPostRequest(basePath + '/PostTest', data, (_err: any, _res: any) => null, 400);
      }),
    );
  });

  it('returns error if missing required path parameter', () => {
    return verifyGetRequest(
      basePath + `/GetTest/${1}/true?booleanParam=true&stringParam=test1234`,
      (err: any, _res: any) => {
        expect(JSON.parse(err.text).error).to.equal('Not Found');
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
      (err: any, _res: any) => {
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
      (err: any, _res: any) => {
        expect(JSON.parse(err.text).message).to.equal('error thrown');
      },
      400,
    );
  });

  it('can invoke middlewares installed in routes and paths', () => {
    expect(stateOf('route')).to.be.undefined;
    return verifyGetRequest(
      basePath + '/MiddlewareTestHapi/test1',
      (_err, _res) => {
        expect(stateOf('route')).to.be.true;
        expect(stateOf('test1')).to.be.true;
        expect(stateOf('test2')).to.be.true;
      },
      204,
    );
  });

  describe('Controller', () => {
    it('should normal status code', () => {
      return verifyGetRequest(
        basePath + `/Controller/normalStatusCode`,
        (_err, res) => {
          expect(res.status).to.equal(200);
        },
        200,
      );
    });

    it('should normal status code with false boolean result', () => {
      return verifyGetRequest(
        basePath + `/Controller/falseStatusCode`,
        (_err, res) => {
          expect(res.status).to.equal(200);
        },
        200,
      );
    });

    it('should normal status code with 0 result', () => {
      return verifyGetRequest(
        basePath + `/Controller/zeroStatusCode`,
        (_err, res) => {
          expect(res.status).to.equal(200);
        },
        200,
      );
    });

    it('should no content status code', () => {
      return verifyGetRequest(
        basePath + `/Controller/noContentStatusCode`,
        (_err, res) => {
          expect(res.status).to.equal(204);
        },
        204,
      );
    });

    it('should custom status code', () => {
      return verifyGetRequest(
        basePath + `/Controller/customStatusCode`,
        (_err, res) => {
          expect(res.status).to.equal(205);
        },
        205,
      );
    });

    it('should custom header', () => {
      return verifyGetRequest(
        basePath + `/Controller/customHeader`,
        (_err, res) => {
          expect(res.status).to.equal(204);
          expect(res.header.hero).to.equal('IronMan');
          expect(res.header.name).to.equal('Tony Stark');
          expect(res.header['set-cookie']).to.eql(['token=MY_AUTH_TOKEN;', 'refreshToken=MY_REFRESH_TOKEN;']);
        },
        204,
      );
    });

    it('should unavailable for legal reasons status code', () => {
      return verifyGetRequest(
        basePath + `/Controller/unavailableForLegalReasonsStatusCode`,
        (_err, res) => {
          expect(res.status).to.equal(451);
        },
        451,
      );
    });
  });

  describe('NoExtends', () => {
    it('should apply custom code from success response', () => {
      return verifyGetRequest(
        basePath + `/NoExtends/customSuccessResponseCode`,
        (_err, res) => {
          expect(res.status).to.equal(202);
        },
        202,
      );
    });

    it('should apply enum code from success response', () => {
      return verifyGetRequest(
        basePath + `/NoExtends/enumSuccessResponseCode`,
        (_err, res) => {
          expect(res.status).to.equal(202);
        },
        202,
      );
    });

    it('should ignore named success response', () => {
      return verifyGetRequest(
        basePath + `/NoExtends/rangedSuccessResponse`,
        (_err, res) => {
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
        (_err, res) => {
          expect(res.type).to.eq('application/vnd.mycompany.myapp.v2+json');
        },
        202,
      );
    });
  });

  describe('Validate', () => {
    it('should valid minDate and maxDate validation of date type', () => {
      const minDate = '2019-01-01';
      const maxDate = '2015-01-01';
      return verifyGetRequest(
        basePath + `/Validate/parameter/date?minDateValue=${minDate}&maxDateValue=${maxDate}`,
        (_err, res) => {
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
        (err, _res) => {
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
        (_err, res) => {
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
        (err, _res) => {
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
        (_err, res) => {
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
        (err, _res) => {
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
        (_err, res) => {
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
        (err, _res) => {
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
        (_err, res) => {
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
        (err, _res) => {
          const body = JSON.parse(err.text);
          expect(body.fields.boolValue.message).to.equal('boolValue');
          expect(body.fields.boolValue.value).to.equal(value);
        },
        400,
      );
    });

    it('should valid minLength, maxLength and pattern (quoted/unquoted) validation of string type', () => {
      return verifyGetRequest(
        basePath + `/Validate/parameter/string?minLength=abcdef&maxLength=ab&patternValue=aBcDf&quotedPatternValue=A`,
        (_err, res) => {
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
        (err, _res) => {
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
        numberOrNull: 'null' as unknown as null,
        wordOrNull: null,
        maybeString: null,
        justNull: null,
        nestedNullable: { property: null },
      };

      return verifyPostRequest(
        basePath + `/Validate/body`,
        bodyModel,
        (_err, res) => {
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
          expect(body.nullableTypes.nestedNullable.property).to.equal(bodyModel.nullableTypes.nestedNullable.property);
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
        (err, _res) => {
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
        (err, _res) => {
          const body = JSON.parse(err.text);
          expect(body.fields.longValue.message).to.equal('Required long number.');
        },
        400,
      );
    });

    it('should custom invalid datatype error message', () => {
      const value = '112ab';
      return verifyGetRequest(
        basePath + `/Validate/parameter/customInvalidErrorMsg?longValue=${value}`,
        (err, _res) => {
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
      return verifyPostRequest(basePath + '/Validate/map', data, (_err, res) => {
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
        (err, _res) => {
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
      return verifyPostRequest(basePath + '/Validate/mapAny', data, (_err, res) => {
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
      return verifyPostRequest(basePath + '/Validate/mapAny', data, (_err, res) => {
        const response = res.body as any[];
        expect(response.sort()).to.eql([[], '', 0, false, null]);
      });
    });
  });

  describe('Security', () => {
    const emptyHandler = (_err: unknown, _res: unknown) => {
      // This is an empty handler
    };

    it('can handle get request with access_token user id == 1', () => {
      return verifyGetRequest(basePath + '/SecurityTest/Hapi?access_token=abc123456', (_err, res) => {
        const model = res.body as Model;
        expect(model.id).to.equal(1);
      });
    });

    it('can handle get request with access_token user id == 2', () => {
      return verifyGetRequest(basePath + '/SecurityTest/Hapi?access_token=xyz123456', (_err, res) => {
        const model = res.body as Model;
        expect(model.id).to.equal(2);
      });
    });

    it('resolves right away after first success', () => {
      const path = '/SecurityTest/ApiKeyOrTimesOut?access_token=abc123456';
      return verifyGetRequest(
        basePath + path,
        (_err, res) => {
          const model = res.body as Model;
          expect(model.id).to.equal(1);
        },
        200,
      );
    });

    describe('API key or tsoa auth', () => {
      it('returns 200 if the API key is correct', () => {
        const path = '/SecurityTest/OauthOrApiKey?access_token=abc123456&tsoa=invalid';
        return verifyGetRequest(
          basePath + path,
          (_err, res) => {
            const model = res.body as Model;
            expect(model.id).to.equal(1);
          },
          200,
        );
      });

      it('returns 200 if tsoa auth is correct', () => {
        const path = '/SecurityTest/OauthOrApiKey?access_token=invalid&tsoa=abc123456';
        return verifyGetRequest(basePath + path, emptyHandler, 200);
      });

      it('returns 200 if multiple auth handlers are correct', () => {
        const path = '/SecurityTest/OauthOrApiKey?access_token=abc123456&tsoa=abc123456';
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

      it('should pass through error if controller method crashes', () => {
        return verifyGetRequest(
          basePath + `/SecurityTest/ServerErrorOauthOrApiKey?access_token=abc123456`,
          (_err, res) => {
            expect(res.status).to.equal(500);
          },
          500,
        );
      });
    });

    describe('API key and tsoa auth', () => {
      it('returns 200 if API and tsoa auth are correct, resolved with user from first key in object', () => {
        const path = '/SecurityTest/OauthAndApiKey?access_token=abc123456&tsoa=abc123456';
        return verifyGetRequest(
          basePath + path,
          (_err, res) => {
            const model = res.body as Model;
            expect(model.id).to.equal(1);
          },
          200,
        );
      });

      it('returns 401 if API key is incorrect', () => {
        const path = '/SecurityTest/OauthAndApiKey?access_token=abc123456&tsoa=invalid';
        return verifyGetRequest(basePath + path, emptyHandler, 401);
      });

      it('returns 401 if tsoa auth is incorrect', () => {
        const path = '/SecurityTest/OauthAndApiKey?access_token=invalid&tsoa=abc123456';
        return verifyGetRequest(basePath + path, emptyHandler, 401);
      });

      it('should pass through error if controller method crashes', () => {
        return verifyGetRequest(
          basePath + `/SecurityTest/ServerErrorOauthAndApiKey?access_token=abc123456&tsoa=abc123456`,
          (_err, res) => {
            expect(res.status).to.equal(500);
          },
          500,
        );
      });
    });
  });

  describe('Parameter data', () => {
    it('parses query parameters', () => {
      return verifyGetRequest(basePath + '/ParameterTest/Query?firstname=Tony&last_name=Stark&age=45&weight=82.1&human=true&gender=MALE&nicknames=Ironman&nicknames=Iron Man', (_err, res) => {
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

    it('parses queries parameters', () => {
      return verifyGetRequest(basePath + '/ParameterTest/Queries?firstname=Tony&lastname=Stark&age=45&weight=82.1&human=true&gender=MALE&nicknames=Ironman&nicknames=Iron Man', (_err, res) => {
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
      return verifyGetRequest(basePath + '/ParameterTest/Path/Tony/Stark/45/82.1/true/MALE', (_err, res) => {
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
        (_err, res) => {
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

    it('parses request parameters', () => {
      return verifyGetRequest(basePath + '/ParameterTest/Request?firstname=Tony&lastname=Stark&age=45&weight=82.1&human=true&gender=MALE', (_err, res) => {
        const model = res.body as ParameterTestModel;
        expect(model.firstname).to.equal('Tony');
        expect(model.lastname).to.equal('Stark');
        expect(model.age).to.equal(45);
        expect(model.weight).to.equal(82.1);
        expect(model.human).to.equal(true);
        expect(model.gender).to.equal('MALE');
      });
    });

    it('parse request filed parameters', () => {
      const data: ParameterTestModel = {
        age: 26,
        firstname: 'Nick',
        lastname: 'Yang',
        gender: Gender.MALE,
        human: true,
        weight: 50,
      };
      return verifyPostRequest(`${basePath}/ParameterTest/HapiRequestProps`, data, (_err, res) => {
        const model = res.body as ParameterTestModel;
        expect(model.age).to.equal(26);
        expect(model.firstname).to.equal('Nick');
        expect(model.lastname).to.equal('Yang');
        expect(model.gender).to.equal(Gender.MALE);
        expect(model.weight).to.equal(50);
        expect(model.human).to.equal(true);
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
      return verifyPostRequest(basePath + '/ParameterTest/Body', data, (_err, res) => {
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
      return verifyPostRequest(basePath + '/ParameterTest/BodyProps', data, (_err, res) => {
        const model = res.body as ParameterTestModel;
        expect(model.firstname).to.equal('Tony');
        expect(model.lastname).to.equal('Stark');
        expect(model.age).to.equal(45);
        expect(model.weight).to.equal(82.1);
        expect(model.human).to.equal(true);
        expect(model.gender).to.equal(Gender.MALE);
      });
    });

    it('can get request with generic type', () => {
      return verifyGetRequest(basePath + '/GetTest/GenericModel', (_err, res) => {
        const model = res.body as GenericModel<TestModel>;
        expect(model.result.id).to.equal(1);
      });
    });

    it('can get request with generic array', () => {
      return verifyGetRequest(basePath + '/GetTest/GenericModelArray', (_err, res) => {
        const model = res.body as GenericModel<TestModel[]>;
        expect(model.result[0].id).to.equal(1);
      });
    });

    it('can get request with generic primative type', () => {
      return verifyGetRequest(basePath + '/GetTest/GenericPrimitive', (_err, res) => {
        const model = res.body as GenericModel<string>;
        expect(model.result).to.equal('a string');
      });
    });

    it('can get request with generic primative array', () => {
      return verifyGetRequest(basePath + '/GetTest/GenericPrimitiveArray', (_err, res) => {
        const model = res.body as GenericModel<string[]>;
        expect(model.result[0]).to.equal('string one');
      });
    });

    it('can post request with a generic body', () => {
      const data: GenericRequest<TestModel> = {
        name: 'something',
        value: getFakeModel(),
      };
      return verifyPostRequest(basePath + '/PostTest/GenericBody', data, (_err, res) => {
        const model = res.body as TestModel;
        expect(model.id).to.equal(1);
      });
    });

    it('Should return on @Res', () => {
      return verifyGetRequest(
        basePath + '/GetTest/Res',
        (_err, res) => {
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
          (_err, res) => {
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
        (_err, res) => {
          const model = res.body as TestModel;
          expect(model.id).to.equal(1);
          expect(res.get('custom-header')).to.eq('hello');
        },
        400,
      );
    });
  });

  describe('Sub resource', () => {
    it('parses path parameters from the controller description', () => {
      const mainResourceId = 'main-123';

      return verifyGetRequest(basePath + `/SubResourceTest/${mainResourceId}/SubResource`, (_err, res) => {
        expect(res.text).to.equal(mainResourceId);
      });
    });

    it('parses path parameters from the controller description and method description', () => {
      const mainResourceId = 'main-123';
      const subResourceId = 'sub-456';

      return verifyGetRequest(basePath + `/SubResourceTest/${mainResourceId}/SubResource/${subResourceId}`, (_err, res) => {
        expect(res.text).to.equal(`${mainResourceId}:${subResourceId}`);
      });
    });
  });

  describe('file upload', () => {
    it('can post a file', () => {
      const formData = { someFile: '@../package.json' };
      return verifyFileUploadRequest(basePath + '/PostTest/File', formData, (_err, res) => {
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
      return verifyFileUploadRequest(basePath + '/PostTest/FileWithoutName', formData, (_err, res) => {
        expect(res.body).to.not.be.undefined;
        expect(res.body.fieldname).to.equal('aFile');
      });
    });

    it('cannot post a file with wrong attribute name', async () => {
      const formData = { wrongAttributeName: '@../package.json' };
      verifyFileUploadRequest(basePath + '/PostTest/File', formData, (_err, res) => {
        expect(res.status).to.equal(500);
        expect(res.text).to.equal('{"message":"Unexpected field","name":"MulterError","status":500}');
      });
    });

    it('can post multiple files with other form fields', () => {
      const formData = {
        a: 'b',
        c: 'd',
        someFiles: ['@../package.json', '@../tsconfig.json'],
      };

      return verifyFileUploadRequest(basePath + '/PostTest/ManyFilesAndFormFields', formData, (_err, res) => {
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

    it('can post multiple files with different field', () => {
      const formData = {
        file_a: '@../package.json',
        file_b: '@../tsconfig.json',
      };
      return verifyFileUploadRequest(`${basePath}/PostTest/ManyFilesInDifferentFields`, formData, (_err, res) => {
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

    it('can post multiple files with different array fields', () => {
      const formData = {
        files_a: ['@../package.json', '@../tsconfig.json'],
        file_b: '@../tsoa.json',
        files_c: ['@../tsconfig.json', '@../package.json'],
      };
      return verifyFileUploadRequest(`${basePath}/PostTest/ManyFilesInDifferentArrayFields`, formData, (_err, res) => {
        for (const fileList of res.body as File[][]) {
          for (const file of fileList) {
            const packageJsonBuffer = readFileSync(resolve(__dirname, `../${file.originalname}`));
            const returnedBuffer = Buffer.from(file.buffer);
            expect(file).to.not.be.undefined;
            expect(file.fieldname).to.be.not.undefined;
            expect(file.originalname).to.be.not.undefined;
            expect(file.encoding).to.be.not.undefined;
            expect(file.mimetype).to.equal('application/json');
            expect(Buffer.compare(returnedBuffer, packageJsonBuffer)).to.equal(0);
          }
        }
      });
    });

    it('can post mixed form data content with file and not providing optional file', () => {
      const formData = {
        username: 'test',
        avatar: '@../tsconfig.json',
      };
      return verifyFileUploadRequest(`${basePath}/PostTest/MixedFormDataWithFilesContainsOptionalFile`, formData, (_err, res) => {
        const file = res.body.avatar;
        const packageJsonBuffer = readFileSync(resolve(__dirname, `../${file.originalname}`));
        const returnedBuffer = Buffer.from(file.buffer);
        expect(res.body.username).to.equal(formData.username);
        expect(res.body.optionalAvatar).to.undefined;
        expect(file).to.not.be.undefined;
        expect(file.fieldname).to.be.not.undefined;
        expect(file.originalname).to.be.not.undefined;
        expect(file.encoding).to.be.not.undefined;
        expect(file.mimetype).to.equal('application/json');
        expect(Buffer.compare(returnedBuffer, packageJsonBuffer)).to.equal(0);
      });
    });

    it('can post mixed form data content with file and provides optional file', () => {
      const formData = {
        username: 'test',
        avatar: '@../tsconfig.json',
        optionalAvatar: '@../package.json',
      };
      return verifyFileUploadRequest(`${basePath}/PostTest/MixedFormDataWithFilesContainsOptionalFile`, formData, (_err, res) => {
        expect(res.body.username).to.equal(formData.username);
        for (const fieldName of ['avatar', 'optionalAvatar']) {
          const file = res.body[fieldName];
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

  function verifyRequest(verifyResponse: (err: any, res: any) => any, methodOperation: (request: request.SuperTest<any>) => request.Test, expectedStatus = 200) {
    return new Promise<void>((resolve, reject) => {
      methodOperation(request(server.listener))
        .expect(expectedStatus)
        .end((err: any, res: any) => {
          let parsedError: any;
          try {
            parsedError = JSON.parse(res.error);
          } catch (err) {
            parsedError = res?.error;
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
    // Defining as Partial to help writing and allowing to leave out values that should be dropped or made optional in generation
    // (typed either as undefined or union with undefined typed member)
    const testModel: Partial<TestModel> = {
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
    return testModel as TestModel;
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
