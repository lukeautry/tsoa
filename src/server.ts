/// <reference path="../typings/index.d.ts" />

import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as methodOverride from 'method-override';
import {RegisterControllers} from './controllers/index';

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride());

RegisterControllers(app);

app.get("/test", (req, res) => {
    res.write(JSON.stringify({
        key: 'value',
        anotherKey: 'anothervalue'
    }));
    res.end();
});

app.listen(3000, () => {
    console.log("Express server listening on port %d in %s mode", 3000, app.settings.env);
});