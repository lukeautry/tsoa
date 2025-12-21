import * as Koa from 'koa';
import { Router as KoaRouter } from '@koa/router';
import '../controllers/rootController';

import '../controllers/optionsController';
import '../controllers/deleteController';
import '../controllers/getController';
import '../controllers/headController';
import '../controllers/patchController';
import '../controllers/postController';
import '../controllers/putController';

import '../controllers/methodController';
import '../controllers/parameterController';
import '../controllers/securityController';
import '../controllers/testController';
import '../controllers/validateController';
import '../controllers/noExtendsController';

import * as bodyParser from 'koa-bodyparser';
import { RegisterRoutes } from './routes';

const app = new Koa();
app.use(bodyParser());

const router = new KoaRouter();

(RegisterRoutes as (router: KoaRouter) => void)(router);

// It's important that this come after the main routes are registered
app.use(async (context, next) => {
  try {
    await next();
  } catch (err: any) {
    context.status = err.status || 500;
    context.body = err.message || 'An error occurred during the request.';
  }
});

app.use(router.routes()).use(router.allowedMethods());

export const server = app.listen();
