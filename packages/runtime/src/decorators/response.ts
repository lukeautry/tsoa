export function SuccessResponse(name: string | number, description?: string): Function;

export function SuccessResponse<T>(name: string | number, description?: string): Function;

export function SuccessResponse<T>(name: string | number, description?: string): Function {
  return () => {
    return;
  };
}

export function Response(name: string | number, description?: string): Function;

export function Response<U>(name: string | number, description?: string): Function;

export function Response<T>(name: string | number, description?: string, example?: T): Function;

export function Response<T, U>(name: string | number, description?: string, example?: T): Function;

export function Response<T, U>(name: string | number, description?: string, example?: T): Function {
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
