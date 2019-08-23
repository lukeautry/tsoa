import '@hapi/hapi';
declare module '@hapi/hapi' {
  interface Request {
    user?: any;
  }
}
