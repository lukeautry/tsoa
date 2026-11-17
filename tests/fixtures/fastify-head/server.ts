import { Get, Head, Route, SuccessResponse } from '@tsoa/runtime';

@Route('head-pair')
export class FastifyHeadController {
  @Get()
  public get(): string {
    return 'get';
  }

  @Head()
  @SuccessResponse(202)
  public head(): void {}

  @Get('implicit')
  public implicit(): string {
    return 'implicit';
  }
}

@Route('parameter-head-pair')
export class FastifyGetFirstController {
  @Get('{id}')
  public get(): string {
    return 'parameter';
  }
}

@Route('parameter-head-pair')
export class FastifyHeadSecondController {
  @Head('{name}')
  @SuccessResponse(202)
  public head(): void {}
}
