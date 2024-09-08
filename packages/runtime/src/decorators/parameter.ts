/**
 * Inject http Body
 *  @param {string} [name] properties name in body object
 */
export function Body(): ParameterDecorator {
  return () => {
    return;
  };
}

/**
 * Inject value from body
 *
 * @param {string} [name] The name of the body parameter
 */
export function BodyProp(name?: string): ParameterDecorator {
  return () => {
    return;
  };
}

/**
 * Inject http request
 */
export function Request(): ParameterDecorator {
  return () => {
    return;
  };
}

/**
 * Inject value from request
 *
 * @param {name} [name] The name of the request parameter
 */
export function RequestProp(name?: string): ParameterDecorator {
  return () => {
    return;
  };
}

/**
 * Inject value from Path
 *
 * @param {string} [name] The name of the path parameter
 */
export function Path(name?: string): ParameterDecorator {
  return () => {
    return;
  };
}

/**
 * Inject value from query string
 *
 * @param {string} [name] The name of the query parameter
 */
export function Query(name?: string): ParameterDecorator {
  return () => {
    return;
  };
}

/**
 * Inject all query values in a single object
 */
export function Queries(): ParameterDecorator {
  return () => {
    return;
  };
}

/**
 * Inject value from Http header
 *
 * @param {string} [name] The name of the header parameter
 */
export function Header(name?: string): ParameterDecorator {
  return () => {
    return;
  };
}

/**
 * Mark parameter as manually injected, which will not be generated
 */
export function Inject(): ParameterDecorator {
  return () => {
    return;
  };
}

/**
 * Inject uploaded file
 *
 * @param {string} [name] The name of the uploaded file parameter
 */
export function UploadedFile(name?: string): ParameterDecorator {
  return () => {
    return;
  };
}

/**
 * Inject uploaded files
 *
 * @param {string} [name] The name of the uploaded files parameter
 */
export function UploadedFiles(name?: string): ParameterDecorator {
  return () => {
    return;
  };
}

/**
 * Inject uploaded files
 *
 * @param {string} [name] The name of the uploaded files parameter
 */
export function FormField(name?: string): ParameterDecorator {
  return () => {
    return;
  };
}

/**
 * Overrides the default media type of request body.
 * Can be used on specific method.
 * Can't be used on controller level.
 *
 * @link https://swagger.io/docs/specification/describing-request-body/
 */
export function Consumes(value: string): ParameterDecorator {
  return () => {
    return;
  };
}
