import { Route, Get, Controller } from '@namecheap/tsoa-runtime';
import { RateLimitByUserId } from './rateLimitDecorator';

@Route('rateLimit')
export class RateLimitController extends Controller {
  @Get('test')
  @RateLimitByUserId(100, 60)
  public async getRateLimitedResource(): Promise<string> {
    return 'This is a rate-limited resource';
  }
}
