import * as bodyParser from 'body-parser';
import * as express from 'express';
import * as methodOverride from 'method-override';
import * as multer from 'multer';
import '../controllers/deleteController';
import '../controllers/getController';
import '../controllers/patchController';
import '../controllers/postController';
import '../controllers/putController';

import '../controllers/methodController';
import '../controllers/parameterController';
import '../controllers/securityController';
import '../controllers/testController';
import '../controllers/validateController';

import '../../functional/upload.controller';

import { RegisterRoutes } from './routes';

const storage = multer.memoryStorage();
const upload = multer({ storage });
export const expressApp: express.Express = express();
expressApp.use(bodyParser.urlencoded({ extended: true }));
expressApp.use(bodyParser.json());
expressApp.use(methodOverride());
expressApp.use((req: any, res: any, next: any) => {
  req.stringValue = 'fancyStringForContext';
  next();
});
expressApp.use('/v1/UploadController/File', upload.single('avater'));

RegisterRoutes(expressApp);

// It's important that this come after the main routes are registered
expressApp.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const status = err.status || 500;
  const body: any = {
    fields: err.fields || undefined,
    message: err.message || 'An error occurred during the request.',
    name: err.name,
    status,
  };
  res.status(status).json(body);
});

expressApp.listen(3000);
