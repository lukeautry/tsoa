import { Request as ExRequest, Response as ExResponse, NextFunction as ExNext, RequestHandler } from 'express';

import { fetchMiddlewares } from '../../../decorators/middlewares';
import { Controller } from '../../../interfaces/controller';
import { FieldErrors } from '../../templateHelpers';
import { TsoaRoute } from '../../tsoa-route';
import { ValidateError } from '../../templateHelpers';
import { TemplateService } from '../templateService';

type ExpressApiHandlerParameters = {
  methodName: string;
  controller: Controller | Object;
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
  constructor(
    readonly models: any,
    private readonly minimalSwaggerConfig: any,
    private readonly express: {
      authMiddleware?: Function;
    },
  ) {
    super(models);
  }

  async apiHandler(params: ExpressApiHandlerParameters) {
    const { methodName, controller, response, validatedArgs, successStatus, next } = params;
    const promise = this.buildPromise(methodName, controller, validatedArgs);

    try {
      const data = await Promise.resolve(promise);
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
          return this.validationService.ValidateParam(param, value, name, fieldErrors, undefined, this.minimalSwaggerConfig);
        }
        case 'query':
          return this.validationService.ValidateParam(param, request.query[name], name, fieldErrors, undefined, this.minimalSwaggerConfig);
        case 'queries':
          return this.validationService.ValidateParam(param, request.query, name, fieldErrors, undefined, this.minimalSwaggerConfig);
        case 'path':
          return this.validationService.ValidateParam(param, request.params[name], name, fieldErrors, undefined, this.minimalSwaggerConfig);
        case 'header':
          return this.validationService.ValidateParam(param, request.header(name), name, fieldErrors, undefined, this.minimalSwaggerConfig);
        case 'body':
          return this.validationService.ValidateParam(param, request.body, name, fieldErrors, undefined, this.minimalSwaggerConfig);
        case 'body-prop':
          return this.validationService.ValidateParam(param, request.body[name], name, fieldErrors, 'body.', this.minimalSwaggerConfig);
        case 'formData': {
          const files = Object.values(args).filter(param => param.dataType === 'file');
          if (param.dataType === 'file' && files.length > 0) {
            const requestFiles = request.files as { [fileName: string]: Express.Multer.File[] };
            if (requestFiles[name] === undefined) {
              return undefined;
            }

            const fileArgs = this.validationService.ValidateParam(param, requestFiles[name], name, fieldErrors, undefined, this.minimalSwaggerConfig);
            return fileArgs.length === 1 ? fileArgs[0] : fileArgs;
          } else if (param.dataType === 'array' && param.array && param.array.dataType === 'file') {
            return this.validationService.ValidateParam(param, request.files, name, fieldErrors, undefined, this.minimalSwaggerConfig);
          }
          return this.validationService.ValidateParam(param, request.body[name], name, fieldErrors, undefined, this.minimalSwaggerConfig);
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
    if (data && typeof data.pipe === 'function' && data.readable && typeof data._read === 'function') {
      response.status(statusCode || 200);
      data.pipe(response);
    } else if (data !== null && data !== undefined) {
      response.status(statusCode || 200).json(data);
    } else {
      response.status(statusCode || 204).end();
    }
  }

  middlewares(meta: {
    controller: Controller | Object;
    method: Object;
    security: TsoaRoute.Security[];
    uploadInstance?: any;
    singleUploadFileFields: Array<{ name: string }>;
    filesUploadFieldName?: string;
  }): RequestHandler[] {
    const middlewares: RequestHandler[] = [];

    if (meta.security.length > 0 && this.express.authMiddleware) {
      /** no reason only this line fail at this lint rule, disable it temporary. */
      /* eslint-disable-next-line @typescript-eslint/no-misused-promises */
      middlewares.push(this.authenticateMiddleware(meta.security));
    }

    if (meta.uploadInstance) {
      if (meta.singleUploadFileFields.length > 0) {
        middlewares.push(meta.uploadInstance.fields(meta.singleUploadFileFields));
      } else if (meta.filesUploadFieldName) {
        middlewares.push(meta.uploadInstance.array(meta.filesUploadFieldName));
      }
    }

    middlewares.push(...fetchMiddlewares<RequestHandler>(meta.controller));
    middlewares.push(...fetchMiddlewares<RequestHandler>(meta.method));

    return middlewares;
  }

  private authenticateMiddleware(security: TsoaRoute.Security[] = []) {
    return async (request: any, response: any, next: any) => {
      const failedAttempts: any[] = [];
      const pushAndRethrow = (error: any) => {
        failedAttempts.push(error);
        throw error;
      };

      const secMethodOrPromises: Array<Promise<any>> = [];
      for (const secMethod of security) {
        if (Object.keys(secMethod).length > 1) {
          const secMethodAndPromises: Array<Promise<any>> = [];

          for (const name in secMethod) {
            secMethodAndPromises.push(
              this.express.authMiddleware!(request, name, secMethod[name], response)
                .catch(pushAndRethrow)
            );
          }

          secMethodOrPromises.push(Promise.all(secMethodAndPromises).then(users => users[0]));
        } else {
          for (const name in secMethod) {
            secMethodOrPromises.push(
              this.express.authMiddleware!(request, name, secMethod[name], response)
                .catch(pushAndRethrow)
            );
          }
        }
      }

      try {
        request['user'] = await Promise.any(secMethodOrPromises);

        // Response was sent in middleware, abort
        if (response.writableEnded) {
          return;
        }

        next();
      } catch(err) {
        // Show most recent error as response
        const error = failedAttempts.pop();
        error.status = error.status || 401;

        // Response was sent in middleware, abort
        if (response.writableEnded) {
          return;
        }
        next(error);
      }
    }
  }
}
