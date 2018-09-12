import * as express from 'express';
import * as hapi from 'hapi';
import * as koa from 'koa';
import {
  Get, Request, Response, Route, Security,
} from '../../../src';
import { ErrorResponseModel, UserResponseModel } from '../../fixtures/testModel';

@Route('SecurityTest')
export class SecurityTestController {
  @Response<ErrorResponseModel>('default', 'Unexpected error')
  @Security('api_key')
  @Get()
  public async GetWithApi(@Request() request: express.Request): Promise<UserResponseModel> {
    return Promise.resolve(request.user);
  }

  @Response<ErrorResponseModel>('default', 'Unexpected error')
  @Security('api_key')
  @Get('Hapi')
  public async GetWithApiForHapi(@Request() request: hapi.Request): Promise<UserResponseModel> {
    return Promise.resolve(request.user);
  }

  @Response<ErrorResponseModel>('default', 'Unexpected error')
  @Security('api_key')
  @Get('Koa')
  public async GetWithApiForKoa(@Request() request: koa.Request): Promise<UserResponseModel> {
    return Promise.resolve(request.user);
  }

  @Response<ErrorResponseModel>('404', 'Not Found')
  @Security('tsoa_auth', ['write:pets', 'read:pets'])
  @Get('Oauth')
  public async GetWithSecurity(@Request() request: express.Request): Promise<UserResponseModel> {
    return Promise.resolve(request.user);
  }

  @Response<ErrorResponseModel>('404', 'Not Found')
  @Security('tsoa_auth', ['write:pets', 'read:pets'])
  @Security('api_key')
  @Get('OauthOrAPIkey')
  public async GetWithOrSecurity(@Request() request: express.Request): Promise<UserResponseModel> {
    return Promise.resolve(request.user);
  }

  @Response<ErrorResponseModel>('404', 'Not Found')
  @Security({
    api_key: [],
    tsoa_auth: ['write:pets', 'read:pets'],
  })
  @Get('OauthAndAPIkey')
  public async GetWithAndSecurity(@Request() request: express.Request): Promise<UserResponseModel> {
    return Promise.resolve(request.user);
  }
}
