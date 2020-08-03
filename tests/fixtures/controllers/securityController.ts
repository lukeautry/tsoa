import { Get, Request, Response, Route, Security } from '@tsoa/runtime';
import { ErrorResponseModel, UserResponseModel } from '../../fixtures/testModel';

interface RequestWithUser {
  user?: any;
}

@Route('SecurityTest')
export class SecurityTestController {
  @Response<ErrorResponseModel>('500', 'Unexpected error')
  @Security('api_key')
  @Get()
  public async GetWithApi(@Request() request: RequestWithUser): Promise<UserResponseModel> {
    return Promise.resolve(request.user);
  }

  @Response<ErrorResponseModel>('500', 'Unexpected error')
  @Security('api_key')
  @Get('Hapi')
  public async GetWithApiForHapi(@Request() request: RequestWithUser): Promise<UserResponseModel> {
    return Promise.resolve(request.user);
  }

  @Response<ErrorResponseModel>('500', 'Unexpected error')
  @Security('api_key')
  @Get('Koa')
  public async GetWithApiForKoa(@Request() request: RequestWithUser): Promise<UserResponseModel> {
    return Promise.resolve(request.user);
  }

  @Response<ErrorResponseModel>('404', 'Not Found')
  @Security('tsoa_auth', ['write:pets', 'read:pets'])
  @Get('Oauth')
  public async GetWithSecurity(@Request() request: RequestWithUser): Promise<UserResponseModel> {
    return Promise.resolve(request.user);
  }

  @Response<ErrorResponseModel>('404', 'Not Found')
  @Security('tsoa_auth', ['write:pets', 'read:pets'])
  @Security('api_key')
  @Get('OauthOrAPIkey')
  public async GetWithOrSecurity(@Request() request: RequestWithUser): Promise<UserResponseModel> {
    return Promise.resolve(request.user);
  }

  @Response<ErrorResponseModel>('404', 'Not Found')
  @Security({
    api_key: [],
    tsoa_auth: ['write:pets', 'read:pets'],
  })
  @Get('OauthAndAPIkey')
  public async GetWithAndSecurity(@Request() request: RequestWithUser): Promise<UserResponseModel> {
    return Promise.resolve(request.user);
  }

  @Response<ErrorResponseModel>('500', 'Unexpected error')
  @Security('api_key')
  @Get('ServerError')
  public async GetServerError(@Request() request: RequestWithUser): Promise<UserResponseModel> {
    return Promise.reject(new Error('Unexpected'));
  }
}
