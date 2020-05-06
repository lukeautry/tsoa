import { Get, Request, Response, Route, Security, NoSecurity } from '../../../src';
import { ErrorResponseModel, UserResponseModel } from '../../fixtures/testModel';

interface RequestWithUser {
  user?: any;
}

@Security('tsoa_auth', ['write:pets', 'read:pets'])
@Route('NoSecurityTest')
export class NoSecurityTestController {
  @Response<ErrorResponseModel>('default', 'Unexpected error')
  @Security('api_key')
  @Get()
  public async GetWithApi(@Request() request: RequestWithUser): Promise<UserResponseModel> {
    return Promise.resolve(request.user);
  }

  @Response<ErrorResponseModel>('404', 'Not Found')
  @Get('Oauth')
  public async GetWithImplicitSecurity(@Request() request: RequestWithUser): Promise<UserResponseModel> {
    return Promise.resolve(request.user);
  }

  @Response<ErrorResponseModel>('404', 'Not Found')
  @Get('Anonymous')
  @NoSecurity()
  public async GetWithNoSecurity(@Request() request: RequestWithUser): Promise<UserResponseModel> {
    return Promise.resolve(request.user);
  }
}
