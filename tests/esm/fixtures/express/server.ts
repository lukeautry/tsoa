import express, { RequestHandler } from 'express';
import methodOverride from 'method-override';
import bodyParser from 'body-parser';

import './rootController.js';
import '../controllers/securityController';

import { RegisterRoutes } from './routes.js';

export const app: express.Express = express();
app.use(bodyParser.urlencoded({ extended: true }) as RequestHandler);
app.use(bodyParser.json() as RequestHandler);
app.use((req, res, next) => {
  methodOverride()(req, res, next);
});
app.use((req: any, res: any, next: express.NextFunction) => {
  req.stringValue = 'fancyStringForContext';
  next();
});
if (RegisterRoutes) RegisterRoutes(app);

// It's important that this come after the main routes are registered
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const status = err.status || 500;
  const body: any = {
    fields: err.fields || undefined,
    message: err.message || 'An error occurred during the request.',
    name: err.name,
    status,
  };
  res.status(status).json(body);
});

app.listen();
