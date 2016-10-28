import * as methodOverride from 'method-override';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import './controllers/putController';
import './controllers/postController';
import './controllers/patchController';
import './controllers/getController';
import './controllers/deleteController';
import './controllers/jwtEnabledController';
import { jwt, Options } from './express-jwt-mock';
import { RegisterRoutes } from './routes';

export const app: express.Express = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride());
app.use('/v1/JwtGetTest', jwt(<Options>{ userProperty: 'user_jwt_data' }));
RegisterRoutes(app);

// It's important that this come after the main routes are registered
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.status(err.status || 500).send(err.message || 'An error occurred during the request.');
});

app.listen(3000);
