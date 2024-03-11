import { Controller } from '../../interfaces/controller';
import { TsoaRoute } from '../tsoa-route';
import { ValidationService } from '../templateHelpers';

export abstract class TemplateService<ApiHandlerParameters, ValidationArgsParameters, ReturnHandlerParameters> {
  protected validationService: ValidationService;

  constructor(
    protected readonly models: TsoaRoute.Models,
  ) {
    this.validationService = new ValidationService(models);
  }

  abstract apiHandler(params: ApiHandlerParameters): Promise<any>;

  abstract getValidatedArgs(params: ValidationArgsParameters): any[];

  protected abstract returnHandler(params: ReturnHandlerParameters): any;

  protected isController(object: Controller | Object): object is Controller {
    return 'getHeaders' in object && 'getStatus' in object && 'setStatus' in object;
  }

  protected buildPromise(methodName: string, controller: Controller | Object, validatedArgs: any) {
    const prototype = Object.getPrototypeOf(controller);
    const descriptor = Object.getOwnPropertyDescriptor(prototype, methodName);
    return descriptor!.value.apply(controller, validatedArgs);
  }
}
