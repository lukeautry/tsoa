import { expect } from 'chai';
import 'mocha';
import { App } from 'supertest/types';
import { getFakeModel } from './fake-models';
import { verifyGetRequest, verifyPostRequest } from '../utils';

export function registerRequestRejectionTests(app: App, basePath: string) {
  it('should reject invalid strings', () => {
    const invalidValues = [null, 1, undefined, {}];

    return Promise.all(
      invalidValues.map((value: any) => {
        const data = getFakeModel();
        data.stringValue = value;

        return verifyPostRequest(app, basePath + '/PostTest', data, (_err: any, _res: any) => null, 400);
      }),
    );
  });

  it('should parse valid date', () => {
    const data = getFakeModel();
    data.dateValue = '2016-01-01T00:00:00Z' as any;

    return verifyPostRequest(
      app,
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
      app,
      basePath + '/GetTest/DateParam?date=2016-01-01T00:00:00Z',
      (_err: any, res: any) => {
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

        return verifyPostRequest(app, basePath + '/PostTest', data, (_err: any, _res: any) => null, 400);
      }),
    );
  });

  it('should reject invalid numbers', () => {
    const invalidValues = ['test', null, undefined, {}];

    return Promise.all(
      invalidValues.map((value: any) => {
        const data = getFakeModel();
        data.numberValue = value;

        return verifyPostRequest(app, basePath + '/PostTest', data, (_err: any, _res: any) => null, 400);
      }),
    );
  });

  it('returns error if missing required path parameter', () => {
    return verifyGetRequest(
      app,
      basePath + `/GetTest/${1}/true?booleanParam=true&stringParam=test1234`,
      (err: any, _res: any) => {
        expect(err.text).to.equal('Not Found');
      },
      404,
    );
  });

  it('should reject invalid additionalProperties', () => {
    const invalidValues = ['invalid', null, [], 1, { foo: null }, { foo: 1 }, { foo: [] }, { foo: {} }, { foo: { foo: 'bar' } }];

    return Promise.all(
      invalidValues.map((value: any) => {
        return verifyPostRequest(app, basePath + '/PostTest/Object', { obj: value }, (_err: any, _res: any) => null, 400);
      }),
    );
  });

  it('returns error if invalid request', () => {
    const data = getFakeModel();
    data.dateValue = 1 as any;

    return verifyPostRequest(
      app,
      basePath + '/PostTest',
      data,
      (err: any, _res: any) => {
        const body = JSON.parse(err.text);
        expect(body.fields['model.dateValue'].message).to.equal('invalid ISO 8601 datetime format, i.e. YYYY-MM-DDTHH:mm:ss');
        expect(body.fields['model.dateValue'].value).to.be.undefined;
      },
      400,
    );
  });

  it('returns error if thrown in controller', () => {
    return verifyGetRequest(
      app,
      basePath + '/GetTest/ThrowsError',
      (err: any, _res: any) => {
        expect(err.text).to.equal('error thrown');
      },
      400,
    );
  });
}
