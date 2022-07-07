import bodyParser from 'body-parser';
import express from 'express';
import methodOverride from 'method-override';

import './managedController';
import { RegisterRoutes } from './routes';

export const app: express.Express = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride());
RegisterRoutes(app);

// It's important that this come after the main routes are registered
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(err.status || 500).send(err.message || 'An error occurred during the request.');
});

app.listen();
