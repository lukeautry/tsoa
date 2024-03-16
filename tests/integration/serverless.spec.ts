import { expect } from 'chai';
import { base64image } from '../fixtures/base64image';

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

import { TestModel } from 'fixtures/testModel';

describe('Serverless', () => {
  describe('RootController', () => {
    it('can handle get request to root controller`s path', async () => {
      const { statusCode, body } = await rootHandler({ body: null }, {});
      const model = JSON.parse(body) as TestModel;
      // expect(statusCode).to.equal(200);
      expect(model.id).to.equal(1);
    });

    it('can handle get request to root controller`s method path', async () => {
      const { statusCode, body } = await rootControllerMethodWithPathHandler({ body: null }, {});
      const model = JSON.parse(body) as TestModel;

      expect(model.id).to.equal(1);
    });
  });

  describe('GetTestController', () => {
    it('can handle get request with no path argument', async () => {
      const { statusCode, body } = await getTestGetModelHandler({ body: null }, {});
      const model = JSON.parse(body) as TestModel;

      expect(model.id).to.equal(1);
    });

    it('can handle get request with path argument', async () => {
      const { statusCode, body } = await getTestGetCurrentModelHandler({ body: null }, {});
      const model = JSON.parse(body) as TestModel;

      expect(model.id).to.equal(1);
    });

    it('respects toJSON for class serialization', async () => {
      const { statusCode, body } = await getTestSimpleClassWithJsonHandler({ body: null }, {});
      const getterClass = JSON.parse(body);

      expect(getterClass).to.haveOwnProperty('a');
      expect(getterClass.a).to.equal('hello, world');
      expect(getterClass).to.not.haveOwnProperty('b');
    });

    it.skip('[Serverless not support] cannot handle get request with collection return value', async () => {
      const { statusCode, body } = await getTestMultiResHandler({ body: null }, {});
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
        }, {});
        const model = JSON.parse(body) as TestModel;
        expect(model.id).to.equal(1);
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
        }, {});

        const model = JSON.parse(body) as TestModel;
        expect(model.numberValue).to.equal(numberValue);
        expect(model.boolValue).to.equal(boolValue);
        expect(model.stringValue).to.equal(stringValue);
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
        }, {});
        const model = JSON.parse(body) as TestModel;
        expect(model.optionalString).to.equal(optionalStringValue);
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
        }, {});
        const { fields } = JSON.parse(body);

        expect(statusCode).to.equal(400);
        expect(fields.numberParam.message).to.equal(`'numberParam' is required`);
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
        }, {});
        const {fields } = JSON.parse(body);

        expect(statusCode).to.equal(400);
        expect(fields.stringParam.message).to.equal(`Custom error message`);
      });
    });

    it.skip('[Serverless not support] injects express request in parameters', async () => {
      const { statusCode, body } = await getTestRequestHandler({ body: null }, {});
      const model = JSON.parse(body) as TestModel;
      expect(model.id).to.equal(1);
      expect(model.stringValue).to.equal('fancyStringForContext');
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
      }, {});

      const queryParams = JSON.parse(body) as TestModel;
      expect(queryParams.numberValue).to.equal(numberValue);
      expect(queryParams.boolValue).to.equal(boolValue);
      expect(queryParams.stringValue).to.equal(stringValue);
      expect(queryParams.optionalString).to.be.undefined;
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
      }, {});

      const queryParams = JSON.parse(body) as TestModel;

      expect(queryParams.anyType.foo).to.equal(object.foo);
      expect(queryParams.anyType.bar).to.equal(object.bar);
      expect(queryParams.anyType.baz).to.equal(object.baz);
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
        }, {});

        const queryParams = JSON.parse(body) as TestModel;

        expect(queryParams.anyType.foo).to.equal(Number(object.foo));
        expect(queryParams.anyType.bar).to.equal(object.bar);
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
        }, {});
        const { fields } = JSON.parse(body);

        expect(statusCode).to.equal(400);
        expect(fields['queryParams.baz'].message).to.equal('invalid float number');
      });
    });

    describe.skip('[Serverless not support] @Res', () => {
      it('Should return on @Res', async () => {
        // const { statusCode, body } = await getTestGetRes({ body: null }, {});
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
          }, {});

          // const model = res.body as TestModel;
          // expect(model.id).to.equal(1);
          // expect(res.get('custom-header')).to.eq('hello');
        }),
      );

      it('Should not modify the response after headers sent', async () => {
        const { statusCode, body } = await getTestMultipleStatusCodeRes({ body: null }, {});

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
      }, {});

      const bufferData = Buffer.from(JSON.parse(body));
      expect(bufferData.toLocaleString()).to.equal('testbuffer');
    });

    it.skip('[Serverless not support yet] returns streamed responses', async () => {
      const { statusCode, body } = await getTestGetStream({ body: null }, {});

      // expect(body).to.equal('testbuffer');
    });
  });
});
