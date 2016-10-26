/**
 * If you are adding JWT decorator to your controller class
 * then you **have to** inherit it from _**JwtHolder**_ interface to
 * be able to receive JWT related data into your class instance
 *
 * **userProperty** param has to be synced with options.userProperty
 * parameter for jwt check for express-jwt module
 */
export function JWT(userProperty?: string): any {
  return () => { return; };
}
