import { expect } from 'chai';
import 'mocha';
import * as request from 'supertest';
import { MetadataGenerator } from './../../src/metadataGeneration/metadataGenerator';
import { Tsoa } from './../../src/metadataGeneration/tsoa';
import { SpecGenerator } from './../../src/swagger/specGenerator';
import { expressApp } from './../fixtures/express/server';
import { hapiApp } from './../fixtures/hapi/server';
import { koaApp } from './../fixtures/koa/server';

const entry = 'tests/functional/upload.controller.ts';

describe('Upload', () => {
    let metadata: Tsoa.Metadata;
    before(() => {
        metadata = new MetadataGenerator(entry).Generate();
    });

    it('metadata generator', () => {
        const method = metadata.controllers[0].methods[0];
        expect(method.consumers).to.deep.equal(['multipart/form-data']);

        const parameter = method.parameters[0];
        expect(parameter.in).to.equal('formData');
        expect(parameter.name).to.equal('avater');
        expect(parameter.parameterName).to.equal('avaterData');
        expect(parameter.type.dataType).to.equal('file');
    });

    it('swagger generator', () => {
        const generator = new SpecGenerator(metadata, {} as any);
        const spce = generator.GetSpec();

        const operation = spce.paths['/UploadController/File'].post!;
        expect(operation.consumes).to.deep.equal(['multipart/form-data']);

        const parameter = (operation.parameters!)[0];
        expect(parameter.in).to.equal('formData');
        expect(parameter.name).to.equal('avater');
        expect(parameter.type).to.equal('file');
    });

    it('express app', (done) => {
        request(expressApp)
            .post('/v1/UploadController/File')
            .attach('avater', 'tests/functional/upload.jpeg')
            .expect(204)
            .end((err, res) => {
                done(err);
            });
    });

    it('hapi app', (done) => {
        request(hapiApp.listener)
            .post('/v1/UploadController/File')
            .attach('avater', 'tests/functional/upload.jpeg')
            .expect(204)
            .end((err, res) => {
                done(err);
            });
    });

    it('koa app', (done) => {
        request(koaApp)
            .post('/v1/UploadController/File')
            .attach('avater', 'tests/functional/upload.jpeg')
            .expect(204)
            .end((err, res) => {
                done(err);
            });
    });

    it('shutdown koa server', () => koaApp.close());
});
