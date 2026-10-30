import type { FastifyRequest, FastifyReply } from 'fastify';
import { STATUS_CODES } from 'http';
import { Stream } from 'stream';
import type { File } from '../../../interfaces/file';

import { Controller } from '../../../interfaces/controller';
import { FieldErrors } from '../../templateHelpers';
import { TsoaRoute } from '../../tsoa-route';
import { ValidateError } from '../../templateHelpers';
import { TemplateService } from '../templateService';

type FastifyApiHandlerParameters = {
  methodName: string;
  controller: Controller | object;
  request: FastifyRequest;
  reply: FastifyReply;
  validatedArgs: any[];
  successStatus?: number;
};

type FastifyValidationArgsParameters = {
  args: Record<string, TsoaRoute.ParameterSchema>;
  request: FastifyRequest;
  reply: FastifyReply;
};

type FastifyReturnHandlerParameters = {
  request: FastifyRequest;
  reply: FastifyReply;
  headers: any;
  statusCode?: number;
  data?: any;
};

export class FastifyTemplateService extends TemplateService<FastifyApiHandlerParameters, FastifyValidationArgsParameters, FastifyReturnHandlerParameters> {
  private readonly files = new WeakMap<FastifyRequest, Record<string, File[]>>();
  private readonly responded = new WeakSet<FastifyReply>();

  async apiHandler(params: FastifyApiHandlerParameters) {
    const { methodName, controller, request, reply, validatedArgs, successStatus } = params;

    const data = await this.buildPromise(methodName, controller, validatedArgs);
    let statusCode = successStatus;
    let headers;
    if (this.isController(controller)) {
      headers = controller.getHeaders();
      statusCode = controller.getStatus() || statusCode;
    }
    return this.returnHandler({ request, reply, headers, statusCode, data });
  }

  getValidatedArgs(params: FastifyValidationArgsParameters): any[] {
    const { args, request, reply } = params;

    const errorFields: FieldErrors = {};
    const values = this.getParameters(args).map(param => {
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
          return this.validationService.ValidateParam(param, (request.query as Record<string, unknown>)[name], name, errorFields, false, undefined);
        case 'queries':
          return this.validationService.ValidateParam(param, request.query, name, errorFields, false, undefined);
        case 'path':
          return this.validationService.ValidateParam(param, (request.params as Record<string, unknown>)[name], name, errorFields, false, undefined);
        case 'header':
          return this.validationService.ValidateParam(param, request.headers[name], name, errorFields, false, undefined);
        case 'body': {
          if (param.dataType === 'binary') {
            if (!request.raw.readableEnded) return request.raw;
            errorFields[name] = { message: 'request body was already consumed by a body parser' };
            return undefined;
          }
          const descriptor = Object.getOwnPropertyDescriptor(request, 'body');
          const value = descriptor ? descriptor.value : undefined;
          const bodyFieldErrors: FieldErrors = {};
          const result = this.validationService.ValidateParam(param, value, name, bodyFieldErrors, true, undefined);
          Object.keys(bodyFieldErrors).forEach(key => {
            errorFields[key] = { message: bodyFieldErrors[key].message };
          });
          return result;
        }
        case 'body-prop': {
          const descriptor = Object.getOwnPropertyDescriptor(request, 'body');
          const value = descriptor?.value?.[name];
          const bodyFieldErrors: FieldErrors = {};
          const result = this.validationService.ValidateParam(param, value, name, bodyFieldErrors, true, 'body.');
          Object.keys(bodyFieldErrors).forEach(key => {
            errorFields[key] = { message: bodyFieldErrors[key].message };
          });
          return result;
        }
        case 'formData': {
          const files = this.getParameters(args).filter(p => p.dataType === 'file' || (p.dataType === 'array' && p.array && p.array.dataType === 'file'));
          const body = request.body as Record<string, unknown> | undefined;
          if ((param.dataType === 'file' || (param.dataType === 'array' && param.array && param.array.dataType === 'file')) && files.length > 0) {
            const fileArgs = this.validationService.ValidateParam(param, this.files.get(request)?.[name], name, errorFields, false, undefined);
            if (param.dataType === 'array') {
              return fileArgs;
            }
            return Array.isArray(fileArgs) && fileArgs.length === 1 ? fileArgs[0] : fileArgs;
          }
          return this.validationService.ValidateParam(param, body?.[name], name, errorFields, false, undefined);
        }
        case 'res':
          return (status: number | undefined, data: any, headers: any): Promise<void> => {
            this.returnHandler({ request, reply, headers, statusCode: status, data });
            return Promise.resolve();
          };
      }
    });
    if (this.hasFieldErrors(errorFields)) {
      throw new ValidateError(errorFields, JSON.stringify({ fields: errorFields }));
    }
    return values;
  }

  setFiles(request: FastifyRequest, files: Record<string, File[]>) {
    this.files.set(request, files);
  }

  protected returnHandler(params: FastifyReturnHandlerParameters) {
    const { reply, statusCode, data, headers } = params;
    if (reply.sent || this.responded.has(reply)) return;
    this.responded.add(reply);
    reply.code(statusCode || (data !== null && data !== undefined ? 200 : 204));
    reply.headers(headers || {});
    // Koa uses the status message for an absent body with an explicit non-empty status.
    let body = data !== null && data !== undefined ? data : (STATUS_CODES[reply.statusCode] ?? String(reply.statusCode));
    const contentType = String(reply.getHeader('content-type') || '');
    // Koa sends strings verbatim even when the controller sets a JSON content type.
    if (typeof body === 'string' && contentType.includes('json')) {
      reply.serializer(value => value as string);
    } else if (contentType && !contentType.includes('json') && typeof body !== 'string' && !Buffer.isBuffer(body) && !(body instanceof Stream)) {
      body = JSON.stringify(body);
    }
    reply.send(body);
  }
}
