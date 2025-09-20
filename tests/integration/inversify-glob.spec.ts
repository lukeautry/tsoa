import { expect } from 'chai';
import 'mocha';
import { app } from '../fixtures/inversify-cpg/server';
import { TestModel } from '../fixtures/testModel';
import { verifyGetRequest } from './utils';

const basePath = '/v1';

describe('Inversify Express Server with ControllerPathGlob', () => {
  it('can handle get request with no path argument', () => {
    return verifyGetRequest(app, basePath + '/ManagedTest?tsoa=abc123456', (_err, res) => {
      const model = res.body as TestModel;
      expect(model.id).to.equal(1);
    });
  });

  it('handles request with managed controller using managed service', () => {
    return verifyGetRequest(app, basePath + '/ManagedTest?tsoa=abc123456', (_err, res) => {
      const model = res.body as TestModel;
      // expect controller to use the same service
      expect(model.id).to.equal(1);
    });
  });

  it('can handle error', async () => {
    return verifyGetRequest(
      app,
      basePath + '/ManagedTest/ThrowsError?tsoa=abc123456',
      (_err, res) => {
        expect(res.text).to.equal('error thrown');
      },
      500,
    );
  });
});
