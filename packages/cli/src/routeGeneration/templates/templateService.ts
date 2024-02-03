import { Controller, TsoaRoute, ValidationService } from "@tsoa/runtime";

export abstract class TemplateService<Request, Response> {
  protected validationService: ValidationService;

  constructor(
    protected readonly models: TsoaRoute.Models,
  ) {
    this.validationService = new ValidationService(models);
  }

  abstract promiseHandler(controllerObj: any, promise: any, response: Response, successStatus: any, next: any): any;

  abstract returnHandler(response: Response, header: any, statusCode?: number, data?: any, next?: any): any;

  abstract getValidatedArgs(args: any, request: Request, response: Response, next?: any): any[];
}

export function isController(object: any): object is Controller {
  return 'getHeaders' in object && 'getStatus' in object && 'setStatus' in object;
}
