import { IsValidHeader } from '../utils/isHeaderType';
import { HttpStatusCodeLiteral, HttpStatusCodeStringLiteral, OtherValidOpenApiHttpStatusCode } from '../interfaces/response';

export function SuccessResponse<HeaderType extends IsValidHeader<HeaderType> = {}>(name: string | number, description?: string): Function {
  return () => {
    return;
  };
}

export function Response<ExampleType, HeaderType extends IsValidHeader<HeaderType> = {}>(
  name: HttpStatusCodeLiteral | HttpStatusCodeStringLiteral | OtherValidOpenApiHttpStatusCode,
  description?: string,
  example?: ExampleType,
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
