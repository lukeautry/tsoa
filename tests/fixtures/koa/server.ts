import * as Koa from 'koa';
import * as bodyParser from 'koa-bodyparser';
import * as multer from 'koa-multer';
import * as KoaRouter from 'koa-router';

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

import '../../functional/upload.controller';

import { RegisterRoutes } from './routes';

const storage = multer.memoryStorage();
const upload = multer({ storage });

const app = new Koa();
const router = new KoaRouter();
router.post('/v1/UploadController/File', upload.single('avater'));

RegisterRoutes(router);

app
  .use(bodyParser())
  .use(router.routes())
  .use(router.allowedMethods());

// It's important that this come after the main routes are registered
app.use(async (context, next) => {
  try {
    await next();
  } catch (err) {
    // tslint:disable-next-line:no-console
    console.error(err);
    context.status = err.status || 500;
    context.body = err.message || 'An error occurred during the request.';
  }
});

export const koaApp = app.listen(3002);
