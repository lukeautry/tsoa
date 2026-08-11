import { Controller } from '../../interfaces/controller';
import { TsoaRoute } from '../tsoa-route';
import { FieldErrors, ValidationService } from '../templateHelpers';
import { AdditionalProps } from '../additionalProps';

export abstract class TemplateService<ApiHandlerParameters, ValidationArgsParameters, ReturnHandlerParameters> {
  /**
   * The generated routes build one `args` object per route at registration time and hand
   * back the very same object on every request, so the derived parameter list is cached
   * rather than rebuilt on each call.
   */
  private static readonly parameterLists = new WeakMap<object, TsoaRoute.ParameterSchema[]>();

  protected validationService: ValidationService;

  constructor(
    protected readonly models: TsoaRoute.Models,
    protected readonly config: AdditionalProps,
  ) {
    this.validationService = new ValidationService(models, config);
  }

  abstract apiHandler(params: ApiHandlerParameters): Promise<any>;

  abstract getValidatedArgs(params: ValidationArgsParameters): any[];

  protected abstract returnHandler(params: ReturnHandlerParameters): any;

  protected isController(object: Controller | object): object is Controller {
    return 'getHeaders' in object && 'getStatus' in object && 'setStatus' in object;
  }

  /**
   * The parameters of a route, in declaration order.
   */
  protected getParameters(args: Record<string, TsoaRoute.ParameterSchema>): TsoaRoute.ParameterSchema[] {
    let parameters = TemplateService.parameterLists.get(args);

    if (!parameters) {
      parameters = Object.values(args);
      TemplateService.parameterLists.set(args, parameters);
    }

    return parameters;
  }

  /**
   * Whether any field failed validation, without allocating the array of keys.
   */
  protected hasFieldErrors(fieldErrors: FieldErrors): boolean {
    for (const key in fieldErrors) {
      if (Object.prototype.hasOwnProperty.call(fieldErrors, key)) {
        return true;
      }
    }

    return false;
  }

  protected buildPromise(methodName: string, controller: Controller | object, validatedArgs: any) {
    const prototype = Object.getPrototypeOf(controller);
    const descriptor = Object.getOwnPropertyDescriptor(prototype, methodName);
    return (descriptor!.value as () => Promise<PropertyDescriptor>).apply(controller, validatedArgs);
  }
}
