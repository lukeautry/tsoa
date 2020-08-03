import { HttpStatusCodeLiteral, HttpStatusCodeLiteralStr } from '../interfaces/response'

export function SuccessResponse(name: string | number, description?: string): Function {
  return () => {
    return;
  };
}

export function Response<T>(
  // The status code should not be allowed to be 200 or "200"` since that return type is already defined by the return of the route function.
  // @see https://github.com/lukeautry/tsoa/issues/119
  name: Exclude<HttpStatusCodeLiteral, 200> | Exclude<HttpStatusCodeLiteralStr, '200'>,
  description?: string,
  example?: T
): Function {
  return () => {
    return;
  };
}

/**
 * Inject a library-agnostic responder function that can be used to construct type-checked (usually error-) responses.
 *
 * The type of the responder function should be annotated `TsoaResponse<Status, Data, Headers>` in order to support OpenAPI documentation.
 */
export function Res(): Function {
  return () => {
    return;
  };
}
