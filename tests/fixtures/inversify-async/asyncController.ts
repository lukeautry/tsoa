import { inject, injectable } from 'inversify';
import { Get } from '@tsoa/runtime/decorators/methods';
import { Route } from '@tsoa/runtime/decorators/route';

import { TestModel } from '../testModel';
import { AsyncService } from './asyncService';

@injectable()
@Route('AsyncIocTest')
export class AsyncController {
  constructor(@inject(AsyncService) private managedService: AsyncService) {}

  @Get()
  public async getModel(): Promise<TestModel> {
    return this.managedService.getModel();
  }
}
