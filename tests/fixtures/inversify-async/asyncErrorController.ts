import { inject, injectable } from 'inversify';
import { Get } from '@tsoa/runtime/decorators/methods';
import { Route } from '@tsoa/runtime/decorators/route';


@injectable()
@Route('AsyncIocErrorTest')
export class AsyncErrorController {
  constructor(@inject('error') private error: string) {}

  @Get()
  public async getError(): Promise<string> {
    return this.error;
  }
}
