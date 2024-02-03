import { Request as ExRequest, Response as ExResponse, NextFunction as ExNext } from 'express';
import { Controller, FieldErrors, ValidateError } from '@tsoa/runtime';

import { TemplateService, isController } from '../templateService';

type ExpressPromiseHandlerParameters = {
  controller: Controller | Object;
  promise: Promise<any>;
  response: ExResponse;
  next: ExNext;
  successStatus?: number;
};

export class ExpressTemplateService extends TemplateService<ExpressPromiseHandlerParameters, ExRequest, ExResponse> {
  constructor(
    readonly models: any,
    private readonly minimalSwaggerConfig: any,
  ) {
    super(models);
  }

  promiseHandler(params: ExpressPromiseHandlerParameters) {
    const { controller, promise, response, successStatus, next } = params;
    return Promise.resolve(promise)
      .then((data: any) => {
        let statusCode = successStatus;
        let headers;
        if (isController(controller)) {
          headers = controller.getHeaders();
          statusCode = controller.getStatus() || statusCode;
        }

        this.returnHandler(response, headers, statusCode, data);
      })
      .catch((error: any) => next(error));
  }

  returnHandler(response: any, headers: any = {}, statusCode?: number, data?: any) {
    if (response.headersSent) {
      return;
    }
    Object.keys(headers).forEach((name: string) => {
      response.set(name, headers[name]);
    });
    if (data && typeof data.pipe === 'function' && data.readable && typeof data._read === 'function') {
      response.status(statusCode || 200);
      data.pipe(response);
    } else if (data !== null && data !== undefined) {
      response.status(statusCode || 200).json(data);
    } else {
      response.status(statusCode || 204).end();
    }
  }

  getValidatedArgs(args: any, request: ExRequest, response: ExResponse): any[] {
    const fieldErrors: FieldErrors = {};
    const values = Object.keys(args).map(key => {
      const name = args[key].name;
      switch (args[key].in) {
        case 'request':
          return request;
        case 'request-prop':
          return this.validationService.ValidateParam(args[key], (request as any)[name], name, fieldErrors, undefined, this.minimalSwaggerConfig);
        case 'query':
          return this.validationService.ValidateParam(args[key], request.query[name], name, fieldErrors, undefined, this.minimalSwaggerConfig);
        case 'queries':
          return this.validationService.ValidateParam(args[key], request.query, name, fieldErrors, undefined, this.minimalSwaggerConfig);
        case 'path':
          return this.validationService.ValidateParam(args[key], request.params[name], name, fieldErrors, undefined, this.minimalSwaggerConfig);
        case 'header':
          return this.validationService.ValidateParam(args[key], request.header(name), name, fieldErrors, undefined, this.minimalSwaggerConfig);
        case 'body':
          return this.validationService.ValidateParam(args[key], request.body, name, fieldErrors, undefined, this.minimalSwaggerConfig);
        case 'body-prop':
          return this.validationService.ValidateParam(args[key], request.body[name], name, fieldErrors, 'body.', this.minimalSwaggerConfig);
        case 'formData': {
          const formFiles = Object.keys(args).filter(argKey => args[argKey].dataType === 'file');
          if (formFiles.length > 0) {
            const requestFiles = request.files as { [fileName: string]: Express.Multer.File[] };
            const fileArgs = this.validationService.ValidateParam(args[key], requestFiles[name], name, fieldErrors, undefined, this.minimalSwaggerConfig);
            return fileArgs.length === 1 ? fileArgs[0] : fileArgs;
          } else if (args[key].dataType === 'array' && args[key].array.dataType === 'file') {
            return this.validationService.ValidateParam(args[key], request.files, name, fieldErrors, undefined, this.minimalSwaggerConfig);
          } else {
            return this.validationService.ValidateParam(args[key], request.body[name], name, fieldErrors, undefined, this.minimalSwaggerConfig);
          }
        }
        case 'res':
          return (status: any, data: any, headers: any) => {
            this.returnHandler(response, headers, status, data);
          };
      }
    });

    if (Object.keys(fieldErrors).length > 0) {
      throw new ValidateError(fieldErrors, '');
    }
    return values;
  }
}
