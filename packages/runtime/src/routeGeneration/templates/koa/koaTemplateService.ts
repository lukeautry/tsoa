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
  async apiHandler(params: KoaApiHandlerParameters) {
    const { methodName, controller, context, validatedArgs, successStatus } = params;

    try {
      const data = await this.buildPromise(methodName, controller, validatedArgs);
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
          return this.validationService.ValidateParam(param, value, name, errorFields, false, undefined);
        }
        case 'query':
          return this.validationService.ValidateParam(param, context.request.query[name], name, errorFields, false, undefined);
        case 'queries':
          return this.validationService.ValidateParam(param, context.request.query, name, errorFields, false, undefined);
        case 'path':
          return this.validationService.ValidateParam(param, context.params[name], name, errorFields, false, undefined);
        case 'header':
          return this.validationService.ValidateParam(param, context.request.headers[name], name, errorFields, false, undefined);
        case 'body': {
          const descriptor = Object.getOwnPropertyDescriptor(context.request, 'body');
          const value = descriptor ? descriptor.value : undefined;
          return this.validationService.ValidateParam(param, value, name, errorFields, true, undefined);
        }
        case 'body-prop': {
          const descriptor = Object.getOwnPropertyDescriptor(context.request, 'body');
          const value = descriptor ? descriptor.value[name] : undefined;
          return this.validationService.ValidateParam(param, value, name, errorFields, true, 'body.');
        }
        case 'formData': {
          const files = Object.values(args).filter(p => p.dataType === 'file' || (p.dataType === 'array' && p.array && p.array.dataType === 'file'));
          const contextRequest = context.request as any;
          if ((param.dataType === 'file' || (param.dataType === 'array' && param.array && param.array.dataType === 'file')) && files.length > 0) {
            if (contextRequest.files[name] === undefined) {
              return undefined;
            }

            const fileArgs = this.validationService.ValidateParam(param, contextRequest.files[name], name, errorFields, false, undefined);
            return fileArgs.length === 1 ? fileArgs[0] : fileArgs;
          }
          return this.validationService.ValidateParam(param, contextRequest.body[name], name, errorFields, false, undefined);
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
