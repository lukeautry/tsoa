import { expect } from 'chai';

// GetTestController
import { handler as rootHandler } from 'fixtures/serverless/routes/RootController/rootHandler';
import { handler as rootControllerMethodWithPathHandler } from 'fixtures/serverless/routes/RootController/rootControllerMethodWithPath';
import { handler as getTestGetModelHandler } from 'fixtures/serverless/routes/GetTestController/getModel';
import { handler as getTestGetCurrentModelHandler } from 'fixtures/serverless/routes/GetTestController/getCurrentModel';
import { handler as getTestSimpleClassWithJsonHandler } from 'fixtures/serverless/routes/GetTestController/simpleClassWithToJSON';
import { handler as getTestMultiResHandler } from 'fixtures/serverless/routes/GetTestController/multipleRes';
import { handler as getTestGetModelByParamsHandler } from 'fixtures/serverless/routes/GetTestController/getModelByParams';
import { handler as getTestRequestHandler } from 'fixtures/serverless/routes/GetTestController/getRequest';
import { handler as getTestGetAllQueriesInOneObject } from 'fixtures/serverless/routes/GetTestController/getAllQueriesInOneObject';
import { handler as getTestGetWildcardQueries } from 'fixtures/serverless/routes/GetTestController/getWildcardQueries';
import { handler as getTestGetTypedRecordQueries } from 'fixtures/serverless/routes/GetTestController/getTypedRecordQueries';
// import { handler as getTestGetRes } from 'fixtures/serverless/routes/GetTestController/getRes';
import { handler as getTestMultipleStatusCodeRes } from 'fixtures/serverless/routes/GetTestController/multipleStatusCodeRes'
// import { handler as getTestMultiRes } from 'fixtures/serverless/routes/GetTestController/multipleRes';
import { handler as getTestGetBuffer } from 'fixtures/serverless/routes/GetTestController/getBuffer';
import { handler as getTestGetStream } from 'fixtures/serverless/routes/GetTestController/getStream';
import { handler as getTestControllerGetGenericModelHandler } from 'fixtures/serverless/routes/GetTestController/getGenericModel';
import { handler as getTestControllerGetGenericModelArrayHandler } from 'fixtures/serverless/routes/GetTestController/getGenericModelArray';
import { handler as getTestControllerGetGenericPrimitiveHandler } from 'fixtures/serverless/routes/GetTestController/getGenericPrimitive';
import { handler as getTestControllerGetGenericPrimitiveArrayHandler } from 'fixtures/serverless/routes/GetTestController/getGenericPrimitiveArray';
// PostTestController
import { handler as postControllerPostModelHandler } from 'fixtures/serverless/routes/PostTestController/postModel';
import { handler as postControllerPostWithDifferentReturnCode } from 'fixtures/serverless/routes/PostTestController/postWithDifferentReturnCode';
import { handler as postControllerPostClassModelHandler } from 'fixtures/serverless/routes/PostTestController/postClassModel';
import { handler as postControllerPostObjectHandler } from 'fixtures/serverless/routes/PostTestController/postObject';
import { handler as postControllerGetGenericRequestHandler } from 'fixtures/serverless/routes/PostTestController/getGenericRequest';
// OptionTestController
import { handler as optionControllerMethodExistsCurrentHandler } from 'fixtures/serverless/routes/OptionsTestController/methodExistsCurrent'
// TestController
import { handler as testControllerNormalStatusCodeHandler } from 'fixtures/serverless/routes/TestController/normalStatusCode';
import { handler as testControllerFalseStatusCodeHandler } from 'fixtures/serverless/routes/TestController/falseStatusCode';
import { handler as testControllerZeroStatusCodeHandler } from 'fixtures/serverless/routes/TestController/zeroStatusCode';
import { handler as testControllerNoContentStatusCodeHandler } from 'fixtures/serverless/routes/TestController/noContentStatusCode';
import { handler as testControllerCustomNomalStatusCodeHandler } from 'fixtures/serverless/routes/TestController/customNomalStatusCode';
import { handler as testControllerCustomHeaderHandler } from 'fixtures/serverless/routes/TestController/customHeader';
import { handler as testControllerGetUnavailableForLegalReasonsErrorHandler } from 'fixtures/serverless/routes/TestController/getUnavailableForLegalReasonsError';
// NotExtendsController
import { handler as notExtendsControllerCustomSuccessResponseCodeHandler } from 'fixtures/serverless/routes/NoExtendsController/customSuccessResponseCode';
import { handler as notExtendsControllerEnumSuccessResponseCodeHandler } from 'fixtures/serverless/routes/NoExtendsController/enumSuccessResponseCode';
import { handler as notExtendsControllerRangedSuccessResponseHandler } from 'fixtures/serverless/routes/NoExtendsController/rangedSuccessResponse';
// ValidateController
import { handler as validateControllerDateValidateHandler } from 'fixtures/serverless/routes/ValidateController/dateValidate';
import { handler as validateControllerDateTimeValidateHandler } from 'fixtures/serverless/routes/ValidateController/dateTimeValidate';
import { handler as validateControllerLongValidateHandler } from 'fixtures/serverless/routes/ValidateController/longValidate';
import { handler as validateControllerDoubleValidateHandler } from 'fixtures/serverless/routes/ValidateController/doubleValidate';
import { handler as validateControllerBooleanValidateHandler } from 'fixtures/serverless/routes/ValidateController/booleanValidate';
import { handler as validateControllerStringValidateHandler } from 'fixtures/serverless/routes/ValidateController/stringValidate';
import { handler as validateControllerBodyValidateHandler } from 'fixtures/serverless/routes/ValidateController/bodyValidate';
import { handler as validateControllerCustomRequiredErrorMsgHandler } from 'fixtures/serverless/routes/ValidateController/customRequiredErrorMsg';
import { handler as validateControllerCustomInvalidErrorMsg } from 'fixtures/serverless/routes/ValidateController/customInvalidErrorMsg';
import { handler as validateControllerGetNumberBodyRequest } from 'fixtures/serverless/routes/ValidateController/getNumberBodyRequest';
import { handler as validateControllerGetDictionaryRequest } from 'fixtures/serverless/routes/ValidateController/getDictionaryRequest';
// ParameterController
import { handler as parameterControllerGetQueryHandler } from 'fixtures/serverless/routes/ParameterController/getQuery';
import { handler as parameterControllerGetQueriesHandler } from 'fixtures/serverless/routes/ParameterController/getQueries';
import { handler as parameterControllerGetPathHandler } from 'fixtures/serverless/routes/ParameterController/getPath';
import { handler as parameterControllerGetHeaderHandler } from 'fixtures/serverless/routes/ParameterController/getHeader';
import { handler as parameterControllerGetRequestHandler } from 'fixtures/serverless/routes/ParameterController/getRequest';
import { handler as parameterControllerGetRequestPropHandler } from 'fixtures/serverless/routes/ParameterController/getRequestProp';
import { handler as parameterControllerGetBodyHandler } from 'fixtures/serverless/routes/ParameterController/getBody';
import { handler as parameterControllerGetBodyPropsHandler } from 'fixtures/serverless/routes/ParameterController/getBodyProps';
// SubResourceTestController
import { handler as subResourceTestControllerGetSubResourceHandler } from 'fixtures/serverless/routes/SubResourceTestController/getSubResource';
import { handler as subResourceTestControllerGetWithParameterHandler } from 'fixtures/serverless/routes/SubResourceTestController/getWithParameter';

import { Gender, GenericModel, GenericRequest, ParameterTestModel, TestClassModel, TestModel, ValidateMapStringToAny, ValidateMapStringToNumber, ValidateModel } from 'fixtures/testModel';
import { base64image } from 'fixtures/base64image';

