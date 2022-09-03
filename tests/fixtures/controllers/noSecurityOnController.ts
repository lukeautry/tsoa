import { Get, Request, Response, Route, Security, NoSecurity } from '@tsoa/runtime';
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

  @Response<ErrorResponseModel>('404', 'Not Found')
  @Get('UndefinedSecurity')
  public async GetWithImplicitSecurity(@Request() request: RequestWithUser): Promise<UserResponseModel> {
    return Promise.resolve(request.user);
  }

  @Response<ErrorResponseModel>('404', 'Not Found')
  @Get('NoSecurity')
  @NoSecurity()
  public async GetWithNoSecurity(@Request() request: RequestWithUser): Promise<UserResponseModel> {
    return Promise.resolve(request.user);
  }
}
