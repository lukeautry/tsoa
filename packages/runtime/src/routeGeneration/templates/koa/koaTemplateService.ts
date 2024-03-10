import type { Context, Next } from 'koa';

import { Controller } from '../../../interfaces/controller';
import { FieldErrors } from '../../templateHelpers';
import { TsoaRoute } from '../../tsoa-route';
import { ValidateError } from '../../templateHelpers';
import { TemplateService } from '../templateService';

const koaTsoaResponsed = Symbol('@tsoa:template_service:koa:is_responsed');

type KoaApiHandlerParameters = {
  methodName: string;
  controller: Controller | Object;
  context: Context;
  validatedArgs: any[];
  successStatus?: number;
};

type KoaValidationArgsParameters = {
  args: Record<string, TsoaRoute.ParameterSchema>;
  context: Context;
  next: Next;
};

type KoaReturnHandlerParameters = {
  context: Context;
  next?: Next;
  headers: any;
  statusCode?: number;
  data?: any;
};

export class KoaTemplateService extends TemplateService<KoaApiHandlerParameters, KoaValidationArgsParameters, KoaReturnHandlerParameters> {
  constructor(
    readonly models: any,
    private readonly minimalSwaggerConfig: any,
  ) {
    super(models);
  }

  async apiHandler(params: KoaApiHandlerParameters) {
    const { methodName, controller, context, validatedArgs, successStatus } = params;
    const promise = this.buildPromise(methodName, controller, validatedArgs);

    try {
      const data = await Promise.resolve(promise);
      let statusCode = successStatus;
      let headers;

      if (this.isController(controller)) {
        headers = controller.getHeaders();
        statusCode = controller.getStatus() || statusCode;
      }
      return this.returnHandler({ context, headers, statusCode, data });
    } catch (error: any) {
      context.status = error.status || 500;
      context.throw(context.status, error.message, error);
    }
  }

  getValidatedArgs(params: KoaValidationArgsParameters): any[] {
    const { args, context, next } = params;

    const errorFields: FieldErrors = {};
    const values = Object.values(args).map(param => {
      const name = param.name;
      switch (param.in) {
        case 'request':
            return context.request;
        case 'request-prop': {
          const descriptor = Object.getOwnPropertyDescriptor(context.request, name);
          const value = descriptor ? descriptor.value : undefined;
          return this.validationService.ValidateParam(param, value, name, errorFields, undefined, this.minimalSwaggerConfig);
        }
        case 'query':
          return this.validationService.ValidateParam(param, context.request.query[name], name, errorFields, undefined, this.minimalSwaggerConfig);
        case 'queries':
          return this.validationService.ValidateParam(param, context.request.query, name, errorFields, undefined, this.minimalSwaggerConfig);
        case 'path':
          return this.validationService.ValidateParam(param, context.params[name], name, errorFields, undefined, this.minimalSwaggerConfig);
        case 'header':
          return this.validationService.ValidateParam(param, context.request.headers[name], name, errorFields, undefined, this.minimalSwaggerConfig);
        case 'body': {
          const descriptor = Object.getOwnPropertyDescriptor(context.request, 'body');
          const value = descriptor ? descriptor.value : undefined;
          return this.validationService.ValidateParam(param, value, name, errorFields, undefined, this.minimalSwaggerConfig);
        }
        case 'body-prop': {
          const descriptor = Object.getOwnPropertyDescriptor(context.request, 'body');
          const value = descriptor ? descriptor.value[name] : undefined;
          return this.validationService.ValidateParam(param, value, name, errorFields, 'body.', this.minimalSwaggerConfig);
        }
        case 'formData': {
          const files = Object.values(args).filter(param => param.dataType === 'file');
          const contextRequest = context.request as any;
          if (files.length > 0) {
            const fileArgs = this.validationService.ValidateParam(param, contextRequest.files[name], name, errorFields, undefined, this.minimalSwaggerConfig);
            return fileArgs.length === 1 ? fileArgs[0] : fileArgs;
          } else if (param.dataType === 'array' && param.array && param.array.dataType === 'file') {
            return this.validationService.ValidateParam(param, contextRequest.files, name, errorFields, undefined, this.minimalSwaggerConfig);
          } else {
            return this.validationService.ValidateParam(param, contextRequest.body[name], name, errorFields, undefined, this.minimalSwaggerConfig);
          }
        }
        case 'res':
          return async (status: number | undefined, data: any, headers: any): Promise<void> => {
            await this.returnHandler({ context, headers, statusCode: status, data, next });
          };
      }
    });
    if (Object.keys(errorFields).length > 0) {
      throw new ValidateError(errorFields, '');
    }
    return values;
  }

  protected returnHandler(params: KoaReturnHandlerParameters): Promise<any> | Context | undefined {
    const { context, next, statusCode, data } = params;
    let { headers } = params;
    headers = headers || {};

    const isResponsed = Object.getOwnPropertyDescriptor(context.response, koaTsoaResponsed);
    if (!context.headerSent && !isResponsed) {
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
      Object.defineProperty(context.response, koaTsoaResponsed, {
        value: true,
        writable: false,
      });
      return next ? next() : context;
    }
    return undefined;
  }
}
