import Fastify from 'fastify';
import '../controllers/rootController';

import '../controllers/optionsController';
import '../controllers/deleteController';
import '../controllers/getController';
import '../controllers/headController';
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

import '../controllers/middlewaresFastifyController';

import { RegisterRoutes } from './routes';

export const app = Fastify();
app.setNotFoundHandler((request, reply) => reply.code(404).send('Not Found'));
app.setErrorHandler((error: any, request, reply) => {
  reply.code(error.status || error.statusCode || 500).send(error.fields ? JSON.stringify({ fields: error.fields }) : error.message || 'An error occurred during the request.');
});
app.addHook('preHandler', async (request, reply) => {
  const query = request.query as Record<string, string>;
  if (query.earlierStatus) reply.code(Number(query.earlierStatus));
});
app.register(RegisterRoutes);
export const server = app.server;
