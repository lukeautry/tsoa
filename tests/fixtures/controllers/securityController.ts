import {
  Get, Request, Response, Route, Security,
} from '../../../src';
import * as express from 'express';
import * as koa from 'koa';
import * as hapi from 'hapi';
import { UserResponseModel, ErrorResponseModel } from '../../fixtures/testModel';

@Route('SecurityTest')
export class SecurityTestController {

  @Response<ErrorResponseModel>('default', 'Unexpected error')
  @Security('api_key')
  @Get()
  public async GetWithApi( @Request() request: express.Request): Promise<UserResponseModel> {
    return Promise.resolve(request.user);
  }

  @Response<ErrorResponseModel>('default', 'Unexpected error')
  @Security('api_key')
  @Get('Koa')
  public async GetWithApiForKoa( @Request() request: hapi.Request): Promise<UserResponseModel> {
    return Promise.resolve(request.user);
  }

  @Response<ErrorResponseModel>('404', 'Not Fount')
  @Security('tsoa_auth', ['write:pets', 'read:pets'])
  @Get('Oauth')
  public async GetWithSecurity( @Request() request: koa.Request): Promise<UserResponseModel> {
    return Promise.resolve(request.user);
  }
}
