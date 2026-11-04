import { expect } from 'chai';
import 'mocha';
import 'reflect-metadata';
import { app } from '../fixtures/inversify-dynamic-container/server';
import { verifyGetRequest } from './utils';

const basePath = '/v1';

describe('Inversify Express Server Dynamic Container', () => {
  it('can handle get request with no path argument', () => {
    return verifyGetRequest(app, basePath + '/ManagedTest?tsoa=abc123456', (err, res) => {
      expect(res.type).to.equal('application/json');
      expect(res.body).to.equal(basePath + '/ManagedTest');
    });
  });
});
