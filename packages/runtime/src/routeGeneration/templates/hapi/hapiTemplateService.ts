import { Request as HRequest, ResponseToolkit as HResponse } from '@hapi/hapi';
import type { Payload } from '@hapi/boom';

import { Controller } from '../../../interfaces/controller';
import { FieldErrors } from '../../templateHelpers';
import { TsoaRoute } from '../../tsoa-route';
import { ValidateError } from '../../templateHelpers';
import { TemplateService } from '../templateService';
import { AdditionalProps } from '../../additionalProps';

const hapiTsoaResponsed = Symbol('@tsoa:template_service:hapi:responsed');

type HapiApiHandlerParameters = {
  methodName: string;
  controller: Controller | object;
  h: HResponse;
  validatedArgs: any[];
  successStatus?: number;
};

type HapiValidationArgsParameters = {
  args: Record<string, TsoaRoute.ParameterSchema>;
  request: HRequest;
  h: HResponse;
};

type HapiReturnHandlerParameters = {
  h: HResponse;
  headers: any;
  statusCode?: number;
  data?: any;
};

export class HapiTemplateService extends TemplateService<HapiApiHandlerParameters, HapiValidationArgsParameters, HapiReturnHandlerParameters> {
  constructor(
    protected readonly models: TsoaRoute.Models,
    protected readonly config: AdditionalProps,
    private readonly hapi: {
      boomify: CallableFunction;
      isBoom: CallableFunction;
    },
  ) {
    super(models, config);
  }

  async apiHandler(params: HapiApiHandlerParameters) {
    const { methodName, controller, h, validatedArgs, successStatus } = params;

    try {
      const data = await this.buildPromise(methodName, controller, validatedArgs);
      let statusCode = successStatus;
      let headers;

      if (this.isController(controller)) {
        headers = controller.getHeaders();
        statusCode = controller.getStatus() || statusCode;
      }
      return this.returnHandler({ h, headers, statusCode, data });
    } catch (error: any) {
      if (this.hapi.isBoom(error)) {
        throw error;
      }

      const boomErr = this.hapi.boomify(error instanceof Error ? error : new Error(error.message));
      boomErr.output.statusCode = error.status || 500;
      boomErr.output.payload = {
        name: error.name,
        message: error.message,
      } as unknown as Payload;
      throw boomErr;
    }
  }

  getValidatedArgs(params: HapiValidationArgsParameters): any[] {
    const { args, request, h } = params;

    const errorFields: FieldErrors = {};
    const values = Object.values(args).map(param => {
      const name = param.name;
      switch (param.in) {
        case 'request':
          return request;
        case 'request-prop': {
          const descriptor = Object.getOwnPropertyDescriptor(request, name);
          const value = descriptor ? descriptor.value : undefined;
          return this.validationService.ValidateParam(param, value, name, errorFields, false, undefined);
        }
        case 'query':
          return this.validationService.ValidateParam(param, request.query[name], name, errorFields, false, undefined);
        case 'queries':
          return this.validationService.ValidateParam(param, request.query, name, errorFields, false, undefined);
        case 'path':
          return this.validationService.ValidateParam(param, request.params[name], name, errorFields, false, undefined);
        case 'header':
          return this.validationService.ValidateParam(param, request.headers[name], name, errorFields, false, undefined);
        case 'body':
          return this.validationService.ValidateParam(param, request.payload, name, errorFields, true, undefined);
        case 'body-prop': {
          const descriptor = Object.getOwnPropertyDescriptor(request.payload, name);
          const value = descriptor ? descriptor.value : undefined;
          return this.validationService.ValidateParam(param, value, name, errorFields, true, 'body.');
        }
        case 'formData': {
          const descriptor = Object.getOwnPropertyDescriptor(request.payload, name);
          const value = descriptor ? descriptor.value : undefined;
          return this.validationService.ValidateParam(param, value, name, errorFields, false, undefined);
        }
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
    const { headers } = params;

    const tsoaResponsed = Object.getOwnPropertyDescriptor(h, hapiTsoaResponsed);
    if (tsoaResponsed) {
      return tsoaResponsed.value;
    }

    const response = data !== null && data !== undefined ? h.response(data).code(200) : h.response('').code(204);

    if( headers ){
      Object.keys(headers).forEach((name: string) => {
        response.header(name, headers[name]);
      });
    }

    if (statusCode) {
      response.code(statusCode);
    }

    Object.defineProperty(h, hapiTsoaResponsed, {
      value: response,
      writable: false,
    });

    return response;
  }
}
