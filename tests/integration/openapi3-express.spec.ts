import { expect } from 'chai';
import 'mocha';
import * as request from 'supertest';
import { app } from '../fixtures/express-openapi3/server';
import { ValidateModel } from '../fixtures/testModel';

const basePath = '/v1';

describe('OpenAPI3 Express Server', () => {
  it('should valid model validate', () => {
    const bodyModel = new ValidateModel();
    bodyModel.floatValue = 1.20;
    bodyModel.doubleValue = 1.20;
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
    bodyModel.model = { value1: 'abcdef'};
    bodyModel.mixedUnion = { value1: '' };

    return verifyPostRequest(basePath + `/Validate/body`, bodyModel, (err, res) => {
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
    }, 200);
  });

  it('should invalid model validate', () => {
      const bodyModel = new ValidateModel();
      bodyModel.floatValue = '120a' as any;
      bodyModel.doubleValue = '120a' as any;
      bodyModel.intValue = 1.20;
      bodyModel.longValue = 1.20;
      bodyModel.booleanValue = 'abc' as any;
      bodyModel.dateValue = 'abc' as any;
      bodyModel.datetimeValue = 'abc' as any;

      bodyModel.numberMax10 = 20;
      bodyModel.numberMin5 = 0;
      bodyModel.stringMax10Lenght = 'abcdefghijk';
      bodyModel.stringMin5Lenght = 'abcd';
      bodyModel.stringPatternAZaz = 'ab01234';

      bodyModel.arrayMax5Item = [0, 1, 2, 3, 4, 6, 7, 8, 9];
      bodyModel.arrayMin2Item = [0];
      bodyModel.arrayUniqueItem = [0, 0, 1, 1];
      bodyModel.intersection = { value1: '' } as any;
      bodyModel.intersectionNoAdditional = { value1: '', value2: '', value3: 123, value4: 123 } as any;
      bodyModel.model = 1 as any;
      bodyModel.mixedUnion = 123 as any;

      return verifyPostRequest(basePath + `/Validate/body`, bodyModel, (err, res) => {
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
        expect(body.fields['body.stringPatternAZaz'].message).to.equal('Not match in \'^[a-zA-Z]+$\'');
        expect(body.fields['body.stringPatternAZaz'].value).to.equal(bodyModel.stringPatternAZaz);

        expect(body.fields['body.arrayMax5Item'].message).to.equal('maxItems 5');
        expect(body.fields['body.arrayMax5Item'].value).to.deep.equal(bodyModel.arrayMax5Item);
        expect(body.fields['body.arrayMin2Item'].message).to.equal('minItems 2');
        expect(body.fields['body.arrayMin2Item'].value).to.deep.equal(bodyModel.arrayMin2Item);
        expect(body.fields['body.arrayUniqueItem'].message).to.equal('required unique array');
        expect(body.fields['body.arrayUniqueItem'].value).to.deep.equal(bodyModel.arrayUniqueItem);
        expect(body.fields['body.intersection'].message).to.deep.equal('Could not match the intersection against every type. Issues: [{"body.value2":{"message":"\'value2\' is required"}}]');
        expect(body.fields['body.intersection'].value).to.deep.equal(bodyModel.intersection);
        expect(body.fields['body.intersectionNoAdditional'].message).to.deep.equal('The following properties are not allowed by any part of the intersection: value3,value4');
        expect(body.fields['body.intersectionNoAdditional'].value).to.deep.equal(bodyModel.intersectionNoAdditional);
        expect(body.fields['body.mixedUnion'].message).to.equal('Could not match the union against any of the items. ' +
          'Issues: [{"body.mixedUnion":{"message":"invalid string value","value":123}},' +
          '{"body.mixedUnion":{"message":"invalid object","value":123}}]',
        );
      }, 400);
    });

  function verifyPostRequest(path: string, data: any, verifyResponse: (err: any, res: request.Response) => any, expectedStatus?: number) {
    return verifyRequest(verifyResponse, (request) => request.post(path).send(data), expectedStatus);
  }

  function verifyRequest(
    verifyResponse: (err: any, res: request.Response) => any,
    methodOperation: (request: request.SuperTest<any>) => request.Test,
    expectedStatus = 200,
  ) {
    return new Promise((resolve, reject) => {
      methodOperation(request(app))
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
              response: parsedError,
            });
            return;
          }

          verifyResponse(parsedError, res);
          resolve();
        });
    });
  }
});
