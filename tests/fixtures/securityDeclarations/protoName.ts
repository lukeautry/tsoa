import { Get, Route, Security } from '@tsoa/runtime';

@Route('ProtoName')
export class ProtoNameController {
  @Security('__proto__')
  @Security({})
  @Get()
  public get(): string {
    return 'anonymous';
  }
}
