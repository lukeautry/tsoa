import { Get } from '../../../src/decorators/methods';
import { Request } from '../../../src/decorators/parameter';
import { Response } from '../../../src/decorators/response';
import { Route } from '../../../src/decorators/route';
import { Security } from '../../../src/decorators/security';
import { UserResponseModel, ErrorResponseModel } from '../../fixtures/testModel';

@Route('SecurityTest')
export class SecurityTestController {

  @Response<ErrorResponseModel>('default', 'Unexpected error')
  @Security('api_key')
  @Get()
  public async GetWithApi(@Request() request: any): Promise<UserResponseModel> {
    return Promise.resolve(request.user);
  }

  @Response<ErrorResponseModel>('default', 'Unexpected error')
  @Security('api_key')
  @Get('Koa')
  public async GetWithApiForKoa(@Request() ctx: any): Promise<UserResponseModel> {
    return Promise.resolve(ctx.request.user);
  }

  @Response<ErrorResponseModel>('404', 'Not Fount')
  @Security('tsoa_auth', ['write:pets', 'read:pets'])
  @Get('Oauth')
  public async GetWithSecurity(@Request() request: any): Promise<UserResponseModel> {
    return Promise.resolve(request.user);
  }
}
