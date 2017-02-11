import * as hapi from 'hapi';
import '../controllers/putController';
import '../controllers/postController';
import '../controllers/patchController';
import '../controllers/getController';
import '../controllers/deleteController';
import '../controllers/jwtEnabledController';
import '../controllers/securityController';

import { RegisterRoutes } from './routes';

export const server = new hapi.Server();
server.connection({ port: 3003 });

RegisterRoutes(server);

server.start((err) => {
  if (err) { throw err; }
});
