import { Route } from '../../../src/decorators/route';
import { Body } from '../../../src/decorators/parameter';
import { Put } from '../../../src/decorators/methods';
import { TestModel } from '../testModel';
import { ModelService } from '../services/modelService';

@Route('PutTest')
export class PutTestController {
  @Put()
  public async putModel(@Body() model: TestModel): Promise<TestModel> {
    return new ModelService().getModel();
  }

  @Put('Location')
  public async putModelAtLocation(): Promise<TestModel> {
    return new ModelService().getModel();
  }

  @Put('Multi')
  public async putWithMultiReturn(): Promise<TestModel[]> {
    const model = new ModelService().getModel();
    return [model];
  }

  @Put('WithId/{id}')
  public async putWithId(id: number): Promise<TestModel> {
    return new ModelService().getModel();
  }
}
