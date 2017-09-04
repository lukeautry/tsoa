import {
  Get, Header, Internal, Query, Route,
} from '../../../src';
import { ModelService } from '../services/modelService';
import { TestModel } from '../testModel';

@Route('InternalMethodsTest')
export class InternalMethodsTestController {
  @Get('NotInternal')
  public async nonInternal(): Promise<TestModel> {
    return new ModelService().getModel();
  }

  @Internal() @Get('Internal')
  public async internal(): Promise<TestModel> {
    return new ModelService().getModel();
  }

  @Get('InternalParameters')
  public async internal(@Internal() @Query() internalQueryParameter: string,
                        @Internal() @Header() internalHeaderParameter: string,
                        @Query() notInternalQueryParameter: string,
                        @Query() notInternalHeaderParameter: string,): Promise<TestModel> {
    return new ModelService().getModel();
  }
}
