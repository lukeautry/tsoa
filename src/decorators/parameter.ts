/**
 * Inject http Body
 *  @param {string} [name] properties name in body object
 */
export function Body(): any {
  return () => { return; };
}

/**
 * Inject value from body
 *
 * @param {string} [name] The name of the body parameter
 */
export function BodyProp(name?: string): any {
  return () => { return; };
}

/**
 * Inject http request
 */
export function Request(): any {
  return () => { return; };
}

/**
 * Inject value from Path
 *
 * @param {string} [name] The name of the path parameter
 */
export function Path(name?: string): any {
  return () => { return; };
}

/**
 * Inject value from query string
 *
 * @param {string} [name] The name of the query parameter
 */
export function Query(name?: string): any {
  return () => { return; };
}

/**
 * Inject value from Http header
 *
 * @param {string} [name] The name of the header parameter
 */
export function Header(name?: string): any {
  return () => { return; };
}
