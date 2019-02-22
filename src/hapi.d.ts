import 'hapi';
declare module 'hapi' {
  interface Request {
    user?: any;
  }
}
