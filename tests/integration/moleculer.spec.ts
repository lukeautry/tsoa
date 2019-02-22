import { expect } from 'chai';
import {ServiceBroker} from 'moleculer';

import * as request from 'supertest';
import {TestModel} from '../fixtures/testModel';

describe('Moleculer', () => {
  describe('Test auth', () => {
    const VALID_TOKEN = '123';
    const broker = new ServiceBroker();
    const api = require('../fixtures/moleculer/api.service');
    const get = require('../fixtures/moleculer/get.service');
    broker.createService(get);
    const apiService = broker.createService(api);

    before(() => {
      return broker.start();
    });

    after(() => {
      return broker.stop();
    });

    it('should pass auth', async () => {
      return request(apiService.server).get('/getTest/getModel/5')
        .set('Authorization', VALID_TOKEN)
        .expect(200)
        .expect((res: any) => {
          const model = res.body as TestModel;
          expect(model.id).to.equal(1);
        });

    });
    // it('should not pass auth', async (done) => {
    //   request(apiService.server).get('/v3/test').set('Authorization', '234')
    //     .expect(401, done);
    // });
    // it('should not pass auth wihtout token', async (done) => {
    //   request(apiService.server).get('/v3/test')
    //     .expect(401, done);
    // });
    // it('should pass health check', async (done) => {
    //   request(apiService.server).get('/health').expect(200, done);
    // });
  });
});
