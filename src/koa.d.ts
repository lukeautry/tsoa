import 'koa';
declare module 'koa' {
  interface Request {
    user?: any;
  }
}
