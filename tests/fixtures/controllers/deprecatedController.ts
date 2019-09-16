import { Controller, Get, Route } from '../../../src';
import { TestModel } from '../../fixtures/testModel';
import { ModelService } from '../services/modelService';
import {Deprecated} from "../../../src/decorators/deprecated";

@Route('Controller')
export class DeprecatedController extends Controller {
  @Get('normalGetMethod')
  public async normalGetMethod(): Promise<TestModel> {
    return Promise.resolve(new ModelService().getModel());
  }

  @Get('deprecatedGetMethod')
  @Deprecated()
  public async deprecatedGetMethod(): Promise<TestModel> {
    return Promise.resolve(new ModelService().getModel());
  }
}