describe('Serverless', () => {
  describe('RootController', () => {
    it('can handle get request to root controller`s path', async () => {
      const { statusCode, body } = await rootHandler({ body: null }, getTestContext());

      const model = JSON.parse(body) as TestModel;
      expect(model.id).to.equal(1);
      expect(statusCode).to.equal(200);
    });

    it('can handle get request to root controller`s method path', async () => {
      const { statusCode, body } = await rootControllerMethodWithPathHandler({ body: null }, getTestContext());

      const model = JSON.parse(body) as TestModel;
      expect(model.id).to.equal(1);
      expect(statusCode).to.equal(200);
    });
  });

  describe('GetTestController', () => {
    it('can handle get request with no path argument', async () => {
      const { statusCode, body } = await getTestGetModelHandler({ body: null }, getTestContext());

      const model = JSON.parse(body) as TestModel;
      expect(model.id).to.equal(1);
      expect(statusCode).to.equal(200);
    });

    it('can handle get request with path argument', async () => {
      const { statusCode, body } = await getTestGetCurrentModelHandler({ body: null }, getTestContext());

      const model = JSON.parse(body) as TestModel;
      expect(model.id).to.equal(1);
      expect(statusCode).to.equal(200);
    });

    it('respects toJSON for class serialization', async () => {
      const { statusCode, body } = await getTestSimpleClassWithJsonHandler({ body: null }, getTestContext());

      const getterClass = JSON.parse(body);
      expect(getterClass).to.haveOwnProperty('a');
      expect(getterClass.a).to.equal('hello, world');
      expect(getterClass).to.not.haveOwnProperty('b');
      expect(statusCode).to.equal(200);
    });

    it.skip('[Serverless not support] cannot handle get request with collection return value', async () => {
      const { statusCode, body } = await getTestMultiResHandler({ body: null }, getTestContext());

      const data = JSON.parse(body);
      expect(data.error).to.contains('Error: Unsupported parameter type "res"');
      /*
      Serverless is not support @Res decorator.
      const models = JSON.parse(body) as TestModel[];

      expect(models.length).to.equal(3);
      models.forEach(m => {
        expect(m.id).to.equal(1);
      });
      */
    });

    describe('getModelsByParam', () => {
      it('can handle get request with path and query parameters', async () => {
        const { statusCode, body } = await getTestGetModelByParamsHandler({
          body: null,
          pathParameters: {
            'numberPathParam': '1',
            'booleanPathParam': 'true',
            'stringPathParam': 'test',
          },
          queryStringParameters: {
            'booleanParam': 'true',
            'stringParam': 'test1234',
            'numberParam': '1234',
          },
        }, getTestContext());

        const model = JSON.parse(body) as TestModel;
        expect(model.id).to.equal(1);
        expect(statusCode).to.equal(200);
      });

      it('parses path parameters', async () => {
        const numberValue = 10;
        const boolValue = false;
        const stringValue = 'the-string';

        const { statusCode, body } = await getTestGetModelByParamsHandler({
          body: null,
          pathParameters: {
            'numberPathParam': numberValue,
            'booleanPathParam': boolValue,
            'stringPathParam': stringValue,
          },
          queryStringParameters: {
            'booleanParam': 'true',
            'stringParam': 'test1234',
            'numberParam': '1234',
          },
        }, getTestContext());

        const model = JSON.parse(body) as TestModel;
        expect(model.numberValue).to.equal(numberValue);
        expect(model.boolValue).to.equal(boolValue);
        expect(model.stringValue).to.equal(stringValue);
        expect(statusCode).to.equal(200);
      });

      it('parses query parameters', async () => {
        const numberValue = 10;
        const optionalStringValue = 'the-string';

        const { statusCode, body } = await getTestGetModelByParamsHandler({
          body: null,
          pathParameters: {
            'numberPathParam': 1,
            'booleanPathParam': true,
            'stringPathParam': 'testing',
          },
          queryStringParameters: {
            'booleanParam': 'true',
            'stringParam': 'test1234',
            'numberParam': numberValue,
            'optionalStringParam': optionalStringValue,
          },
        }, getTestContext());

        const model = JSON.parse(body) as TestModel;
        expect(model.optionalString).to.equal(optionalStringValue);
        expect(statusCode).to.equal(200);
      });

      it('returns error if missing required query parameter', async () => {
        const { statusCode, body } = await getTestGetModelByParamsHandler({
          body: null,
          pathParameters: {
            'numberPathParam': '1',
            'booleanPathParam': 'true',
            'stringPathParam': 'test',
          },
          queryStringParameters: {
            'booleanParam': 'true',
            'stringParam': 'test1234',
          },
        }, getTestContext());

        const { fields } = JSON.parse(body);
        expect(fields.numberParam.message).to.equal(`'numberParam' is required`);
        expect(statusCode).to.equal(400);
      });

      it('returns error if missing required path parameter', async () => {
        /**
         * Serverless different than traditional server,
         * If a not-fullfilled request send to given controller,
         *  Serverless will return 400 because broke request rather than 404 in traditional server.
         */
        const { statusCode } = await getTestGetModelByParamsHandler({
          body: null,
          pathParameters: {
            'numberPathParam': '1',
            'booleanPathParam': 'true',
          },
          queryStringParameters: {
            'booleanParam': 'true',
            'stringParam': 'test1234',
          },
        }, getTestContext());

        expect(statusCode).to.equal(400);
      });

      it('returns error and custom error message', async () => {
        const { statusCode, body } = await getTestGetModelByParamsHandler({
          body: null,
          pathParameters: {
            'numberPathParam': '1',
            'booleanPathParam': 'true',
            'stringPathParam': 'test',
          },
          queryStringParameters: {
            'booleanParam': 'true',
            'numberParam': '1234',
          },
        }, getTestContext());

        const {fields } = JSON.parse(body);
        expect(fields.stringParam.message).to.equal(`Custom error message`);
        expect(statusCode).to.equal(400);
      });
    });

    it.skip('[Serverless not support] injects express request in parameters', async () => {
      const { statusCode, body } = await getTestRequestHandler({ body: null }, getTestContext());

      const model = JSON.parse(body) as TestModel;
      expect(model.id).to.equal(1);
      expect(model.stringValue).to.equal('fancyStringForContext');
      expect(statusCode).to.equal(200);
    });

    it('parses queries parameters in one single object', async () => {
      const numberValue = 10;
      const boolValue = true;
      const stringValue = 'the-string';

      const { statusCode, body } = await getTestGetAllQueriesInOneObject({
        body: null,
        queryStringParameters: {
          'booleanParam': boolValue,
          'stringParam': stringValue,
          'numberParam': numberValue,
        },
      }, getTestContext());

      const queryParams = JSON.parse(body) as TestModel;
      expect(queryParams.numberValue).to.equal(numberValue);
      expect(queryParams.boolValue).to.equal(boolValue);
      expect(queryParams.stringValue).to.equal(stringValue);
      expect(queryParams.optionalString).to.be.undefined;
      expect(statusCode).to.equal(200);
    });

    it('accepts any parameter using a wildcard', async () => {
      const object = {
        foo: 'foo',
        bar: 10,
        baz: true,
      };

      const { statusCode, body } = await getTestGetWildcardQueries({
        body: null,
        queryStringParameters: {
          'foo': object.foo,
          'bar': object.bar,
          'baz': object.baz,
        },
      }, getTestContext());

      const queryParams = JSON.parse(body) as TestModel;
      expect(queryParams.anyType.foo).to.equal(object.foo);
      expect(queryParams.anyType.bar).to.equal(object.bar);
      expect(queryParams.anyType.baz).to.equal(object.baz);
      expect(statusCode).to.equal(200);
    });

    describe('getTypedRecordQueries', () => {
      it('accepts numbered parameters using a wildcard', async () => {
        const object = {
          foo: '3',
          bar: 10,
        };

        const { statusCode, body } = await getTestGetTypedRecordQueries({
          body: null,
          queryStringParameters: {
            'foo': object.foo,
            'bar': object.bar,
          },
        }, getTestContext());

        const queryParams = JSON.parse(body) as TestModel;
        expect(queryParams.anyType.foo).to.equal(Number(object.foo));
        expect(queryParams.anyType.bar).to.equal(object.bar);
        expect(statusCode).to.equal(200);
      });

      it('should reject incompatible entries for typed wildcard', async () => {
        const object = {
          foo: '2',
          bar: 10,
          baz: true,
        };

        const { statusCode, body } = await getTestGetTypedRecordQueries({
          body: null,
          queryStringParameters: {
            'foo': object.foo,
            'bar': object.bar,
            'baz': object.baz,
          },
        }, getTestContext());

        const { fields } = JSON.parse(body);
        expect(fields['queryParams.baz'].message).to.equal('invalid float number');
        expect(statusCode).to.equal(400);
      });
    });

    describe.skip('[Serverless not support] @Res', () => {
      it('Should return on @Res', async () => {
        // const { statusCode, body } = await getTestGetRes({ body: null }, getTestContext());
        // const model = res.body as TestModel;
        // expect(model.id).to.equal(1);
        // expect(res.get('custom-header')).to.eq('hello');
      });

      [400, 500].forEach(status =>
        it('Should support multiple status codes with the same @Res structure', async () => {
          const { statusCode, body } = await getTestMultipleStatusCodeRes({
            body: null,
            pathParameters: {
              statusCode: status,
            },
          }, getTestContext());

          // const model = res.body as TestModel;
          // expect(model.id).to.equal(1);
          // expect(res.get('custom-header')).to.eq('hello');
        }),
      );

      it('Should not modify the response after headers sent', async () => {
        const { statusCode, body } = await getTestMultipleStatusCodeRes({ body: null }, getTestContext());

        // const model = res.body as TestModel;
        // expect(model.id).to.equal(1);
        // expect(res.get('custom-header')).to.eq('hello');
      });
    });

    it('parses buffer parameter', async () => {
      const { statusCode, body } = await getTestGetBuffer({
        body: null,
        queryStringParameters: {
          buffer: base64image,
        },
      }, getTestContext());

      const bufferData = Buffer.from(JSON.parse(body));
      expect(bufferData.toLocaleString()).to.equal('testbuffer');
      expect(statusCode).to.equal(200);
    });

    it.skip('[Serverless not support yet] returns streamed responses', async () => {
      const { statusCode, body } = await getTestGetStream({ body: null }, getTestContext());

      // expect(body).to.equal('testbuffer');
    });
  });

  describe('PostTestController', () => {
    describe('Regular Post', () => {
      it('parsed body parameters', async () => {
        const data = getFakeModel();
        const { statusCode, body } = await postControllerPostModelHandler({
          body: JSON.stringify(data),
        }, getTestContext());

        const model = JSON.parse(body) as TestModel;
        expect(model).to.deep.equal(model);
        expect(statusCode).to.equal(200);
      });

      it('removes additional properties', async () => {
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
        const { statusCode, body } = await postControllerPostModelHandler({
          body: JSON.stringify(data),
        }, getTestContext());

        const resModel = JSON.parse(body) as TestModel;
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
        expect(statusCode).to.equal(200);
      });

      it('correctly returns status code', async () => {
        const data = getFakeModel();
        const { statusCode, body } = await postControllerPostWithDifferentReturnCode({
          body: JSON.stringify(data),
        }, getTestContext());

        expect(statusCode).to.equal(201);
      });

      it('parses class model as body parameter', async () => {
        const data = getFakeClassModel();
        const { statusCode, body } = await postControllerPostClassModelHandler({
          body: JSON.stringify(data),
        }, getTestContext());

        const model = JSON.parse(body) as TestClassModel;
        expect(model.id).to.equal(700); // this gets changed on the server
        expect(statusCode).to.equal(200);
      });

      it('should parse valid date', async () => {
        const data = getFakeModel();
        data.dateValue = '2016-01-01T00:00:00Z' as any;
        const { statusCode, body } = await postControllerPostModelHandler({ body: JSON.stringify(data) }, getTestContext());

        const { dateValue } = JSON.parse(body);
        expect(dateValue).to.equal('2016-01-01T00:00:00.000Z');
        expect(statusCode).to.equal(200);
      });

      it('should reject invalid numbers', async () => {
        const invalidValues = ['test', null, undefined, {}];


        for (const value of invalidValues) {
          const data = getFakeModel();
          data.numberValue = value as any;
          const { statusCode } = await postControllerPostModelHandler({ body: JSON.stringify(data) }, getTestContext());

          expect(statusCode).to.equal(400);
        }
      });

      it('should reject invalid strings', async () => {
        const invalidValues = [
          null,
          1,
          undefined,
          {},
        ];

        for (const value of invalidValues) {
          const data = getFakeModel();
          data.stringValue = value as any;

          const { statusCode } = await postControllerPostModelHandler({ body: JSON.stringify(data) }, getTestContext());

          expect(statusCode).to.equal(400);
        }
      });

      it('should reject invalid dates', async () => {
        const invalidValues = [1, {}];

        for (const value of invalidValues) {
            const data = getFakeModel();
            data.dateValue = value as any;
          const { statusCode } = await postControllerPostModelHandler({ body: JSON.stringify(data) }, getTestContext());

          expect(statusCode).to.equal(400);
        }
      });

      it('returns error if invalid request', async () => {
        const data = getFakeModel();
        data.dateValue = 1 as any;
        const { statusCode, body } = await postControllerPostModelHandler({ body: JSON.stringify(data) }, getTestContext());

        const { fields } = JSON.parse(body);
        expect(fields['model.dateValue'].message).to.equal('invalid ISO 8601 datetime format, i.e. YYYY-MM-DDTHH:mm:ss');
        expect(fields['model.dateValue'].value).to.equal(1);
        expect(statusCode).to.equal(400);
      });

      it('should reject invalid additionalProperties', async () => {
        const invalidValues = [
          'invalid',
          null,
          [],
          1,
          { foo: null },
          { foo: 1 },
          { foo: [] },
          { foo: {} },
          { foo: { foo: 'bar' } },
        ];

        for (const value of invalidValues) {
          const { statusCode, body } = await postControllerPostObjectHandler({
            body: JSON.stringify({ obj: value }),
          }, getTestContext());

          expect(statusCode).to.equal(400);
        }
      });
    });
  });

  describe('OptionTestController', () => {
    it('correctly handles OPTIONS requests', async () => {
      const { statusCode } = await optionControllerMethodExistsCurrentHandler({ body: null }, getTestContext());

      expect(statusCode).to.equal(204);
    });
  });

  describe('Controller', () => {
    it('should normal status code', async () => {
      const { statusCode } = await testControllerNormalStatusCodeHandler({ body: null }, getTestContext());

      expect(statusCode).to.equal(200);
    });

    it('should normal status code with false boolean result', async () => {
      const { statusCode } = await testControllerFalseStatusCodeHandler({ body: null }, getTestContext());

      expect(statusCode).to.equal(200);
    });

    it('should normal status code with 0 result', async () => {
      const { statusCode } = await testControllerZeroStatusCodeHandler({ body: null }, getTestContext());

      expect(statusCode).to.equal(200);
    });

    it('should no content status code', async () => {
      const { statusCode } = await testControllerNoContentStatusCodeHandler({ body: null }, getTestContext());

      expect(statusCode).to.equal(204);
    });

    it('should custom status code', async () => {
      const { statusCode } = await testControllerCustomNomalStatusCodeHandler({ body: null }, getTestContext());

      expect(statusCode).to.equal(205);
    });

    it('should custom header', async () => {
      const { statusCode, headers } = await testControllerCustomHeaderHandler({}, getTestContext());

      expect(headers.hero).to.equal('IronMan');
      expect(headers.name).to.equal('Tony Stark');
      expect(headers['set-cookie']).to.eql(['token=MY_AUTH_TOKEN;', 'refreshToken=MY_REFRESH_TOKEN;']);
      expect(statusCode).to.equal(204);
    });

    it.skip('{WAIT FIX} should unavailable for legal reasons status code', async () => {
      const { statusCode } = await testControllerGetUnavailableForLegalReasonsErrorHandler({ body: null }, getTestContext());

      expect(statusCode).to.equal(451);
    });
  });

  describe('NoExtends', () => {
    it('should apply custom code from success response', async () => {
      const { statusCode } = await notExtendsControllerCustomSuccessResponseCodeHandler({ body: null }, getTestContext());

      expect(statusCode).to.equal(202);
    });

    it('should apply enum code from success response', async () => {
      const { statusCode } = await notExtendsControllerEnumSuccessResponseCodeHandler({ body: null }, getTestContext());

      expect(statusCode).to.equal(202);
    });

    it('should ignore 2XX code range from success response', async () => {
      const { statusCode } = await notExtendsControllerRangedSuccessResponseHandler({ body: null }, getTestContext());

      expect(statusCode).to.equal(204);
    });
  });

  describe.skip('[Serverless not support] Custom Content-Type', () => {
    it('should return custom content-type if given', () => {
      // return verifyPostRequest(
      //   basePath + '/MediaTypeTest/Custom',
      //   { name: 'foo' },
      //   (_err, res) => {
      //     expect(res.type).to.eq('application/vnd.mycompany.myapp.v2+json');
      //   },
      //   202,
      // );
    });

    it('should return custom content-type based on "Accept" header', () => {
      // return verifyRequest(
      //   (_err, res) => {
      //     const { body, type } = res;
      //     expect(body.codename).to.eq('foo');
      //     expect(type).to.eq('application/vnd.mycompany.myapp.v4+json');
      //   },
      //   request => {
      //     return request.get(basePath + '/RequestAcceptHeaderTest/Multi/1').set({
      //       Accept: 'application/vnd.mycompany.myapp.v4+json',
      //     });
      //   },
      //   200,
      // );
    });
  });

  describe('Validate', () => {
    describe('dateValidate', () => {
      it('should valid minDate and maxDate validation of date type', async () => {
        const minDate = '2019-01-01';
        const maxDate = '2015-01-01';
        const { statusCode, body } = await validateControllerDateValidateHandler({
          body: null,
          queryStringParameters: {
            minDateValue: minDate,
            maxDateValue: maxDate,
          },
        }, getTestContext());

        const { minDateValue, maxDateValue } = JSON.parse(body);
        expect(new Date(minDateValue)).to.deep.equal(new Date(minDate));
        expect(new Date(maxDateValue)).to.deep.equal(new Date(maxDate));
        expect(statusCode).to.equal(200);
      });

      it('should invalid minDate and maxDate validation of date type', async () => {
        const date = '2017-01-01';
        const { statusCode, body } = await validateControllerDateValidateHandler({
          body: null,
          queryStringParameters: {
            minDateValue: date,
            maxDateValue: date,
          },
        }, getTestContext());

        const { fields } = JSON.parse(body);
        expect(fields.minDateValue.message).to.equal(`minDate '2018-01-01'`);
        expect(fields.minDateValue.value).to.equal(date);
        expect(fields.maxDateValue.message).to.equal(`maxDate '2016-01-01'`);
        expect(fields.maxDateValue.value).to.equal(date);
        expect(statusCode).to.equal(400);
      });
    });

    describe('dateTimeValidate', () => {
      it('should valid minDate and maxDate validation of datetime type', async () => {
        const minDate = '2019-01-01T00:00:00';
        const maxDate = '2015-01-01T00:00:00';
        const { statusCode, body } = await validateControllerDateTimeValidateHandler({
          body: null,
          queryStringParameters: {
            minDateValue: minDate,
            maxDateValue: maxDate,
          },
        }, getTestContext());

        const { maxDateValue, minDateValue } = JSON.parse(body);
        expect(new Date(minDateValue)).to.deep.equal(new Date(minDate));
        expect(new Date(maxDateValue)).to.deep.equal(new Date(maxDate));
        expect(statusCode).to.equal(200);
      });

      it('should invalid minDate and maxDate validation of datetime type', async () => {
        const date = '2017-01-01T00:00:00';
        const { statusCode, body } = await validateControllerDateTimeValidateHandler({
          body: null,
          queryStringParameters: {
            minDateValue: date,
            maxDateValue: date,
          },
        }, getTestContext());

        const { fields } = JSON.parse(body);
        expect(fields.minDateValue.message).to.equal(`minDate '2018-01-01T00:00:00'`);
        expect(fields.minDateValue.value).to.equal(date);
        expect(fields.maxDateValue.message).to.equal(`maxDate '2016-01-01T00:00:00'`);
        expect(fields.maxDateValue.value).to.equal(date);
        expect(statusCode).to.equal(400);
      });
    });

    describe('longValidate', () => {
      it('should valid max and min validation of integer type', async () => {
        const { statusCode, body } = await validateControllerLongValidateHandler({
          body: null,
          queryStringParameters: {
            value: 6,
            value_max: 2,
          },
        }, getTestContext());

        const { minValue, maxValue } = JSON.parse(body);
        expect(minValue).to.equal(6);
        expect(maxValue).to.equal(2);
        expect(statusCode).to.equal(200);
      });

      it('should invalid max and min validation of integer type', async () => {
        const value = 4;
        const { statusCode, body } = await validateControllerLongValidateHandler({
          body: null,
          queryStringParameters: {
            value,
            value_max: value,
          },
        }, getTestContext());

        const { fields } = JSON.parse(body);
        expect(fields.value.message).to.equal('min 5');
        expect(fields.value.value).to.equal(value);
        expect(fields.value_max.message).to.equal('max 3');
        expect(fields.value_max.value).to.equal(value);
        expect(statusCode).to.equal(400);
      });
    });

    describe('doubleValidate', () => {
      it('should valid max and min validation of float type', async () => {
        const { statusCode, body } = await validateControllerDoubleValidateHandler({
          body: null,
          queryStringParameters: {
            minValue: 5.6,
            maxValue: 3.4,
          },
        }, getTestContext());

        const { minValue, maxValue } = JSON.parse(body);
        expect(minValue).to.equal(5.6);
        expect(maxValue).to.equal(3.4);
        expect(statusCode).to.equal(200);
      });

      it('should invalid max and min validation of float type', async () => {
        const value = 4.5;
        const { statusCode, body } = await validateControllerDoubleValidateHandler({
          body: null,
          queryStringParameters: {
            minValue: value,
            maxValue: value,
          },
        }, getTestContext());

        const { fields } = JSON.parse(body);
        expect(fields.minValue.message).to.equal('min 5.5');
        expect(fields.minValue.value).to.equal(value);
        expect(fields.maxValue.message).to.equal('max 3.5');
        expect(fields.maxValue.value).to.equal(value);
        expect(statusCode).to.equal(400);
      });
    });

    describe('booleanValidate', () => {
      it('should valid validation of boolean type', async () => {
        const { statusCode, body } = await validateControllerBooleanValidateHandler({
          body: null,
          queryStringParameters: {
            boolValue: true,
          },
        }, getTestContext());

        const { boolValue } = JSON.parse(body);
        expect(boolValue).to.equal(true);
        expect(statusCode).to.equal(200);
      });

      it('should invalid validation of boolean type', async () => {
        const value = 'true0001';
        const { statusCode, body } = await validateControllerBooleanValidateHandler({
          body: null,
          queryStringParameters: {
            boolValue: value,
          },
        }, getTestContext());

        const { fields } = JSON.parse(body);
        expect(fields.boolValue.message).to.equal('boolValue');
        expect(fields.boolValue.value).to.equal(value);
        expect(statusCode).to.equal(400);
      });
    });

    describe('stringValidate', () => {
      it('should valid minLength, maxLength and pattern (quoted/unquoted) validation of string type', async () => {
        const { statusCode, body } = await validateControllerStringValidateHandler({
          body: null,
          queryStringParameters: {
            minLength: 'abcdef',
            maxLength: 'ab',
            patternValue: 'aBcDf',
            quotedPatternValue: 'A',
          },
        }, getTestContext());

        const { minLength, maxLength, patternValue, quotedPatternValue } = JSON.parse(body);
        expect(minLength).to.equal('abcdef');
        expect(maxLength).to.equal('ab');
        expect(patternValue).to.equal('aBcDf');
        expect(quotedPatternValue).to.equal('A');
        expect(statusCode).to.equal(200);
      });

      it('should invalid minLength, maxLength and pattern (quoted/unquoted) validation of string type', async () => {
        const value = '1234';
        const { statusCode, body } = await validateControllerStringValidateHandler({
          body: null,
          queryStringParameters: {
            minLength: value,
            maxLength: value,
            patternValue: value,
            quotedPatternValue: 'A@',
          },
        }, getTestContext());

        const { fields } = JSON.parse(body);
        expect(fields.minLength.message).to.equal('minLength 5');
        expect(fields.minLength.value).to.equal(value);
        expect(fields.maxLength.message).to.equal('maxLength 3');
        expect(fields.maxLength.value).to.equal(value);
        expect(fields.patternValue.message).to.equal("Not match in '^[a-zA-Z]+$'");
        expect(fields.patternValue.value).to.equal(value);
        expect(fields.quotedPatternValue.message).to.equal("Not match in '^([A-Z])(?!@)$'");
        expect(fields.quotedPatternValue.value).to.equal('A@');
        expect(statusCode).to.equal(400);
      });
    });

    describe('bodyValidate', () => {
      it('should valid model validate', async () => {
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
        const { statusCode, body: resBody } = await validateControllerBodyValidateHandler({
          body: JSON.stringify(bodyModel),
        }, getTestContext());

        const body = JSON.parse(resBody) as ValidateModel;

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
        expect(statusCode).to.equal(200);
      });

      it('should invalid model validate', async () => {
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
        const { statusCode, body: resBody } = await validateControllerBodyValidateHandler({
          body: JSON.stringify(bodyModel),
        }, getTestContext());

        const { fields } = JSON.parse(resBody);

        expect(fields['body.floatValue'].message).to.equal('Invalid float error message.');
        expect(fields['body.floatValue'].value).to.equal(bodyModel.floatValue);
        expect(fields['body.doubleValue'].message).to.equal('Invalid double error message.');
        expect(fields['body.doubleValue'].value).to.equal(bodyModel.doubleValue);
        expect(fields['body.intValue'].message).to.equal('invalid integer number');
        expect(fields['body.intValue'].value).to.equal(bodyModel.intValue);
        expect(fields['body.longValue'].message).to.equal('Custom Required long number.');
        expect(fields['body.longValue'].value).to.equal(bodyModel.longValue);
        expect(fields['body.booleanValue'].message).to.equal('invalid boolean value');
        expect(fields['body.booleanValue'].value).to.equal(bodyModel.booleanValue);

        expect(fields['body.dateValue'].message).to.equal('invalid ISO 8601 date format, i.e. YYYY-MM-DD');
        expect(fields['body.dateValue'].value).to.equal(bodyModel.dateValue);
        expect(fields['body.datetimeValue'].message).to.equal('invalid ISO 8601 datetime format, i.e. YYYY-MM-DDTHH:mm:ss');
        expect(fields['body.datetimeValue'].value).to.equal(bodyModel.datetimeValue);

        expect(fields['body.numberMax10'].message).to.equal('max 10');
        expect(fields['body.numberMax10'].value).to.equal(bodyModel.numberMax10);
        expect(fields['body.numberMin5'].message).to.equal('min 5');
        expect(fields['body.numberMin5'].value).to.equal(bodyModel.numberMin5);
        expect(fields['body.stringMax10Lenght'].message).to.equal('maxLength 10');
        expect(fields['body.stringMax10Lenght'].value).to.equal(bodyModel.stringMax10Lenght);
        expect(fields['body.stringMin5Lenght'].message).to.equal('minLength 5');
        expect(fields['body.stringMin5Lenght'].value).to.equal(bodyModel.stringMin5Lenght);
        expect(fields['body.stringPatternAZaz'].message).to.equal("Not match in '^[a-zA-Z]+$'");
        expect(fields['body.stringPatternAZaz'].value).to.equal(bodyModel.stringPatternAZaz);

        expect(fields['body.arrayMax5Item'].message).to.equal('maxItems 5');
        expect(fields['body.arrayMax5Item'].value).to.deep.equal(bodyModel.arrayMax5Item);
        expect(fields['body.arrayMin2Item'].message).to.equal('minItems 2');
        expect(fields['body.arrayMin2Item'].value).to.deep.equal(bodyModel.arrayMin2Item);
        expect(fields['body.arrayUniqueItem'].message).to.equal('required unique array');
        expect(fields['body.arrayUniqueItem'].value).to.deep.equal(bodyModel.arrayUniqueItem);
        expect(fields['body.model'].message).to.equal('invalid object');
        expect(fields['body.model'].value).to.deep.equal(bodyModel.model);
        expect(fields['body.mixedUnion'].message).to.equal(
          'Could not match the union against any of the items. ' +
            'Issues: [{"body.mixedUnion":{"message":"invalid string value","value":123}},' +
            '{"body.mixedUnion":{"message":"invalid object","value":123}}]',
        );
        expect(fields['body.intersection'].message).to.equal('Could not match the intersection against every type. Issues: [{"body.intersection.value2":{"message":"\'value2\' is required"}}]');
        expect(fields['body.singleBooleanEnum'].message).to.equal('should be one of the following; [true]');

        expect(fields['body.nestedObject.floatValue'].message).to.equal('Invalid float error message.');
        expect(fields['body.nestedObject.floatValue'].value).to.equal(bodyModel.floatValue);
        expect(fields['body.nestedObject.doubleValue'].message).to.equal('Invalid double error message.');
        expect(fields['body.nestedObject.doubleValue'].value).to.equal(bodyModel.doubleValue);
        expect(fields['body.nestedObject.intValue'].message).to.equal('invalid integer number');
        expect(fields['body.nestedObject.intValue'].value).to.equal(bodyModel.intValue);
        expect(fields['body.nestedObject.longValue'].message).to.equal('Custom Required long number.');
        expect(fields['body.nestedObject.longValue'].value).to.equal(bodyModel.longValue);
        expect(fields['body.nestedObject.booleanValue'].message).to.equal('invalid boolean value');
        expect(fields['body.nestedObject.booleanValue'].value).to.equal(bodyModel.booleanValue);

        expect(fields['body.nestedObject.dateValue'].message).to.equal('invalid ISO 8601 date format, i.e. YYYY-MM-DD');
        expect(fields['body.nestedObject.dateValue'].value).to.equal(bodyModel.dateValue);
        expect(fields['body.nestedObject.datetimeValue'].message).to.equal('invalid ISO 8601 datetime format, i.e. YYYY-MM-DDTHH:mm:ss');
        expect(fields['body.nestedObject.datetimeValue'].value).to.equal(bodyModel.datetimeValue);

        expect(fields['body.nestedObject.numberMax10'].message).to.equal('max 10');
        expect(fields['body.nestedObject.numberMax10'].value).to.equal(bodyModel.numberMax10);
        expect(fields['body.nestedObject.numberMin5'].message).to.equal('min 5');
        expect(fields['body.nestedObject.numberMin5'].value).to.equal(bodyModel.numberMin5);
        expect(fields['body.nestedObject.stringMax10Lenght'].message).to.equal('maxLength 10');
        expect(fields['body.nestedObject.stringMax10Lenght'].value).to.equal(bodyModel.stringMax10Lenght);
        expect(fields['body.nestedObject.stringMin5Lenght'].message).to.equal('minLength 5');
        expect(fields['body.nestedObject.stringMin5Lenght'].value).to.equal(bodyModel.stringMin5Lenght);
        expect(fields['body.nestedObject.stringPatternAZaz'].message).to.equal("Not match in '^[a-zA-Z]+$'");
        expect(fields['body.nestedObject.stringPatternAZaz'].value).to.equal(bodyModel.stringPatternAZaz);

        expect(fields['body.nestedObject.arrayMax5Item'].message).to.equal('maxItems 5');
        expect(fields['body.nestedObject.arrayMax5Item'].value).to.deep.equal(bodyModel.arrayMax5Item);
        expect(fields['body.nestedObject.arrayMin2Item'].message).to.equal('minItems 2');
        expect(fields['body.nestedObject.arrayMin2Item'].value).to.deep.equal(bodyModel.arrayMin2Item);
        expect(fields['body.nestedObject.arrayUniqueItem'].message).to.equal('required unique array');
        expect(fields['body.nestedObject.arrayUniqueItem'].value).to.deep.equal(bodyModel.arrayUniqueItem);
        expect(fields['body.nestedObject.model'].message).to.equal('invalid object');
        expect(fields['body.nestedObject.model'].value).to.deep.equal(bodyModel.model);
        expect(fields['body.nestedObject.mixedUnion'].message).to.equal(
          'Could not match the union against any of the items. ' +
            'Issues: [{"body.nestedObject.mixedUnion":{"message":"invalid string value","value":123}},' +
            '{"body.nestedObject.mixedUnion":{"message":"invalid object","value":123}}]',
        );
        expect(fields['body.nestedObject.intersection'].message).to.equal(
          'Could not match the intersection against every type. Issues: [{"body.nestedObject.intersection.value2":{"message":"\'value2\' is required"}}]',
        );
        expect(fields['body.typeAliases.word'].message).to.equal('minLength 1');
        expect(fields['body.typeAliases.fourtyTwo'].message).to.equal('min 42');
        expect(fields['body.typeAliases.unionAlias'].message).to.contain('Could not match the union against any of the items');
        expect(fields['body.typeAliases.intersectionAlias'].message).to.equal(
          `Could not match the intersection against every type. Issues: [{"body.typeAliases.intersectionAlias.value1":{"message":"'value1' is required"}},{"body.typeAliases.intersectionAlias.value1":{"message":"'value1' is required"}}]`,
        );
        expect(fields['body.typeAliases.nOLAlias'].message).to.equal('invalid object');
        expect(fields['body.typeAliases.genericAlias'].message).to.equal('invalid string value');
        expect(fields['body.typeAliases.genericAlias2.id'].message).to.equal("'id' is required");
        expect(fields['body.typeAliases.forwardGenericAlias'].message).to.contain('Could not match the union against any of the items.');
        expect(fields['body.nullableTypes.numberOrNull'].message).to.equal("'numberOrNull' is required");
        expect(fields['body.nullableTypes.maybeString'].message).to.equal(
          `Could not match the union against any of the items. Issues: [{"body.nullableTypes.maybeString":{"message":"invalid string value","value":1}},{"body.nullableTypes.maybeString":{"message":"should be one of the following; [null]","value":1}}]`,
        );
        expect(fields['body.nullableTypes.wordOrNull'].message).to.equal(
          `Could not match the union against any of the items. Issues: [{"body.nullableTypes.wordOrNull":{"message":"minLength 1","value":""}},{"body.nullableTypes.wordOrNull":{"message":"should be one of the following; [null]","value":""}}]`,
        );
        expect(fields['body.nullableTypes.justNull'].message).to.equal("'justNull' is required");
        expect(statusCode).to.equal(400);
      });
    });

    it('should custom required error message', async () => {
      const { statusCode, body } = await validateControllerCustomRequiredErrorMsgHandler({
        body: null,
        queryStringParameters: {},
      }, getTestContext());

      const { fields } = JSON.parse(body);
      expect(fields.longValue.message).to.equal('Required long number.');
      expect(statusCode).to.equal(400);
    });

    it('should custom invalid datatype error message', async () => {
      const value = '112ab';
      const { statusCode, body } = await validateControllerCustomInvalidErrorMsg({
        body: null,
        queryStringParameters: {
          longValue: value,
        },
      }, getTestContext());

      const { fields } = JSON.parse(body);
      expect(fields.longValue.message).to.equal('Invalid long number.');
      expect(statusCode).to.equal(400);
    });

    describe('map', () => {
      it('should validate string-to-number dictionary body', async () => {
        const data: ValidateMapStringToNumber = {
          key1: 0,
          key2: 1,
          key3: -1,
        };
        const { statusCode, body } = await validateControllerGetNumberBodyRequest({ body: JSON.stringify(data) }, getTestContext());

        const response = JSON.parse(body) as number[];
        expect(response.sort()).to.eql([-1, 0, 1]);
        expect(statusCode).to.equal(200);
      });

      it('should reject string-to-string dictionary body', async () => {
        const data: object = {
          key1: 'val0',
          key2: 'val1',
          key3: '-val1',
        };
        const { statusCode, body } = await validateControllerGetNumberBodyRequest({ body: JSON.stringify(data) }, getTestContext());

        const { fields } = JSON.parse(body);
        expect(fields['map.key1'].message).to.eql('No matching model found in additionalProperties to validate key1');
        expect(statusCode).to.equal(400);
      });
    });

    describe('mapAny', () => {
      it('should validate string-to-any dictionary body', async () => {
        const data: ValidateMapStringToAny = {
          key1: '0',
          key2: 1,
          key3: -1,
        };
        const { statusCode, body } = await validateControllerGetDictionaryRequest({ body: JSON.stringify(data) }, getTestContext());

        const response = JSON.parse(body) as any[];
        expect(response.sort()).to.eql([-1, '0', 1]);
        expect(statusCode).to.equal(200);
      });

      it('should validate string-to-any dictionary body with falsy values', async () => {
        const data: ValidateMapStringToAny = {
          array: [],
          false: false,
          null: null,
          string: '',
          zero: 0,
        };
        const { statusCode, body } = await validateControllerGetDictionaryRequest({ body: JSON.stringify(data) }, getTestContext());

        const response = JSON.parse(body) as any[];
        expect(response.sort()).to.eql([[], '', 0, false, null]);
        expect(statusCode).to.equal(200);
      });
    });
  });

  describe.skip('[Serverless not support] Security', () => {
    const emptyHandler = (_err: unknown, _res: unknown) => {
      // This is an empty handler
    };

    describe('Only API key', () => {
      it('returns the correct user for user id 1', () => {
        // return verifyGetRequest(basePath + '/SecurityTest?access_token=abc123456', (_err, res) => {
        //   const model = res.body as UserResponseModel;
        //   expect(model.id).to.equal(1);
        // });
      });

      it('returns the correct user for user id 2', () => {
        // return verifyGetRequest(basePath + '/SecurityTest?access_token=xyz123456', (_err, res) => {
        //   const model = res.body as UserResponseModel;
        //   expect(model.id).to.equal(2);
        // });
      });

      it('returns response with header set in authentication middleware', () => {
        // return verifyGetRequest(basePath + '/SecurityTest?access_token=def123456', (_err, res) => {
        //   expect(res.headers['some-header']).to.equal('someValueFromAuthenticationMiddleware');
        // });
      });

      it('returns custom response set in authentication middleware', () => {
        // return verifyGetRequest(
        //   basePath + '/SecurityTest?access_token=ghi123456',
        //   (_err, res) => {
        //     expect(res.text).to.equal('some custom response');
        //   },
        //   401,
        // );
      });

      it('returns 401 for an invalid key', () => {
        // return verifyGetRequest(basePath + '/SecurityTest?access_token=invalid', emptyHandler, 401);
      });
    });

    describe('API key or tsoa auth', () => {
      it('returns 200 if the API key is correct', () => {
        // const path = '/SecurityTest/OauthOrApiKey?access_token=abc123456&tsoa=invalid';
        // return verifyGetRequest(basePath + path, emptyHandler, 200);
      });

      it('returns 200 if tsoa auth is correct', () => {
        // const path = '/SecurityTest/OauthOrApiKey?access_token=invalid&tsoa=abc123456';
        // return verifyGetRequest(basePath + path, emptyHandler, 200);
      });

      it('returns 401 if neither API key nor tsoa auth are correct, last error to resolve is returned', () => {
        // const path = '/SecurityTest/OauthOrApiKey?access_token=invalid&tsoa=invalid';
        // return verifyGetRequest(
        //   basePath + path,
        //   err => {
        //     expect(JSON.parse(err.text).message).to.equal('api_key');
        //   },
        //   401,
        // );
      });
    });

    describe('API key and tsoa auth', () => {
      it('returns 200 if API and tsoa auth are correct', () => {
        // const path = '/SecurityTest/OauthAndApiKey?access_token=abc123456&tsoa=abc123456';
        // return verifyGetRequest(basePath + path, emptyHandler, 200);
      });

      it('returns 401 if API key is incorrect', () => {
        // const path = '/SecurityTest/OauthAndApiKey?access_token=abc123456&tsoa=invalid';
        // return verifyGetRequest(basePath + path, emptyHandler, 401);
      });

      it('returns 401 if tsoa auth is incorrect', () => {
        // const path = '/SecurityTest/OauthAndApiKey?access_token=invalid&tsoa=abc123456';
        // return verifyGetRequest(basePath + path, emptyHandler, 401);
      });
    });
  });

  describe('Parameter data', () => {
    it('parses query parameters', async () => {
      const { statusCode, body } = await parameterControllerGetQueryHandler({
        body: null,
        queryStringParameters: {
          firstname: 'Tony',
          last_name: 'Stark',
          age: 45,
          weight: 82.1,
          human: true,
          gender: 'MALE',
          nicknames: ['Ironman', 'Iron Man'],
        },
      }, getTestContext());

      const model = JSON.parse(body) as ParameterTestModel;
      expect(model.firstname).to.equal('Tony');
      expect(model.lastname).to.equal('Stark');
      expect(model.age).to.equal(45);
      expect(model.weight).to.equal(82.1);
      expect(model.human).to.equal(true);
      expect(model.gender).to.equal('MALE');
      expect(model.nicknames).to.deep.equal(['Ironman', 'Iron Man']);
      expect(statusCode).to.equal(200);
    });

    it('parses queries parameters', async () => {
      const { statusCode, body } = await parameterControllerGetQueriesHandler({
        body: null,
        queryStringParameters: {
          firstname: 'Tony',
          lastname: 'Stark',
          age: 45,
          weight: 82.1,
          human: true,
          gender: 'MALE',
          nicknames: ['Ironman', 'Iron Man'],
        },
      }, getTestContext());

      const model = JSON.parse(body) as ParameterTestModel;
      expect(model.firstname).to.equal('Tony');
      expect(model.lastname).to.equal('Stark');
      expect(model.age).to.equal(45);
      expect(model.weight).to.equal(82.1);
      expect(model.human).to.equal(true);
      expect(model.gender).to.equal('MALE');
      expect(model.nicknames).to.deep.equal(['Ironman', 'Iron Man']);
      expect(statusCode).to.equal(200);
    });

    it('parses path parameters', async () => {
      const { statusCode, body } = await parameterControllerGetPathHandler({
        body: null,
        pathParameters: {
          firstname: 'Tony',
          last_name: 'Stark',
          age: 45,
          weight: 82.1,
          human: true,
          gender: 'MALE',
        },
      }, getTestContext());

      const model = JSON.parse(body) as ParameterTestModel;
      expect(model.firstname).to.equal('Tony');
      expect(model.lastname).to.equal('Stark');
      expect(model.age).to.equal(45);
      expect(model.weight).to.equal(82.1);
      expect(model.human).to.equal(true);
      expect(model.gender).to.equal('MALE');
      expect(statusCode).to.equal(200);
    });

    it('parses header parameters', async () => {
      const { statusCode, body } = await parameterControllerGetHeaderHandler({
        headers: {
          age: 45,
          firstname: 'Tony',
          gender: 'MALE',
          human: true,
          last_name: 'Stark',
          weight: 82.1,
        },
      }, getTestContext());

      const model = JSON.parse(body);
      expect(model.firstname).to.equal('Tony');
      expect(model.lastname).to.equal('Stark');
      expect(model.age).to.equal(45);
      expect(model.weight).to.equal(82.1);
      expect(model.human).to.equal(true);
      expect(model.gender).to.equal('MALE');
      expect(statusCode).to.equal(200);
    });

    it('invalid header parameters have expected errors', async () => {
      const { statusCode, body } = await parameterControllerGetHeaderHandler({
        headers: {
          age: 'asdf',
          gender: 'male',
          human: 123,
          last_name: 123,
          weight: 'hello',
        },
      }, getTestContext());

      const { fields } = JSON.parse(body);
      expect(fields.firstname.message).to.equal("'firstname' is required");
      expect(fields.gender.message).to.equal("should be one of the following; ['MALE','FEMALE']");
      expect(fields.human.message).to.equal('invalid boolean value');

      // These have a custom error messages configured
      expect(fields.age.message).to.equal('age');
      expect(fields.weight.message).to.equal('weight');
      expect(statusCode).to.equal(400);
    });

    it('parses request parameters', async () => {
      const { statusCode, body } = await parameterControllerGetRequestHandler({
        body: null,
        queryStringParameters: {
          firstname: 'Tony',
          lastname: 'Stark',
          age: 45,
          weight: 82.1,
          human: true,
          gender: 'MALE',
        },
      }, getTestContext());

      const model = JSON.parse(body) as ParameterTestModel;
      expect(model.firstname).to.equal('Tony');
      expect(model.lastname).to.equal('Stark');
      expect(model.age).to.equal(45);
      expect(model.human).to.equal(true);
      expect(model.gender).to.equal('MALE');
      expect(statusCode).to.equal(200);
    });

    it('parse request filed parameters', async () => {
      const data: ParameterTestModel = {
        age: 26,
        firstname: 'Nick',
        lastname: 'Yang',
        gender: Gender.MALE,
        human: true,
        weight: 50,
      };
      const { statusCode, body } = await parameterControllerGetRequestPropHandler({ body: JSON.stringify(data) }, getTestContext());

      const model = JSON.parse(body) as ParameterTestModel;
      expect(model.age).to.equal(26);
      expect(model.firstname).to.equal('Nick');
      expect(model.lastname).to.equal('Yang');
      expect(model.gender).to.equal(Gender.MALE);
      expect(model.weight).to.equal(50);
      expect(model.human).to.equal(true);
      expect(statusCode).to.equal(200);
    });

    it('parses body parameters', async () => {
      const data: ParameterTestModel = {
        age: 45,
        firstname: 'Tony',
        gender: Gender.MALE,
        human: true,
        lastname: 'Stark',
        weight: 82.1,
      };
      const { statusCode, body } = await parameterControllerGetBodyHandler({ body: JSON.stringify(data) }, getTestContext());

      const model = JSON.parse(body) as ParameterTestModel;
      expect(model.firstname).to.equal('Tony');
      expect(model.lastname).to.equal('Stark');
      expect(model.age).to.equal(45);
      expect(model.weight).to.equal(82.1);
      expect(model.human).to.equal(true);
      expect(model.gender).to.equal(Gender.MALE);
      expect(statusCode).to.equal(200);
    });

    it('parses body field parameters', async () => {
      const data: ParameterTestModel = {
        age: 45,
        firstname: 'Tony',
        gender: Gender.MALE,
        human: true,
        lastname: 'Stark',
        weight: 82.1,
      };
      const { statusCode, body } = await parameterControllerGetBodyPropsHandler({ body: JSON.stringify(data) }, getTestContext());

      const model = JSON.parse(body) as ParameterTestModel;
      expect(model.firstname).to.equal('Tony');
      expect(model.lastname).to.equal('Stark');
      expect(model.age).to.equal(45);
      expect(model.weight).to.equal(82.1);
      expect(model.human).to.equal(true);
      expect(model.gender).to.equal(Gender.MALE);
      expect(statusCode).to.equal(200);
    });

    it('invalid body field parameters look good', async () => {
      const data: any = {
        age: 'lkj',
        firstname: 23,
        gender: 'male',
        human: 123,
        lastname: 123,
        weight: 'hello',
      };
      const { statusCode, body } = await parameterControllerGetBodyPropsHandler({ body: JSON.stringify(data) }, getTestContext());

      const { fields } = JSON.parse(body);
      expect(fields['body.firstname'].message).to.equal('invalid string value');
      expect(fields['body.lastname'].message).to.equal('invalid string value');
      expect(fields['body.gender'].message).to.equal("should be one of the following; ['MALE','FEMALE']");
      expect(fields['body.human'].message).to.equal('invalid boolean value');

      // these have custom error messages configured
      expect(fields['body.age'].message).to.equal('age');
      expect(fields['body.weight'].message).to.equal('weight');
      expect(statusCode).to.equal(400);
    });

    it('can get request with generic type', async () => {
      const { statusCode, body } = await getTestControllerGetGenericModelHandler({ body: null }, getTestContext());

      const { result } = JSON.parse(body) as GenericModel<TestModel>;
      expect(result.id).to.equal(1);
      expect(statusCode).to.equal(200);
    });

    it('can get request with generic array', async () => {
      const { statusCode, body } = await getTestControllerGetGenericModelArrayHandler({ body: null }, getTestContext());

      const { result } = JSON.parse(body) as GenericModel<TestModel[]>;
      expect(result[0].id).to.equal(1);
      expect(statusCode).to.equal(200);
    });

    it('can get request with generic primative type', async () => {
      const { statusCode, body } = await getTestControllerGetGenericPrimitiveHandler({ body: null }, getTestContext());

      const model = JSON.parse(body) as GenericModel<string>;
      expect(model.result).to.equal('a string');
      expect(statusCode).to.equal(200);
    });

    it('can get request with generic primative array', async () => {
      const { statusCode, body } = await getTestControllerGetGenericPrimitiveArrayHandler({ body: null }, getTestContext());

      const model = JSON.parse(body) as GenericModel<string[]>;
      expect(model.result[0]).to.equal('string one');
      expect(statusCode).to.equal(200);
    });

    it('can post request with a generic body', async () => {
      const data: GenericRequest<TestModel> = {
        name: 'something',
        value: getFakeModel(),
      };
      const { statusCode, body } = await postControllerGetGenericRequestHandler({
        body: JSON.stringify(data),
      }, getTestContext());

      const model = JSON.parse(body) as TestModel;
      expect(model.id).to.equal(1);
      expect(statusCode).to.equal(200);
    });
  });

  describe('Sub resource', () => {
    it('parses path parameters from the controller description', async () => {
      const mainResourceId = 'main-123';
      const { statusCode, body } = await subResourceTestControllerGetSubResourceHandler({
        body: null,
        pathParameters: {
          mainResourceId,
        },
      }, getTestContext());

      const data = JSON.parse(body);
      expect(data).to.equal(mainResourceId);
      expect(statusCode).to.equal(200);
    });

    it('parses path parameters from the controller description and method description', async () => {
      const mainResourceId = 'main-123';
      const subResourceId = 'sub-456';
      const { statusCode, body } = await subResourceTestControllerGetWithParameterHandler({
        body: null,
        pathParameters: {
          mainResourceId,
          subResourceId,
        },
      }, getTestContext());

      const data = JSON.parse(body);
      expect(data).to.equal(`${mainResourceId}:${subResourceId}`);
      expect(statusCode).to.equal(200);
    });
  });

  describe('[Serverless not support] file upload', () => {
    it('can post a file', () => {
      // const formData = { someFile: '@../package.json' };
      // return verifyFileUploadRequest(basePath + '/PostTest/File', formData, (_err, res) => {
      //   const packageJsonBuffer = readFileSync(resolve(__dirname, '../package.json'));
      //   const returnedBuffer = Buffer.from(res.body.buffer);
      //   expect(res.body).to.not.be.undefined;
      //   expect(res.body.fieldname).to.equal('someFile');
      //   expect(res.body.originalname).to.equal('package.json');
      //   expect(res.body.encoding).to.be.not.undefined;
      //   expect(res.body.mimetype).to.equal('application/json');
      //   expect(Buffer.compare(returnedBuffer, packageJsonBuffer)).to.equal(0);
      // });
    });

    it('can post a file without name', () => {
      // const formData = { aFile: '@../package.json' };
      // return verifyFileUploadRequest(basePath + '/PostTest/FileWithoutName', formData, (_err, res) => {
      //   expect(res.body).to.not.be.undefined;
      //   expect(res.body.fieldname).to.equal('aFile');
      // });
    });

    it('cannot post a file with wrong attribute name', async () => {
      // const formData = { wrongAttributeName: '@../package.json' };
      // verifyFileUploadRequest(basePath + '/PostTest/File', formData, (_err, res) => {
      //   expect(res.status).to.equal(500);
      //   expect(res.text).to.equal('{"message":"Unexpected field","name":"MulterError","status":500}');
      // });
    });

    it('can post multiple files with other form fields', () => {
      // const formData = {
      //   a: 'b',
      //   c: 'd',
      //   someFiles: ['@../package.json', '@../tsconfig.json'],
      // };

      // return verifyFileUploadRequest(basePath + '/PostTest/ManyFilesAndFormFields', formData, (_err, res) => {
      //   for (const file of res.body as File[]) {
      //     const packageJsonBuffer = readFileSync(resolve(__dirname, `../${file.originalname}`));
      //     const returnedBuffer = Buffer.from(file.buffer);
      //     expect(file).to.not.be.undefined;
      //     expect(file.fieldname).to.be.not.undefined;
      //     expect(file.originalname).to.be.not.undefined;
      //     expect(file.encoding).to.be.not.undefined;
      //     expect(file.mimetype).to.equal('application/json');
      //     expect(Buffer.compare(returnedBuffer, packageJsonBuffer)).to.equal(0);
      //   }
      // });
    });

    it('can post multiple files with different field', () => {
      // const formData = {
      //   file_a: '@../package.json',
      //   file_b: '@../tsconfig.json',
      // };
      // return verifyFileUploadRequest(`${basePath}/PostTest/ManyFilesInDifferentFields`, formData, (_err, res) => {
      //   for (const file of res.body as File[]) {
      //     const packageJsonBuffer = readFileSync(resolve(__dirname, `../${file.originalname}`));
      //     const returnedBuffer = Buffer.from(file.buffer);
      //     expect(file).to.not.be.undefined;
      //     expect(file.fieldname).to.be.not.undefined;
      //     expect(file.originalname).to.be.not.undefined;
      //     expect(file.encoding).to.be.not.undefined;
      //     expect(file.mimetype).to.equal('application/json');
      //     expect(Buffer.compare(returnedBuffer, packageJsonBuffer)).to.equal(0);
      //   }
      // });
    });

    it('can post mixed form data content with file', () => {
      // const formData = {
      //   username: 'test',
      //   avatar: '@../tsconfig.json',
      // };
      // return verifyFileUploadRequest(`${basePath}/PostTest/MixedFormDataWithFile`, formData, (_err, res) => {
      //   const file = res.body.avatar;
      //   const packageJsonBuffer = readFileSync(resolve(__dirname, `../${file.originalname}`));
      //   const returnedBuffer = Buffer.from(file.buffer);
      //   expect(res.body.username).to.equal(formData.username);
      //   expect(file).to.not.be.undefined;
      //   expect(file.fieldname).to.be.not.undefined;
      //   expect(file.originalname).to.be.not.undefined;
      //   expect(file.encoding).to.be.not.undefined;
      //   expect(file.mimetype).to.equal('application/json');
      //   expect(Buffer.compare(returnedBuffer, packageJsonBuffer)).to.equal(0);
      // });
    });

    // function verifyFileUploadRequest(
    //   path: string,
    //   formData: any,
    //   verifyResponse: (err: any, res: request.Response) => any = () => {
    //     /**/
    //   },
    //   expectedStatus?: number,
    // ) {
    //   return verifyRequest(
    //     verifyResponse,
    //     request =>
    //       Object.keys(formData).reduce((req, key) => {
    //         const values = [].concat(formData[key]);
    //         values.forEach((v: any) => (v.startsWith('@') ? req.attach(key, resolve(__dirname, v.slice(1))) : req.field(key, v)));
    //         return req;
    //       }, request.post(path)),
    //     expectedStatus,
    //   );
    // }
  });

  function getTestContext() {
    return {};
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
