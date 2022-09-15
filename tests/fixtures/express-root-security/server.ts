import * as bodyParser from 'body-parser';
import * as express from 'express';
import '../controllers/noSecurityOnController';
import '../controllers/pathlessGetController';

import { RegisterRoutes } from './routes';

export const app: express.Express = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
RegisterRoutes(app);

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
