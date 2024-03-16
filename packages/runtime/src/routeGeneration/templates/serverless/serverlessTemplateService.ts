import { TsoaRoute } from "../../tsoa-route";

import { Controller } from "../../../interfaces/controller";
import { FieldErrors, ValidateError } from "../../templateHelpers";
import { TemplateService } from "../templateService";

type ServerlessApiHandlerParameters = {
  methodName: string;
  controller: Controller | Object;
  validatedArgs: any[];
  successStatus?: number;
};

type ServerlessValidationArgsParameters = {
  args: Record<string, TsoaRoute.ParameterSchema>;
  event: any;
};

type ServerlessReturnHandlerParameters = {
  statusCode?: number;
  data?: any;
};

export class ServerlessTemplateService extends TemplateService<ServerlessApiHandlerParameters, ServerlessValidationArgsParameters, ServerlessReturnHandlerParameters> {
  constructor(
    readonly models: any,
    private readonly minimalSwaggerConfig: any,
  ) {
    super(models);
  }

  async apiHandler(params: ServerlessApiHandlerParameters): Promise<any> {
    const { methodName, controller, validatedArgs, successStatus } = params;
    const promise = this.buildPromise(methodName, controller, validatedArgs);

    const data = await Promise.resolve(promise);
    let statusCode = successStatus;
    // let headers;
    if (this.isController(controller)) {
      // headers = controller.getHeaders();
      statusCode = controller.getStatus() || statusCode;
    }

    return this.returnHandler({ statusCode, data });
  }

  getValidatedArgs(params: ServerlessValidationArgsParameters): any[] {
    const { args, event } = params;

    const fieldErrors: FieldErrors = {};
    const eventBody = JSON.parse(event.body);

    const values = Object.values(args).map((param) => {
      const name = param.name;
      switch (param.in) {
        case 'request':
          return event;
        case 'request-prop':
          return this.validationService.ValidateParam(param, event[name], name, fieldErrors, undefined, this.minimalSwaggerConfig);
        case 'query':
          return this.validationService.ValidateParam(param, event.queryStringParameters[name], name, fieldErrors, undefined, this.minimalSwaggerConfig);
        case 'queries':
          return this.validationService.ValidateParam(param, event.queryStringParameters, name, fieldErrors, undefined, this.minimalSwaggerConfig);
        case 'path':
          return this.validationService.ValidateParam(param, event.pathParameters[name], name, fieldErrors, undefined, this.minimalSwaggerConfig);
        case 'header':
          return this.validationService.ValidateParam(param, event.headers[name], name, fieldErrors, undefined, this.minimalSwaggerConfig);
        case 'body':
          return this.validationService.ValidateParam(param, eventBody, name, fieldErrors, undefined, this.minimalSwaggerConfig);
        case 'body-prop':
          return this.validationService.ValidateParam(param, eventBody[name], name, fieldErrors, 'body.', this.minimalSwaggerConfig);
        default:
          fieldErrors[name] = {
            message: `Unsupported parameter type "${param.in}"`,
            value: param,
          };
          return;
        }
    });

    if (Object.keys(fieldErrors).length > 0) {
      throw new ValidateError(fieldErrors, '');
    }
    return values;
  }

  protected returnHandler(params: ServerlessReturnHandlerParameters) {
    const { statusCode, data } = params;
    /*
    if (data && typeof data.pipe === 'function' && data.readable && typeof data._read === 'function') {
    } else
    */
    if (data !== null && data !== undefined) {
      return {
        statusCode: statusCode || 200,
        body: JSON.stringify(data),
      };
    } else {
      return { statusCode: statusCode || 204 };
    }
  }
}
