import * as methodOverride from 'method-override';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import './controllers/putController';
import './controllers/postController';
import './controllers/patchController';
import './controllers/getController';
import './controllers/deleteController';
import {RegisterRoutes} from './routes';

export const app: express.Express = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride());

RegisterRoutes(app);

app.listen(3000);
