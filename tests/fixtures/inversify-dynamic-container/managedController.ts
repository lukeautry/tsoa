import { inject, injectable } from 'inversify';
import { Get, Route, Security } from '@namecheap/tsoa-runtime';
import { ManagedService } from './managedService';

@injectable()
@Route('ManagedTest')
@Security('MySecurity')
export class ManagedController {
  constructor(@inject(ManagedService) private managedService: ManagedService) {}

  @Get()
  public async getModel(): Promise<string> {
    return this.managedService.getPath();
  }
}
