import { inject, injectable } from 'inversify';
import { Get } from '../../../src/decorators/methods';
import { Route } from '../../../src/decorators/route';
import { TestModel } from '../testModel';
import { ManagedService } from './managedService';
import { TsoaResponse } from '../../../src';

@injectable()
@Route('ManagedTest')
export class ManagedController {

  constructor(
    @inject(ManagedService) private managedService: ManagedService
  ) { }

  @Get()
  public async getModel(): Promise<TsoaResponse<TestModel>> {
    return {body: this.managedService.getModel()};
  }
}
