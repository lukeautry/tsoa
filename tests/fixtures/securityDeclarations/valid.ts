import { Get, Route, Security } from '@tsoa/runtime';

const scopePrefix = 'users';

@Route('ValidSecurity')
export class ValidSecurityController {
  @Security({})
  @Get('Empty')
  public empty(): string {
    return 'empty';
  }

  @Security('api_key')
  @Get('Named')
  public named(): string {
    return 'named';
  }

  @Security('api_key', ['read'])
  @Get('Scoped')
  public scoped(): string {
    return 'scoped';
  }

  @Security({ api_key: ['read'], oauth: [] })
  @Get('And')
  public and(): string {
    return 'and';
  }

  @Security('api_key', [`${scopePrefix}:read`])
  @Get('Templated')
  public templated(): string {
    return 'templated';
  }
}
