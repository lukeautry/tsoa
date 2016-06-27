/// <reference path="../../typings/index.d.ts" />
import {app} from '../fixtures/server';
import * as chai from 'chai';
import * as request from 'supertest';

describe('Server', () => {
    it('responds to /GetTest', done => {
        request(app)
            .get('/GetTest')
            .expect(200)
            .end((err, res) => {
                chai.expect(res.body.id).to.equal(1);
                done();
            });
    });
});
