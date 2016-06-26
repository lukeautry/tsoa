/// <reference path="../../../typings/index.d.ts" />
import {RegisterExpressRoutes} from '../../../src/adapters/express';
import {GetTestController} from '../fixtures/getController';
import {PostTestController} from '../fixtures/postController';
import {PatchTestController} from '../fixtures/patchController';
import {DeleteTestController} from '../fixtures/deleteController';
import {PutTestController} from '../fixtures/putController';
import * as chai from 'chai';
import * as express from 'express';

const expect = chai.expect;

describe('Express Adapter', () => {
    let express: express.Express = null;
    let routeData: RouteData[] = null;

    beforeEach(() => {
        express = getMockedExpress();
        routeData = new Array<RouteData>();
        RegisterExpressRoutes(express, [GetTestController, PostTestController, PatchTestController, DeleteTestController, PutTestController]);
    });

    describe('GET', () => {
        it('should add route with no arguments', () => {
            expect(routeData.some(d => d.method === 'get' && d.path === '/GetTest/')).to.be.true;
        });

        it('should add route with path', () => {
            expect(routeData.some(d => d.method === 'get' && d.path === '/GetTest/Current')).to.be.true;
        });

        it('should add route with path parameters', () => {
            expect(routeData.some(d => d.method === 'get' && d.path === '/GetTest/:numberPathParam/:booleanPathParam/:stringPathParam')).to.be.true;
        });
    });

    describe('POST', () => {
        it('should add route with no arguments', () => {
            expect(routeData.some(d => d.method === 'post' && d.path === '/PostTest/')).to.be.true;
        });

        it('should add route with path', () => {
            expect(routeData.some(d => d.method === 'post' && d.path === '/PostTest/Location')).to.be.true;
        });

        it('should add route with path parameter', () => {
            expect(routeData.some(d => d.method === 'post' && d.path === '/PostTest/WithId/:id')).to.be.true;
        });
    });

    describe('PATCH', () => {
        it('should add route with no arguments', () => {
            expect(routeData.some(d => d.method === 'patch' && d.path === '/PatchTest/')).to.be.true;
        });

        it('should add route with path', () => {
            expect(routeData.some(d => d.method === 'patch' && d.path === '/PatchTest/Location')).to.be.true;
        });

        it('should add route with path parameter', () => {
            expect(routeData.some(d => d.method === 'patch' && d.path === '/PatchTest/WithId/:id')).to.be.true;
        });
    });

    describe('PUT', () => {
        it('should add route with no arguments', () => {
            expect(routeData.some(d => d.method === 'put' && d.path === '/PutTest/')).to.be.true;
        });

        it('should add route with path', () => {
            expect(routeData.some(d => d.method === 'put' && d.path === '/PutTest/Location')).to.be.true;
        });

        it('should add route with path parameter', () => {
            expect(routeData.some(d => d.method === 'put' && d.path === '/PutTest/WithId/:id')).to.be.true;
        });
    });

    describe('DELETE', () => {
        it('should add route with no arguments', () => {
            expect(routeData.some(d => d.method === 'delete' && d.path === '/DeleteTest/')).to.be.true;
        });

        it('should add route with path', () => {
            expect(routeData.some(d => d.method === 'delete' && d.path === '/DeleteTest/Current')).to.be.true;
        });

        it('should add route with path parameters', () => {
            expect(routeData.some(d => d.method === 'delete' && d.path === '/DeleteTest/:numberPathParam/:booleanPathParam/:stringPathParam')).to.be.true;
        });
    });

    function getMockedExpress() {
        return {
            delete: defaultHandler('delete'),
            get: defaultHandler('get'),
            patch: defaultHandler('patch'),
            post: defaultHandler('post'),
            put: defaultHandler('put')
        } as any;
    }

    function defaultHandler(method: string) {
        return (path: string, handler: (request: any, response: any) => void) => {
            routeData.push({
                method: method,
                path: path
            });
        };
    }
});

interface RouteData {
    path: string;
    method: string;
}
