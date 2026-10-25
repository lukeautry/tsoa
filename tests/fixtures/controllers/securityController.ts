import { Get, Request, Response, Route, Security } from '@tsoa/runtime';
import { ErrorResponseModel, UserResponseModel } from '../../fixtures/testModel';

interface RequestWithUser {
  user?: any;
}

export const optionalOrSecurityState = { calls: 0 };

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

  @Response<ErrorResponseModel>('default', 'Unexpected error')
  @Security('api_key')
  @Security({})
  @Get('ApiKeyOrAnonymous')
  public async GetWithOptionalSecurity(@Request() request: RequestWithUser): Promise<UserResponseModel> {
    return Promise.resolve(request.user ?? { id: 0, name: 'anonymous' });
  }

  @Response<ErrorResponseModel>('default', 'Unexpected error')
  @Security('api_key')
  @Security('tsoa_auth', ['write:pets', 'read:pets'])
  @Security({})
  @Get('ApiKeyOrOauthOrAnonymous')
  public async GetWithOptionalOrSecurity(@Request() request: RequestWithUser): Promise<UserResponseModel> {
    optionalOrSecurityState.calls++;
    return Promise.resolve(request.user ?? { id: 0, name: 'anonymous' });
  }

  @Response<ErrorResponseModel>('default', 'Unexpected error')
  @Security({
    api_key: [],
    tsoa_auth: ['write:pets', 'read:pets'],
  })
  @Security({})
  @Get('ApiKeyAndOauthOrAnonymous')
  public async GetWithOptionalAndSecurity(@Request() request: RequestWithUser): Promise<UserResponseModel> {
    return Promise.resolve(request.user ?? { id: 0, name: 'anonymous' });
  }

  @Response<ErrorResponseModel>('default', 'Unexpected error')
  @Security('__proto__')
  @Get('PrototypeName')
  public async GetWithPrototypeNameSecurity(@Request() request: RequestWithUser): Promise<UserResponseModel> {
    return Promise.resolve(request.user ?? { id: 0, name: 'anonymous' });
  }

  @Response<ErrorResponseModel>('default', 'Unexpected error')
  @Security({})
  @Get('AnonymousOnly')
  public async GetWithOnlyEmptySecurity(@Request() request: RequestWithUser): Promise<UserResponseModel> {
    return Promise.resolve(request.user ?? { id: 0, name: 'anonymous' });
  }
}

@Security('api_key')
@Security({})
@Route('OptionalSecurityTest')
export class OptionalSecurityTestController {
  @Response<ErrorResponseModel>('default', 'Unexpected error')
  @Get()
  public async GetWithControllerOptionalSecurity(@Request() request: RequestWithUser): Promise<UserResponseModel> {
    return Promise.resolve(request.user ?? { id: 0, name: 'anonymous' });
  }
}

@Security('api_key')
@Route('OverriddenSecurityTest')
export class OverriddenSecurityTestController {
  @Response<ErrorResponseModel>('default', 'Unexpected error')
  @Get()
  public async GetWithControllerSecurity(@Request() request: RequestWithUser): Promise<UserResponseModel> {
    return Promise.resolve(request.user);
  }

  @Response<ErrorResponseModel>('default', 'Unexpected error')
  @Security({})
  @Get('Anonymous')
  public async GetWithMethodEmptySecurity(@Request() request: RequestWithUser): Promise<UserResponseModel> {
    return Promise.resolve(request.user ?? { id: 0, name: 'anonymous' });
  }
}
