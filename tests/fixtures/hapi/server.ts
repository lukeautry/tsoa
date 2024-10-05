import { Server, ServerApplicationState } from '@hapi/hapi';
import '../controllers/rootController';

import '../controllers/optionsController';
import '../controllers/deleteController';
import '../controllers/getController';
import '../controllers/patchController';
import '../controllers/postController';
import '../controllers/putController';

import '../controllers/methodController';
import '../controllers/mediaTypeController';
import '../controllers/parameterController';
import '../controllers/securityController';
import '../controllers/testController';
import '../controllers/validateController';
import '../controllers/noExtendsController';
import '../controllers/subresourceController';

import '../controllers/middlewaresHapiController';

import { RegisterRoutes } from './routes';

export const server = new Server({});

(RegisterRoutes as (app: Server<ServerApplicationState>) => void)(server);

server.start().catch(err => {
  if (err) {
    throw err;
  }
});
