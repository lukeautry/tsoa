/// <reference path="../../typings/index.d.ts" />
import * as methodOverride from 'method-override';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import {RegisterExpressRoutes} from '../../src/adapters/express';
import {PutTestController} from './controllers/putController';
import {PostTestController} from './controllers/postController';
import {PatchTestController} from './controllers/patchController';
import {GetTestController} from './controllers/getController';
import {DeleteTestController} from './controllers/deleteController';

export function Server() {
    const app = express();
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    app.use(methodOverride());

    RegisterExpressRoutes(app, [
        GetTestController,
        PostTestController,
        PatchTestController,
        DeleteTestController,
        PutTestController
    ]);

    app.listen(3000);
    return app;
}
