import { Controller, TsoaRoute, ValidationService } from "@tsoa/runtime";

export abstract class TemplateService<PromiseHandlerParameters, ValidationArgsParameters, ReturnHandlerParameters> {
  protected validationService: ValidationService;

  constructor(
    protected readonly models: TsoaRoute.Models,
  ) {
    this.validationService = new ValidationService(models);
  }

  abstract promiseHandler(params: PromiseHandlerParameters): any;

  abstract getValidatedArgs(params: ValidationArgsParameters): any[];

  protected abstract returnHandler(params: ReturnHandlerParameters): any;
}

export function isController(object: any): object is Controller {
  return 'getHeaders' in object && 'getStatus' in object && 'setStatus' in object;
}
