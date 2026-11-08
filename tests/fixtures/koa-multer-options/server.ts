import Koa from 'koa';
import KoaRouter from '@koa/router';
import multer from '@koa/multer';
import { tmpdir } from 'os';

import '../controllers/postController';

import bodyParser from 'koa-bodyparser';
import { RegisterRoutes } from './routes';

const app = new Koa();
app.use(bodyParser());

const router = new KoaRouter();

RegisterRoutes(router, {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- @koa/multer ships no types
  multer: multer({
    dest: tmpdir(),
    limits: {
      fileSize: 8 * 1024 * 1024,
    },
  }),
});

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
