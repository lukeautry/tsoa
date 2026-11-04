import type { Request as ExRequest, Response as ExResponse, NextFunction as ExNext } from 'express';

import { Controller } from '../../../interfaces/controller';
import { FieldErrors } from '../../templateHelpers';
import { TsoaRoute } from '../../tsoa-route';
import { ValidateError } from '../../templateHelpers';
import { TemplateService } from '../templateService';
import { Readable, finished } from 'node:stream';

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
  next?: ExNext;
};

type ExpressReturnHandlerParameters = {
  response: ExResponse;
  headers: any;
  statusCode?: number;
  data?: any;
  next?: ExNext;
};

// body-parser leaves `{}` when a request has neither `Content-Length` nor `Transfer-Encoding`, or has `Content-Length: 0`
const isEmptyBodyPlaceholder = ({ headers, body }: ExRequest) =>
  !headers?.['transfer-encoding'] && Number(headers?.['content-length'] ?? 0) === 0 && body?.constructor === Object && Object.keys(body).length === 0;

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

      this.returnHandler({ response, headers, statusCode, data, next });
    } catch (error) {
      return next(error);
    }
  }

  getValidatedArgs(params: ExpressValidationArgsParameters): any[] {
    const { args, request, response, next } = params;

    const fieldErrors: FieldErrors = {};
    const values = this.getParameters(args).map(param => {
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
          if (param.dataType === 'binary') {
            if (!request.readableEnded) return request;
            fieldErrors[name] = { message: 'request body was already consumed by a body parser' };
            return undefined;
          }
          const body = !param.required && isEmptyBodyPlaceholder(request) ? undefined : request.body;
          const bodyFieldErrors: FieldErrors = {};
          const bodyArgs = this.validationService.ValidateParam(param, body, name, bodyFieldErrors, true, undefined);
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
          const files = this.getParameters(args).filter(p => p.dataType === 'file' || (p.dataType === 'array' && p.array && p.array.dataType === 'file'));
          if ((param.dataType === 'file' || (param.dataType === 'array' && param.array && param.array.dataType === 'file')) && files.length > 0) {
            // multer sets request.files; the runtime does not depend on its types
            const requestFiles = (request as ExRequest & { files?: Record<string, unknown[]> }).files;

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
            this.returnHandler({ response, headers, statusCode: status, data, next });
          };
      }
    });

    if (this.hasFieldErrors(fieldErrors)) {
      throw new ValidateError(fieldErrors, '');
    }
    return values;
  }

  protected returnHandler(params: ExpressReturnHandlerParameters) {
    const { response, statusCode, data, next } = params;
    let { headers } = params;
    headers = headers || {};

    if (response.headersSent) {
      return;
    }
    const restoreResponse = this.captureResponseState(response, Object.keys(headers));
    Object.keys(headers).forEach((name: string) => {
      response.set(name, headers[name]);
    });

    // Check if the response is marked to be JSON
    const isJsonResponse = response.get('Content-Type')?.includes('json') || false;

    if (data && typeof data.pipe === 'function' && data.readable && typeof data._read === 'function') {
      response.status(statusCode || 200);
      this.pipeStream(data as Readable, response, restoreResponse, next);
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

  // Restores the status and the given headers to what earlier middleware left, so an error handler does not
  // answer with the success status, content type or disposition the controller set for its stream.
  private captureResponseState(response: ExResponse, headerNames: string[]): () => void {
    const statusCode = response.statusCode;
    const headers = headerNames.map(name => [name, response.getHeader(name)] as const);
    return () => {
      response.statusCode = statusCode;
      headers.forEach(([name, value]) => (value === undefined ? response.removeHeader(name) : response.setHeader(name, value)));
    };
  }

  private pipeStream(stream: Readable, response: ExResponse, restoreResponse: () => void, next?: ExNext) {
    // stream.pipeline would destroy the response on a source error, leaving no chance to answer with an error status
    stream.on('error', (error: Error) => {
      stream.unpipe(response);
      if (!response.headersSent && next) {
        restoreResponse();
        next(error);
        return;
      }
      response.destroy();
    });
    finished(response, () => stream.destroy());
    stream.pipe(response);
  }
}
