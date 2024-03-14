import { Readable } from 'stream';
import { Request as HRequest, ResponseToolkit as HResponse, RouteOptionsPreAllOptions } from '@hapi/hapi';
import type { Payload } from '@hapi/boom';

import { fetchMiddlewares } from '../../../decorators/middlewares';
import { Controller } from '../../../interfaces/controller';
import { FieldErrors } from '../../templateHelpers';
import { TsoaRoute } from '../../tsoa-route';
import { ValidateError } from '../../templateHelpers';
import { TemplateService } from '../templateService';

const hapiTsoaResponsed = Symbol('@tsoa:template_service:hapi:responsed');

type HapiApiHandlerParameters = {
  methodName: string;
  controller: Controller | Object;
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
    readonly models: any,
    private readonly minimalSwaggerConfig: any,
    private readonly hapi: {
      boomify: Function;
      isBoom: Function;
    },
  ) {
    super(models);
  }

  async apiHandler(params: HapiApiHandlerParameters) {
    const { methodName, controller, h, validatedArgs, successStatus } = params;
    const promise = this.buildPromise(methodName, controller, validatedArgs);

    try {
      const data = await Promise.resolve(promise);
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
          return this.validationService.ValidateParam(param, value, name, errorFields, undefined, this.minimalSwaggerConfig);
        }
        case 'query':
          return this.validationService.ValidateParam(param, request.query[name], name, errorFields, undefined, this.minimalSwaggerConfig);
        case 'queries':
          return this.validationService.ValidateParam(param, request.query, name, errorFields, undefined, this.minimalSwaggerConfig);
        case 'path':
          return this.validationService.ValidateParam(param, request.params[name], name, errorFields, undefined, this.minimalSwaggerConfig);
        case 'header':
          return this.validationService.ValidateParam(param, request.headers[name], name, errorFields, undefined, this.minimalSwaggerConfig);
        case 'body':
          return this.validationService.ValidateParam(param, request.payload, name, errorFields, undefined, this.minimalSwaggerConfig);
        case 'body-prop': {
          const descriptor = Object.getOwnPropertyDescriptor(request.payload, name);
          const value = descriptor ? descriptor.value : undefined;
          return this.validationService.ValidateParam(param, value, name, errorFields, 'body.', this.minimalSwaggerConfig);
        }
        case 'formData': {
          const descriptor = Object.getOwnPropertyDescriptor(request.payload, name);
          const value = descriptor ? descriptor.value : undefined;
          return this.validationService.ValidateParam(param, value, name, errorFields, undefined, this.minimalSwaggerConfig);
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
    let { headers } = params;
    headers = headers || {};

    const tsoaResponsed = Object.getOwnPropertyDescriptor(h, hapiTsoaResponsed);
    if (tsoaResponsed) {
      return tsoaResponsed.value;
    }

    const response = data !== null && data !== undefined ? h.response(data).code(200) : h.response('').code(204);

    Object.keys(headers).forEach((name: string) => {
      response.header(name, headers[name]);
    });

    if (statusCode) {
      response.code(statusCode);
    }

    Object.defineProperty(h, hapiTsoaResponsed, {
      value: response,
      writable: false,
    });

    return response;
  }

  /**
   *
   * @param meta.singleUploadFileFields array string of field names where payload stores a single file(File).
   * @param meta.filesUploadFieldName string of field name where payload stores files(File[]).
   */
  middlewares(meta: {
    controller: Controller | Object;
    method: Object;
    singleUploadFileFields: string[];
    filesUploadFieldName?: string;
  }): RouteOptionsPreAllOptions[] {
    const middlewares: RouteOptionsPreAllOptions[] = [];

    if (meta.singleUploadFileFields.length > 0) {
      meta.singleUploadFileFields.forEach((fieldName) => {
        middlewares.push({ method: this.fileUploadMiddleware(fieldName) });
      });
    } else if (meta.filesUploadFieldName) {
      middlewares.push({ method: this.fileUploadMiddleware(meta.filesUploadFieldName, true) });
    }

    middlewares.push(...fetchMiddlewares<RouteOptionsPreAllOptions>(meta.controller));
    middlewares.push(...fetchMiddlewares<RouteOptionsPreAllOptions>(meta.method));

    return middlewares;
  }

  payload(meta: {
    singleUploadFileFields: string[];
    filesUploadFieldName?: string;
  }): any {
    if (meta.singleUploadFileFields.length > 0 || meta.filesUploadFieldName) {
      return {
        output: 'stream',
        parse: true,
        multipart: true,
        allow: 'multipart/form-data',
      };
    }

    return undefined;
  }

  private fileUploadMiddleware(fieldName: string, multiple: boolean = false) {
    return (request: HRequest, h: HResponse) => {
      const payload = request.payload as Record<string, string | object | Readable | Buffer>;
      const file: Readable = payload[fieldName] as Readable;
      if (!file) {
        return h.response(`${fieldName} is a required file(s).`).code(400);
      }

      if (!multiple) {
        return this.calculateFileInfo(fieldName, file)
          .then(fileMetadata => {
            payload[fieldName] = fileMetadata;
            return h.continue;
          })
          .catch(err => h.response(err.toString()).code(500));
      } else {
        const files = file as unknown as Readable[];
        const promises = files.map((reqFile: any) => this.calculateFileInfo(fieldName, reqFile));
        return Promise.all(promises)
          .then(filesMetadata => {
            payload[fieldName] = filesMetadata;
            return h.continue;
          })
          .catch(err => h.response(err.toString()).code(500));
      }
    };
  }

  private calculateFileInfo(fieldName: string, reqFile: any): Promise<{
    fieldname: string;
    originalname: string;
    buffer: Buffer;
    encoding: string;
    mimetype: string;
    filename: string;
    size: number;
  }> {
    return new Promise((resolve) => {
      const originalname = reqFile.hapi.filename;
      const headers = reqFile.hapi.headers;
      const contentTransferEncoding = headers['content-transfer-encoding'];
      const encoding = contentTransferEncoding &&
        contentTransferEncoding[0] &&
        contentTransferEncoding[0].toLowerCase() || '7bit';
      const mimetype = headers['content-type'] || 'text/plain';
      const buffer = reqFile._data;

      return resolve({
        fieldname: fieldName,
        originalname,
        buffer,
        encoding,
        mimetype,
        filename: originalname,
        size: buffer.toString().length,
      })
    });
  }
}
