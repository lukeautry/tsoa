import { inject, injectable } from 'inversify';
import { Get, Route } from '@tsoa/runtime';
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
