import * as bodyParser from 'body-parser';
import * as express from 'express';
import * as methodOverride from 'method-override';

import './managedController';
import { RegisterRoutes } from './routes';

export const app: express.Express = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use((req, res, next) => {
  methodOverride()(req, res, next);
});
(RegisterRoutes as (app: express.Express) => void)(app);

// It's important that this come after the main routes are registered
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(err.status || 500).send(err.message || 'An error occurred during the request.');
});

app.listen();
