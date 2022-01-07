import * as Koa from 'koa';
import * as multer from '@koa/multer';
import * as KoaRouter from '@koa/router';
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

import '../controllers/middlewaresKoaController';

import * as bodyParser from 'koa-bodyparser';
import { RegisterRoutes } from './routes';

const app = new Koa();
app.use(bodyParser());

const router = new KoaRouter();

router.post('/v1/PostTest/FileAndJsonFormField', async (ctx, next) => {
  await multer().single('file')(ctx, () => {
    ctx.request.body.json = JSON.parse(ctx.request.body.json);
  });
  await next();
});

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

app.use(router.routes()).use(router.allowedMethods());

export const server = app.listen();
