import { Controller, HttpStatusCodeLiteral, TsoaResponse } from "@tsoa/runtime";

export interface TemplateService {
  isController(object: any): object is Controller;

  promiseHandler(controllerObj: any, promise: any, response: any, successStatus: any, next: any): any;

  returnHandler(response: any, header: any, statusCode?: number, data?: any, next?: any): any;

  responder(response: any, next?: any): TsoaResponse<HttpStatusCodeLiteral, unknown>;

  getValidatedArgs(args: any, request: any, response: any): any[];
}
