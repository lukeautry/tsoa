import * as hapi from 'hapi';
import '../controllers/rootController';

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

import { RegisterRoutes } from './routes';

export const server = new hapi.Server();
server.connection({ port: 3003 });

RegisterRoutes(server);

server.start((err) => {
  if (err) { throw err; }
});
