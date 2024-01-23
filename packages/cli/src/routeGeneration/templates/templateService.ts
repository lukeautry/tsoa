import { Controller, HttpStatusCodeLiteral, TsoaResponse } from "@tsoa/runtime";

export interface TemplateService<Request, Response> {
  promiseHandler(controllerObj: any, promise: any, response: Response, successStatus: any, next: any): any;

  returnHandler(response: Response, header: any, statusCode?: number, data?: any, next?: any): any;

  responder(response: Response, next?: any): TsoaResponse<HttpStatusCodeLiteral, unknown>;

  getValidatedArgs(args: any, request: Request, response: Response, next?: any): any[];
}

export function isController(object: any): object is Controller {
  return 'getHeaders' in object && 'getStatus' in object && 'setStatus' in object;
}
