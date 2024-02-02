import { Request } from '@tsoa/runtime/decorators/parameter';
import { Get } from '@tsoa/runtime/decorators/methods';
import { Route } from '@tsoa/runtime/decorators/route';
import { Security } from '@tsoa/runtime/decorators/security';
import { Response } from '@tsoa/runtime/decorators/response';

import { ErrorResponseModel, UserResponseModel } from '../../fixtures/testModel';

interface RequestWithUser {
  user?: any;
}

@Route('SecurityTest')
export class SecurityTestController {
  @Response<ErrorResponseModel>('default', 'Unexpected error')
  @Security('api_key')
  @Get()
  public async GetWithApi(@Request() request: RequestWithUser): Promise<UserResponseModel> {
    return Promise.resolve(request.user);
  }

  @Response<ErrorResponseModel>('default', 'Unexpected error')
  @Security('api_key')
  @Get('Hapi')
  public async GetWithApiForHapi(@Request() request: RequestWithUser): Promise<UserResponseModel> {
    return Promise.resolve(request.user);
  }

  @Response<ErrorResponseModel>('default', 'Unexpected error')
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

  @Response<ErrorResponseModel>('default', 'Unexpected error')
  @Security('api_key')
  @Security('slow_auth')
  @Get('ApiKeyOrTimesOut')
  public async GetWithTimedOutSecurity(@Request() request: RequestWithUser): Promise<UserResponseModel> {
    return Promise.resolve(request.user);
  }

  @Response<ErrorResponseModel>('404', 'Not Found')
  @Security('tsoa_auth', ['write:pets', 'read:pets'])
  @Security('api_key')
  @Get('OauthOrApiKey')
  public async GetWithOrSecurity(@Request() request: RequestWithUser): Promise<UserResponseModel> {
    return Promise.resolve(request.user);
  }

  @Response<ErrorResponseModel>('404', 'Not Found')
  @Security({
    api_key: [],
    tsoa_auth: ['write:pets', 'read:pets'],
  })
  @Get('OauthAndApiKey')
  public async GetWithAndSecurity(@Request() request: RequestWithUser): Promise<UserResponseModel> {
    return Promise.resolve(request.user);
  }

  @Response<ErrorResponseModel>('default', 'Unexpected error')
  @Security('api_key')
  @Get('ServerError')
  public async GetServerError(@Request() request: RequestWithUser): Promise<UserResponseModel> {
    return Promise.reject(new Error('Unexpected'));
  }

  @Response<ErrorResponseModel>('default', 'Unexpected error')
  @Security('api_key', [])
  @Security('tsoa_auth', ['write:pets', 'read:pets'])
  @Get('ServerErrorOauthOrApiKey')
  public async GetServerErrorOrAuth(@Request() request: RequestWithUser): Promise<UserResponseModel> {
    return Promise.reject(new Error('Unexpected'));
  }

  @Response<ErrorResponseModel>('default', 'Unexpected error')
  @Security({
    api_key: [],
    tsoa_auth: ['write:pets', 'read:pets'],
  })
  @Get('ServerErrorOauthAndApiKey')
  public async GetServerErrorAndAuth(@Request() request: RequestWithUser): Promise<UserResponseModel> {
    return Promise.reject(new Error('Unexpected'));
  }
}
