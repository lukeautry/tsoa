/// <reference path="../../typings/index.d.ts" />

import * as request from 'supertest';
import * as express from 'express';
import {Server} from '../fixtures/server';

describe('Server', () => {
    let server: express.Express = null;

    beforeEach(() => {
        server = Server();
    });

    afterEach(() => {
        server.close();
    });

    it('responds to /GetTest', done => {
        request(server)
            .get('/GetTest')
            .expect(200, done);
    });
});
