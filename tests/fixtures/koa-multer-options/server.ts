import * as Koa from 'koa';
import * as KoaRouter from '@koa/router';

import '../controllers/postController';

import * as bodyParser from 'koa-bodyparser';
import { RegisterRoutes } from './routes';

const app = new Koa();
app.use(bodyParser());

const router = new KoaRouter();

RegisterRoutes(router);

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
