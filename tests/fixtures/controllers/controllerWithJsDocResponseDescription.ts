import { Get } from '@tsoa/runtime/decorators/methods';
import { Route } from '@tsoa/runtime/decorators/route';
import { Controller } from '@tsoa/runtime/interfaces/controller';
import { SuccessResponse } from '@tsoa/runtime/decorators/response';

import { TestModel } from '../testModel';
import { ModelService } from 'fixtures/services/modelService';

@Route('Controller')
export class CustomResponseDescController extends Controller {
  @Get('descriptionWithSuccessResponse')
  @SuccessResponse(200, 'SuccessResponse description')
  public async descriptionWithSuccessResponse(): Promise<TestModel> {
    return new ModelService().getModel();
  }

  /** @returns custom description with jsdoc annotation */
  @Get('descriptionWithJsDocAnnotation')
  public async descriptionWithJsDocAnnotation(): Promise<TestModel> {
    return new ModelService().getModel();
  }

  @Get('successResponseAndJsDocAnnotation')
  /**
   * @returns custom description from jsdoc annotation
   */
  @SuccessResponse(200, 'Success Response description')
  public async successResponseAndJsDocAnnotation(): Promise<TestModel> {
    return new ModelService().getModel();
  }
}
