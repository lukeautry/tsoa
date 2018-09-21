import { inject, injectable } from 'inversify';
import {
  Get, Route, Security,
} from '../../../src';
import { TestModel } from '../testModel';
import { ManagedService } from './managedService';

@injectable()
@Route('ManagedTest')
@Security('MySecurity')
export class ManagedController {

  constructor(
    @inject(ManagedService) private managedService: ManagedService,
  ) { }

  @Get()
  public async getModel(): Promise<TestModel> {
    return this.managedService.getModel();
  }
}
