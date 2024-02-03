import { ResponseToolkit as HResponse } from '@hapi/hapi';
import { boomify, isBoom, type Payload } from '@hapi/boom';
import { Controller, FieldErrors, ValidateError } from '@tsoa/runtime';

import { isController, TemplateService } from '../templateService';

type HapiPromiseHandlerParameters = {
  controller: Controller | Object;
  promise: Promise<any>,
  h: HResponse;
  successStatus?: number;
};

type HapiReturnHandlerParameters = {
  h: HResponse;
  headers: any;
  statusCode?: number;
  data?: any
};

export class HapiTemplateService extends TemplateService<HapiPromiseHandlerParameters, HapiReturnHandlerParameters, any, HResponse> {
  constructor(
    readonly models: any,
    private readonly minimalSwaggerConfig: any,
  ) {
    super(models);
  }

  promiseHandler(params: HapiPromiseHandlerParameters) {
    const { controller, promise, h, successStatus } = params;

    return Promise.resolve(promise)
      .then((data: any) => {
        let statusCode = successStatus;
        let headers;

        if (isController(controller)) {
          headers = controller.getHeaders();
          statusCode = controller.getStatus() || statusCode;
        }
        return this.returnHandler({ h, headers, statusCode, data });
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

  getValidatedArgs(args: any, request: any, h: HResponse): any[] {
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
          return (status: number | undefined, data: any, headers: any) => {
            this.returnHandler({ h, headers, statusCode: status, data });
          };
      }
    });
    if (Object.keys(errorFields).length > 0) {
      throw new ValidateError(errorFields, '');
    }
    return values;
  }

  protected returnHandler(params: HapiReturnHandlerParameters) {
    const { h, statusCode, data } = params;
    let { headers } = params;
    headers = headers || {};

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
}
