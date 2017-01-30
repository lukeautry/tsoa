/**
 * Decorator to denote a controller methods parameter
 *  as being injected instead of being parsed from
 *  the request.
 * To inject a parameter in your controller use a custom
 *  template.
 * Injected parameters do not show up in your swagger file.
 */
export function Inject(value?: string): any {
  return () => { return; };
}

/**
 * Decorator to mark a controller methods parameter to
 *  be the express request object. This parameter is
 *  injected automatically by the express template into
 *  your controller.
 * Request parameters do not show up in your swagger file.
 */
export function Request(value?: string): any {
  return () => { return; };
}
