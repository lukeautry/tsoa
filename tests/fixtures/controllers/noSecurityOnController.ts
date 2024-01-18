import { Request } from '@tsoa/runtime/decorators/parameter';
import { Get } from '@tsoa/runtime/decorators/methods';
import { Route } from '@tsoa/runtime/decorators/route';
import { Security, NoSecurity } from '@tsoa/runtime/decorators/security';
import { Response } from '@tsoa/runtime/decorators/response';

import { ErrorResponseModel, UserResponseModel } from '../testModel';

interface RequestWithUser {
  user?: any;
}

@NoSecurity()
@Route('NoSecurity')
export class NoSecurityOnController {
  @Response<ErrorResponseModel>('default', 'Unexpected error')
  @Security('api_key')
  @Get()
  public async GetWithApi(@Request() request: RequestWithUser): Promise<UserResponseModel> {
    return Promise.resolve(request.user);
  }

  @Get('UndefinedSecurity')
  public async GetWithImplicitSecurity(@Request() request: RequestWithUser): Promise<UserResponseModel> {
    return Promise.resolve({ id: 1, name: "static" });
  }

  @NoSecurity()
  @Get('NoSecurity')
  public async GetWithNoSecurity(@Request() request: RequestWithUser): Promise<UserResponseModel> {
    return Promise.resolve(request.user);
  }
}
