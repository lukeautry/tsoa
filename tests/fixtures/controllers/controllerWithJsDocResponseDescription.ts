import { Controller, Get, Route, SuccessResponse } from '@tsoa/runtime';
import { TestModel } from '../testModel';
import { ModelService } from 'fixtures/services/modelService';

@Route('Controller')
export class CustomResponseDescController extends Controller {
  @Get('descriptionWithSuccessResponse')
  @SuccessResponse(200, 'SuccessResponse description')
  public async descriptionWithSuccessResponse(): Promise<TestModel> {
    return new ModelService().getModel();
  }

  @Get('descriptionWithJsDocAnnotation')
  /**
   * @returns custom description with jsdoc annotation
   */
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
