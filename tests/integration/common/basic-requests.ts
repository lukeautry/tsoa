import { expect } from 'chai';
import 'mocha';
import { App } from 'supertest/types';
import { TestClassModel, TestModel } from '../../fixtures/testModel';
import { getFakeClassModel, getFakeModel } from './fake-models';
import { verifyRequest, verifyGetRequest, verifyPostRequest } from '../utils';

export function registerBasicRequestTests(app: App, basePath: string) {
  it('can handle get request to root controller`s path', () => {
    return verifyGetRequest(app, basePath, (_err, res) => {
      const model = res.body as TestModel;
      expect(model.id).to.equal(1);
    });
  });

  it('can handle get request to root controller`s method path', () => {
    return verifyGetRequest(app, basePath + '/rootControllerMethodWithPath', (err, res) => {
      expect(err).to.equal(false);
      const model = res.body as TestModel;
      expect(model.id).to.equal(1);
    });
  });

  it('can handle get request with no path argument', () => {
    return verifyGetRequest(app, basePath + '/GetTest', (_err, res) => {
      const model = res.body as TestModel;
      expect(model.id).to.equal(1);
    });
  });

  it('can handle get request with path argument', () => {
    return verifyGetRequest(app, basePath + '/GetTest/Current', (_err, res) => {
      const model = res.body as TestModel;
      expect(model.id).to.equal(1);
    });
  });

  it('respects toJSON for class serialization', () => {
    return verifyGetRequest(app, basePath + '/GetTest/SimpleClassWithToJSON', (_err, res) => {
      const getterClass = res.body;
      expect(getterClass).to.haveOwnProperty('a');
      expect(getterClass.a).to.equal('hello, world');
      expect(getterClass).to.not.haveOwnProperty('b');
    });
  });

  it('can handle get request with collection return value', () => {
    return verifyGetRequest(app, basePath + '/GetTest/Multi', (_err, res) => {
      const models = res.body as TestModel[];
      expect(models.length).to.equal(3);
      models.forEach(m => {
        expect(m.id).to.equal(1);
      });
    });
  });

  it('can handle get request with path and query parameters', () => {
    return verifyGetRequest(app, basePath + `/GetTest/${1}/true/test?booleanParam=true&stringParam=test1234&numberParam=1234`, (_err, res) => {
      const model = res.body as TestModel;
      expect(model.id).to.equal(1);
    });
  });

  it('returns error if missing required query parameter', () => {
    return verifyGetRequest(
      app,
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
      app,
      basePath + `/GetTest/${1}/true/test?booleanParam=true&numberParam=1234`,
      (err: any, _res: any) => {
        const body = JSON.parse(err.text);
        expect(body.fields.stringParam.message).to.equal(`Custom error message`);
      },
      400,
    );
  });

  it('parsed body parameters', () => {
    const data = getFakeModel();

    return verifyPostRequest(app, basePath + '/PostTest', data, (_err: any, res: any) => {
      const model = res.body as TestModel;
      expect(model).to.deep.equal(data);
    });
  });

  it('correctly returns status code', () => {
    const data = getFakeModel();
    const path = basePath + '/PostTest/WithDifferentReturnCode';
    return verifyPostRequest(
      app,
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

    return verifyPostRequest(app, basePath + '/PostTest/WithClassModel', data, (_err: any, res: any) => {
      const model = res.body as TestClassModel;
      expect(model.id).to.equal(700);
    });
  });

  it('correctly handles OPTIONS requests', () => {
    const path = basePath + '/OptionsTest/Current';
    return verifyRequest(
      app,
      (_err, res) => {
        expect(res.text).to.equal('');
      },
      request => request.options(path),
      204,
    );
  });
}
