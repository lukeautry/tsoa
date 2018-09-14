import { inject, injectable } from 'inversify';
import { Get } from '../../../src/decorators/methods';
import { Route } from '../../../src/decorators/route';
import { TestModel } from '../testModel';
import { ManagedService } from './managedService';

@injectable()
@Route('{routeParam}/ManagedTest')
export class ManagedController {

  constructor(
    @inject(ManagedService) private managedService: ManagedService,
  ) { }

  @Get()
  public async getModel(routeParam: string): Promise<TestModel> {
    return this.managedService.getModel();
  }
}
