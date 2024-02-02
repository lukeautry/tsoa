import { inject, injectable } from 'inversify';
import { Get } from '@tsoa/runtime/decorators/methods';
import { Route } from '@tsoa/runtime/decorators/route';
import { Security } from '@tsoa/runtime/decorators/security';

import { TestModel } from '../testModel';
import { ManagedService } from './managedService';

@injectable()
@Route('ManagedTest')
@Security('MySecurity')
export class ManagedController {
  constructor(@inject(ManagedService) private managedService: ManagedService) {}

  @Get()
  public async getModel(): Promise<TestModel> {
    return this.managedService.getModel();
  }
}
