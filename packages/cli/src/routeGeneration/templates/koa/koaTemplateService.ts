import type { Context } from 'koa';
import { TsoaResponse, HttpStatusCodeLiteral, FieldErrors, ValidationService, ValidateError } from "@tsoa/runtime";
import { TemplateService, isController } from "../templateService";

export class KoaTemplateService implements TemplateService<any, Context> {
  private readonly validationService: ValidationService;

  constructor(
    readonly models: any,
    private readonly minimalSwaggerConfig: any,
  ) {
    this.validationService = new ValidationService(models);
  }

  promiseHandler(controllerObj: any, promise: any, context: Context, successStatus: any, next: any) {
    return Promise.resolve(promise)
      .then((data: any) => {
        let statusCode = successStatus;
        let headers;

        if (isController(controllerObj)) {
            headers = controllerObj.getHeaders();
            statusCode = controllerObj.getStatus() || statusCode;
        }
        return this.returnHandler(context, headers, statusCode, data, next);
      })
      .catch((error: any) => {
        context.status = error.status || 500;
        context.throw(context.status, error.message, error);
      });
  }

  returnHandler(context: Context, headers: any, statusCode?: number | undefined, data?: any, next?: any) {
    if (!context.headerSent && !(context.response as any).__tsoaResponded) {
      if (data !== null && data !== undefined) {
          context.body = data;
          context.status = 200;
      } else {
          context.status = 204;
      }

      if (statusCode) {
          context.status = statusCode;
      }

      context.set(headers);
      (context.response as any).__tsoaResponded = true;
      return next ? next() : context;
    }
  }

  responder(context: any, next?: any): TsoaResponse<HttpStatusCodeLiteral, unknown>  {
    return (status, data, headers) => {
       this.returnHandler(context, headers, status, data, next);
    };
  }

  getValidatedArgs(args: any, request: any, context: Context, next: () => any): any[] {
    const errorFields: FieldErrors = {};
    const values = Object.keys(args).map(key => {
        const name = args[key].name;
        switch (args[key].in) {
        case 'request':
            return context.request;
        case 'request-prop':
          return this.validationService.ValidateParam(args[key], (context.request as any)[name], name, errorFields, undefined, this.minimalSwaggerConfig);
        case 'query':
            return this.validationService.ValidateParam(args[key], context.request.query[name], name, errorFields, undefined, this.minimalSwaggerConfig);
        case 'queries':
            return this.validationService.ValidateParam(args[key], context.request.query, name, errorFields, undefined, this.minimalSwaggerConfig);
        case 'path':
            return this.validationService.ValidateParam(args[key], context.params[name], name, errorFields, undefined, this.minimalSwaggerConfig);
        case 'header':
            return this.validationService.ValidateParam(args[key], context.request.headers[name], name, errorFields, undefined, this.minimalSwaggerConfig);
        case 'body':
            return this.validationService.ValidateParam(args[key], (context.request as any).body, name, errorFields, undefined, this.minimalSwaggerConfig);
        case 'body-prop':
            return this.validationService.ValidateParam(args[key], (context.request as any).body[name], name, errorFields, 'body.', this.minimalSwaggerConfig);
        case 'formData':
            if (args[key].dataType === 'file') {
              return this.validationService.ValidateParam(args[key], (context.request as any).file, name, errorFields, undefined, this.minimalSwaggerConfig);
            } else if (args[key].dataType === 'array' && args[key].array.dataType === 'file') {
              return this.validationService.ValidateParam(args[key], (context.request as any).files, name, errorFields, undefined, this.minimalSwaggerConfig);
            } else {
              return this.validationService.ValidateParam(args[key], (context.request as any).body[name], name, errorFields, undefined, this.minimalSwaggerConfig);
            }
        case 'res':
            return this.responder(context, next);
        }
    });
    if (Object.keys(errorFields).length > 0) {
        throw new ValidateError(errorFields, '');
    }
    return values;
}
}
