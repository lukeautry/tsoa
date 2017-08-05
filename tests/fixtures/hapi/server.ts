import * as hapi from 'hapi';
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

export const hapiApp = new hapi.Server();
hapiApp.connection({ port: 3003 });

RegisterRoutes(hapiApp);

hapiApp.start((err) => {
  if (err) { throw err; }
});
