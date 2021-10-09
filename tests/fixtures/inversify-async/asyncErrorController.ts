import { inject, injectable } from 'inversify';
import { Get, Route } from '@tsoa/runtime';

@injectable()
@Route('AsyncIocErrorTest')
export class AsyncErrorController {
  constructor(@inject('error') private error: string) {}

  @Get()
  public async getError(): Promise<string> {
    return this.error;
  }
}
