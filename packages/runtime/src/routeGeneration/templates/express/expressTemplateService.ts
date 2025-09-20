import { Request as ExRequest, Response as ExResponse, NextFunction as ExNext } from 'express';

import { Controller } from '../../../interfaces/controller';
import { FieldErrors } from '../../templateHelpers';
import { TsoaRoute } from '../../tsoa-route';
import { ValidateError } from '../../templateHelpers';
import { TemplateService } from '../templateService';
import { Readable } from 'node:stream';

type ExpressApiHandlerParameters = {
  methodName: string;
  controller: Controller | object;
  response: ExResponse;
  next: ExNext;
  validatedArgs: any[];
  successStatus?: number;
};

type ExpressValidationArgsParameters = {
  args: Record<string, TsoaRoute.ParameterSchema>;
  request: ExRequest;
  response: ExResponse;
};

type ExpressReturnHandlerParameters = {
  response: ExResponse;
  headers: any;
  statusCode?: number;
  data?: any;
};

export class ExpressTemplateService extends TemplateService<ExpressApiHandlerParameters, ExpressValidationArgsParameters, ExpressReturnHandlerParameters> {
  async apiHandler(params: ExpressApiHandlerParameters) {
    const { methodName, controller, response, validatedArgs, successStatus, next } = params;

    try {
      const data = await this.buildPromise(methodName, controller, validatedArgs);
      let statusCode = successStatus;
      let headers;
      if (this.isController(controller)) {
        headers = controller.getHeaders();
        statusCode = controller.getStatus() || statusCode;
      }

      this.returnHandler({ response, headers, statusCode, data });
    } catch (error) {
      return next(error);
    }
  }

  getValidatedArgs(params: ExpressValidationArgsParameters): any[] {
    const { args, request, response } = params;

    const fieldErrors: FieldErrors = {};
    const values = Object.values(args).map(param => {
      const name = param.name;
      switch (param.in) {
        case 'request':
          return request;
        case 'request-prop': {
          const descriptor = Object.getOwnPropertyDescriptor(request, name);
          const value = descriptor ? descriptor.value : undefined;
          return this.validationService.ValidateParam(param, value, name, fieldErrors, false, undefined);
        }
        case 'query':
          return this.validationService.ValidateParam(param, request.query[name], name, fieldErrors, false, undefined);
        case 'queries':
          return this.validationService.ValidateParam(param, request.query, name, fieldErrors, false, undefined);
        case 'path':
          return this.validationService.ValidateParam(param, request.params[name], name, fieldErrors, false, undefined);
        case 'header':
          return this.validationService.ValidateParam(param, request.header(name), name, fieldErrors, false, undefined);
        case 'body': {
          const bodyFieldErrors: FieldErrors = {};
          const bodyArgs = this.validationService.ValidateParam(param, request.body, name, bodyFieldErrors, true, undefined);
          Object.keys(bodyFieldErrors).forEach(key => {
            fieldErrors[key] = { message: bodyFieldErrors[key].message };
          });
          return bodyArgs;
        }
        case 'body-prop': {
          const bodyPropFieldErrors: FieldErrors = {};
          const bodyPropArgs = this.validationService.ValidateParam(param, request.body?.[name], name, bodyPropFieldErrors, true, 'body.');
          Object.keys(bodyPropFieldErrors).forEach(key => {
            fieldErrors[key] = { message: bodyPropFieldErrors[key].message };
          });
          return bodyPropArgs;
        }
        case 'formData': {
          const files = Object.values(args).filter(p => p.dataType === 'file' || (p.dataType === 'array' && p.array && p.array.dataType === 'file'));
          if ((param.dataType === 'file' || (param.dataType === 'array' && param.array && param.array.dataType === 'file')) && files.length > 0) {
            const requestFiles = request.files as { [fileName: string]: Express.Multer.File[] } | undefined;

            const fileArgs = this.validationService.ValidateParam(param, requestFiles?.[name], name, fieldErrors, false, undefined);
            if (param.dataType === 'array') {
              return fileArgs;
            }
            return Array.isArray(fileArgs) && fileArgs.length === 1 ? fileArgs[0] : fileArgs;
          }
          return this.validationService.ValidateParam(param, request.body?.[name], name, fieldErrors, false, undefined);
        }
        case 'res':
          return (status: number | undefined, data: any, headers: any) => {
            this.returnHandler({ response, headers, statusCode: status, data });
          };
      }
    });

    if (Object.keys(fieldErrors).length > 0) {
      throw new ValidateError(fieldErrors, '');
    }
    return values;
  }

  protected returnHandler(params: ExpressReturnHandlerParameters) {
    const { response, statusCode, data } = params;
    let { headers } = params;
    headers = headers || {};

    if (response.headersSent) {
      return;
    }
    Object.keys(headers).forEach((name: string) => {
      response.set(name, headers[name]);
    });

    // Check if the response is marked to be JSON
    const isJsonResponse = response.get('Content-Type')?.includes('json') || false;

    if (data && typeof data.pipe === 'function' && data.readable && typeof data._read === 'function') {
      response.status(statusCode || 200);
      (data as Readable).pipe(response);
    } else if (data !== undefined && (data !== null || isJsonResponse)) {
      // allow null response when it is a json response
      if (typeof data === 'number' || isJsonResponse) {
        // express treats number data as status code so use the json method instead
        // or if the response was marked as json then use the json so for example strings are quoted
        response.status(statusCode || 200).json(data);
      } else {
        // do not use json for every type since internally the send will invoke json if needed
        // but for string data it will not quote it, so we can send string as plain/text data
        response.status(statusCode || 200).send(data);
      }
    } else {
      response.status(statusCode || 204).end();
    }
  }
}
