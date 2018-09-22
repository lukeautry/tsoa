import * as bodyParser from 'body-parser';
import * as express from 'express';
import * as methodOverride from 'method-override';
import '../controllers/deleteController';
import '../controllers/getController';
import '../controllers/headController';
import '../controllers/patchController';
import '../controllers/postController';
import '../controllers/putController';

import '../controllers/methodController';
import '../controllers/parameterController';
import '../controllers/securityController';

import { RegisterRoutes } from './routes';

export const app: express.Express = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride());
app.use((req: any, res: any, next: any) => {
  req.stringValue = 'fancyStringForContext';
  next();
});
RegisterRoutes(app);

// It's important that this come after the main routes are registered
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.status(err.status || 500).send(err.message || 'An error occurred during the request.');
});

app.listen(3000);
