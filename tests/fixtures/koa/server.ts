import * as Koa from 'koa';
import * as KoaRouter from 'koa-router';
import '../controllers/putController';
import '../controllers/postController';
import '../controllers/patchController';
import '../controllers/getController';
import '../controllers/deleteController';

import '../controllers/methodController';
import '../controllers/parameterController';
import '../controllers/securityController';
import '../controllers/validateController';

import { RegisterRoutes } from './routes';
import * as bodyParser from 'koa-bodyparser';

const app = new Koa();
app.use(bodyParser());

const router = new KoaRouter();

RegisterRoutes(router);

// It's important that this come after the main routes are registered
app.use(async (context, next) => {
  try {
    await next();
  } catch (err) {
    context.status = err.status || 500;
    context.body = err.message || 'An error occurred during the request.';
  }
});

app
  .use(router.routes())
  .use(router.allowedMethods());

export const server = app.listen(3002);
