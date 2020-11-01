import * as bodyParser from 'body-parser';
import * as express from 'express';
import * as methodOverride from 'method-override';
import '../controllers/rootController';

import { RegisterRoutes } from './routes';

export const app: express.Express = express();
export const router = express.Router();
app.use('/v1', router);
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());
router.use(methodOverride());
router.use((req: any, res: any, next: any) => {
  req.stringValue = 'fancyStringForContext';
  next();
});
RegisterRoutes(router);

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
