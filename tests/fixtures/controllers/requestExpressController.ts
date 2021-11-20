import { Request as ExRequest } from 'express';
import { Body, Controller, Get, Produces, Path, Post, Response, Res, Request, Route, SuccessResponse, TsoaResponse } from '@tsoa/runtime';
import { ErrorResponseModel, UserResponseModel } from '../../fixtures/testModel';

interface UserResponseV2Model {
  id: number;
  username: string;
}

interface UserResponseV3Model {
  id: number;
  nickname: string;
}

interface UserResponseV4Model {
  id: number;
  codename: string;
}

interface UserRequestV3Model {
  nickname: string;
  codename?: string;
}

interface UserRequestV4Model {
  codename: string;
  nickname?: string;
}

@Route('RequestAcceptHeaderTest')
@Produces('application/vnd.mycompany.myapp+json')
@Produces('application/vnd.mycompany.myapp.v2+json')
export class RequestAcceptHeaderTestController extends Controller {
  @Get('Default/{userId}')
  public async getDefaultProduces(@Path() userId: number, @Request() req: ExRequest): Promise<UserResponseModel | UserResponseV2Model> {
    if (req.accepts(['application/vnd.mycompany.myapp+json', 'application/json'])) {
      this.setHeader('Content-Type', 'application/vnd.mycompany.myapp+json');
      return Promise.resolve({
        id: userId,
        name: 'foo',
      } as UserResponseModel);
    } else if (req.accepts('application/vnd.mycompany.myapp.v2+json')) {
      this.setHeader('Content-Type', 'application/vnd.mycompany.myapp.v2+json');
      return Promise.resolve({
        id: userId,
        username: 'foo',
      } as UserResponseV2Model);
    }
    throw new Error('unsupported media type');
  }

  @Produces('application/vnd.mycompany.myapp+json')
  @Produces('application/vnd.mycompany.myapp.v2+json')
  @Produces('application/vnd.mycompany.myapp.v3+json')
  @Produces('application/vnd.mycompany.myapp.v4+json')
  @Get('Multi/{userId}')
  public async getMultiProduces(@Path() userId: number, @Request() req: ExRequest): Promise<UserResponseModel | UserResponseV2Model | UserResponseV3Model | UserResponseV4Model> {
    if (req.accepts(['application/vnd.mycompany.myapp+json', 'application/json'])) {
      this.setHeader('Content-Type', 'application/vnd.mycompany.myapp+json');
      return Promise.resolve({
        id: userId,
        name: 'foo',
      } as UserResponseModel);
    } else if (req.accepts('application/vnd.mycompany.myapp.v2+json')) {
      this.setHeader('Content-Type', 'application/vnd.mycompany.myapp.v2+json');
      return Promise.resolve({
        id: userId,
        username: 'foo',
      } as UserResponseV2Model);
    } else if (req.accepts('application/vnd.mycompany.myapp.v3+json')) {
      this.setHeader('Content-Type', 'application/vnd.mycompany.myapp.v3+json');
      return Promise.resolve({
        id: userId,
        nickname: 'foo',
      } as UserResponseV3Model);
    } else if (req.accepts('application/vnd.mycompany.myapp.v4+json')) {
      this.setHeader('Content-Type', 'application/vnd.mycompany.myapp.v4+json');
      return Promise.resolve({
        id: userId,
        codename: 'foo',
      } as UserResponseV4Model);
    }
    throw new Error('unsupported media type');
  }

  @SuccessResponse('202', 'Accepted', ['application/vnd.mycompany.myapp.v3+json', 'application/vnd.mycompany.myapp.v4+json'])
  @Response<ErrorResponseModel>('400', 'Bad Request', undefined, ['application/problem+json', 'application/json'])
  @Post('Multi')
  async postCustomProduces(
    @Body() model: UserRequestV3Model | UserRequestV4Model,
    @Res() conflictRes: TsoaResponse<409, { message: string }, { 'Content-Type': 'application/problem+json' }>,
    @Request() req: ExRequest,
  ): Promise<UserResponseV3Model | UserResponseV4Model> {
    const { nickname, codename } = model;
    if (nickname === 'bar' || codename === 'bar') {
      this.setHeader('Content-Type', 'application/problem+json');
      return conflictRes?.(409, { message: 'Conflict' });
    }

    if (req.headers['content-type'] === 'application/vnd.mycompany.myapp.v3+json') {
      const body = { id: model.nickname?.length, nickname: model.nickname };
      this.setStatus(202);
      this.setHeader('Content-Type', 'application/vnd.mycompany.myapp.v3+json');
      return body as UserResponseV3Model;
    } else if (req.headers['content-type'] === 'application/vnd.mycompany.myapp.v4+json') {
      const body = { id: model.codename?.length, codename: model.codename };
      this.setStatus(202);
      this.setHeader('Content-Type', 'application/vnd.mycompany.myapp.v4+json');
      return body as UserResponseV4Model;
    }
    throw new Error('unsupported media type');
  }
}
