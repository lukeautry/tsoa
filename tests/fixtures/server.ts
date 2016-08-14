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

// It's important that this come after the main routes are registered
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.status(err.status || 500).send(err.message || 'An error occurred during the request.');
});

app.listen(3000);
