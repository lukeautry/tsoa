import { Get, Route } from '@tsoa/runtime';

export type Code = number;

@Route('referencesOther')
export class ReferencesOtherController {
  @Get('code')
  public async code(): Promise<Code> {
    return null as any;
  }
}
