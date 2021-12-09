import { Body, Consumes, Controller, Get, Produces, Path, Post, Response, Res, Route, SuccessResponse, TsoaResponse } from '@tsoa/runtime';
import { ErrorResponseModel, UserResponseModel } from '../../fixtures/testModel';

type UserRequestModel = Pick<UserResponseModel, 'name'>;

@Route('MediaTypeTest')
@Produces('application/vnd.mycompany.myapp+json')
export class MediaTypeTestController extends Controller {
  @Response<ErrorResponseModel>('404', 'Not Found')
  @Get('Default/{userId}')
  public async getDefaultProduces(@Path() userId: number): Promise<UserResponseModel> {
    this.setHeader('Content-Type', 'application/vnd.mycompany.myapp+json');
    return Promise.resolve({
      id: userId,
      name: 'foo',
    });
  }

  @SuccessResponse('202', 'Accepted')
  @Post('Default')
  async postDefaultProduces(@Body() model: UserRequestModel): Promise<UserResponseModel> {
    const body = { id: model.name.length, name: model.name };
    this.setStatus(202);
    return body;
  }

  @Get('Custom/security.txt')
  @Produces('text/plain')
  public async getCustomProduces(): Promise<string> {
    const securityTxt = 'Contact: mailto: security@example.com\nExpires: 2012-12-12T12:37:00.000Z';
    this.setHeader('Content-Type', 'text/plain');
    return securityTxt;
  }

  @Consumes('application/vnd.mycompany.myapp.v2+json')
  @SuccessResponse('202', 'Accepted', 'application/vnd.mycompany.myapp.v2+json')
  @Response<ErrorResponseModel>('400', 'Bad Request', undefined, 'application/problem+json')
  @Post('Custom')
  async postCustomProduces(@Body() model: UserRequestModel, @Res() conflictRes: TsoaResponse<409, { message: string }, { 'Content-Type': 'application/problem+json' }>): Promise<UserResponseModel> {
    if (model.name === 'bar') {
      this.setHeader('Content-Type', 'application/problem+json');
      return conflictRes?.(409, { message: 'Conflict' });
    }

    const body = { id: model.name.length, name: model.name };
    this.setStatus(202);
    this.setHeader('Content-Type', 'application/vnd.mycompany.myapp.v2+json');
    return body;
  }
}
