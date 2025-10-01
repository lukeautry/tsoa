import { expect } from 'chai';
import 'mocha';
import { app } from '../fixtures/express-router/server';
import { TestModel } from '../fixtures/testModel';
import { verifyGetRequest } from './utils';

const basePath = '/v1';

describe('Express Router Server', () => {
  it('can handle get request to root controller`s path', () => {
    return verifyGetRequest(app, basePath + '/', (err, res) => {
      const model = res.body as TestModel;
      expect(model.id).to.equal(1);
    });
  });

  it('can handle get request to root controller`s method path', () => {
    return verifyGetRequest(app, basePath + '/rootControllerMethodWithPath', (err, res) => {
      const model = res.body as TestModel;
      expect(model.id).to.equal(1);
    });
  });
});
