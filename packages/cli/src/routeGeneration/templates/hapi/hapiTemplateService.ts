import { ResponseToolkit as HReponse } from '@hapi/hapi';
import { boomify, isBoom, type Payload } from '@hapi/boom';
import { TsoaResponse, HttpStatusCodeLiteral, FieldErrors, ValidationService, ValidateError } from '@tsoa/runtime';

import { isController, TemplateService } from '../templateService';

export class HapiTemplateService implements TemplateService<any, HReponse> {
  private readonly validationService: ValidationService;

  constructor(
    readonly models: any,
    private readonly minimalSwaggerConfig: any,
  ) {
    this.validationService = new ValidationService(models);
  }

  promiseHandler(controllerObj: any, promise: any, request: any, successStatus: any, h: any) {
    return Promise.resolve(promise)
      .then((data: any) => {
        let statusCode = successStatus;
        let header;

        if (isController(controllerObj)) {
          header = controllerObj.getHeaders();
          statusCode = controllerObj.getStatus() || statusCode;
        }
        return this.returnHandler(h, header, statusCode, data);
      })
      .catch((error: any) => {
        if (isBoom(error)) {
          throw error;
        }

        const boomErr = boomify(error instanceof Error ? error : new Error(error.message));
        boomErr.output.statusCode = error.status || 500;
        boomErr.output.payload = {
          name: error.name,
          message: error.message,
        } as unknown as Payload;
        throw boomErr;
      });
  }

  returnHandler(h: HReponse, headers: any = {}, statusCode?: number | undefined, data?: any) {
    if ((h as any).__isTsoaResponded) {
      return (h as any).__isTsoaResponded;
    }

    const response = data !== null && data !== undefined ? h.response(data).code(200) : h.response('').code(204);

    Object.keys(headers).forEach((name: string) => {
      response.header(name, headers[name]);
    });

    if (statusCode) {
      response.code(statusCode);
    }

    (h as any).__isTsoaResponded = response;

    return response;
  }

  responder(h: HReponse): TsoaResponse<HttpStatusCodeLiteral, unknown> {
    return (status, data, headers) => {
      this.returnHandler(h, headers, status, data);
    };
  }

  getValidatedArgs(args: any, request: any, h: HReponse): any[] {
    const errorFields: FieldErrors = {};
    const values = Object.keys(args).map(key => {
      const name = args[key].name;
      switch (args[key].in) {
        case 'request':
          return request;
        case 'request-prop':
          return this.validationService.ValidateParam(args[key], request[name], name, errorFields, undefined, this.minimalSwaggerConfig);
        case 'query':
          return this.validationService.ValidateParam(args[key], request.query[name], name, errorFields, undefined, this.minimalSwaggerConfig);
        case 'queries':
          return this.validationService.ValidateParam(args[key], request.query, name, errorFields, undefined, this.minimalSwaggerConfig);
        case 'path':
          return this.validationService.ValidateParam(args[key], request.params[name], name, errorFields, undefined, this.minimalSwaggerConfig);
        case 'header':
          return this.validationService.ValidateParam(args[key], request.headers[name], name, errorFields, undefined, this.minimalSwaggerConfig);
        case 'body':
          return this.validationService.ValidateParam(args[key], request.payload, name, errorFields, undefined, this.minimalSwaggerConfig);
        case 'body-prop':
          return this.validationService.ValidateParam(args[key], request.payload[name], name, errorFields, 'body.', this.minimalSwaggerConfig);
        case 'formData':
          return this.validationService.ValidateParam(args[key], request.payload[name], name, errorFields, undefined, this.minimalSwaggerConfig);
        case 'res':
          return this.responder(h);
      }
    });
    if (Object.keys(errorFields).length > 0) {
      throw new ValidateError(errorFields, '');
    }
    return values;
  }
}
