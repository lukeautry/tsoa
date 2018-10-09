import { Server } from 'hapi';
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

export const server = new Server({
  port: 3003,
 });

RegisterRoutes(server);

server.start()
  .catch(err => {
    if (err) { throw err; }
  });
