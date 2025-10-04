import { expect } from 'chai';
import 'mocha';
import 'reflect-metadata';
import { app } from '../fixtures/inversify-async/server';
import { TestModel } from '../fixtures/testModel';
import { verifyGetRequest } from './utils';

const basePath = '/v1';

describe('Inversify async IoC Express Server', () => {
  it('can handle get request with no path argument', () => {
    return verifyGetRequest(app, basePath + '/AsyncIocTest?tsoa=abc123456', (err, res) => {
      const model = res.body as TestModel;
      expect(model.id).to.equal(1);
    });
  });

  it('can handle errors in DI', () => {
    return verifyGetRequest(
      app,
      basePath + '/AsyncIocErrorTest',
      err => {
        expect(err.text).to.equal('DI Error');
      },
      500,
    );
  });
});
