import { Example } from '@tsoa/runtime/decorators/example';
import { Options, Delete, Get, Patch, Post, Put } from '@tsoa/runtime/decorators/methods';
import { Tags } from '@tsoa/runtime/decorators/tags';
import { Route } from '@tsoa/runtime/decorators/route';
import { Security } from '@tsoa/runtime/decorators/security';
import { Extension } from '@tsoa/runtime/decorators/extension';
import { Controller } from '@tsoa/runtime/interfaces/controller';
import { Response, SuccessResponse } from '@tsoa/runtime/decorators/response';

import { ModelService } from '../services/modelService';
import { ErrorResponseModel, TestModel, TestModel as RenamedModel } from '../testModel';

const TEST_OBJECT_CONST = {
  unAuthCode: '401',
  unAuthText: 'Unauthorized',
  success: 'Created',
} as const;

enum TEST_ENUM_CODES {
  BAD = 400,
  NOT_FOUND = '404',
  SUCCESS = 201,
}
enum TEST_ENUM {
  BAD = 'Bad Request',
  NOT_FOUND = 'Not Found',
  SECURITY = 'JWT2',
  ADMIN = 'permission:admin',
  OWNER = 'permission:owner',
  TAG = 'EnumTag1',
}

const TEST_SEC = {
  firstSec: [],
  secondSec: [TEST_ENUM.ADMIN, TEST_ENUM.OWNER],
};

@Route('MethodTest')
export class MethodController extends Controller {
  @Options('Options')
  public async optionsMethod(): Promise<TestModel> {
    return new ModelService().getModel();
  }

  @Get('Get')
  public async getMethod(): Promise<RenamedModel> {
    return new ModelService().getModel();
  }

  @Post('Post')
  public async postMethod(): Promise<TestModel> {
    return new ModelService().getModel();
  }

  @Patch('Patch')
  public async patchMethod(): Promise<TestModel> {
    return new ModelService().getModel();
  }

  @Put('Put')
  public async putMethod(): Promise<TestModel> {
    return new ModelService().getModel();
  }

  @Delete('Delete')
  public async deleteMethod(): Promise<TestModel> {
    return new ModelService().getModel();
  }

  /**
   * method description
   */
  @Get('Description')
  public async description(): Promise<TestModel> {
    return new ModelService().getModel();
  }

  @Tags('Tag1', 'Tag2', 'Tag3')
  @Get('Tags')
  public async tags(): Promise<TestModel> {
    return new ModelService().getModel();
  }

  @Response<ErrorResponseModel>('400', 'Bad Request')
  @Response<ErrorResponseModel>('401', 'Unauthorized')
  @Response<ErrorResponseModel>('default', 'Unexpected error', { status: 500, message: 'Something went wrong!' })
  @Get('MultiResponse')
  public async multiResponse(): Promise<TestModel> {
    return new ModelService().getModel();
  }

  @Tags(TEST_ENUM.TAG)
  @Security(TEST_ENUM.SECURITY, [TEST_ENUM.ADMIN, TEST_ENUM.OWNER])
  @Security(TEST_SEC)
  @Response<ErrorResponseModel>(TEST_OBJECT_CONST.unAuthCode, TEST_OBJECT_CONST.unAuthText)
  @Response<ErrorResponseModel>(TEST_ENUM_CODES.BAD, TEST_ENUM.BAD)
  @Response<ErrorResponseModel>(TEST_ENUM_CODES.NOT_FOUND, TEST_ENUM.NOT_FOUND)
  @SuccessResponse(TEST_ENUM_CODES.SUCCESS, TEST_OBJECT_CONST.success)
  @Get('DecoratorVariousValues')
  public async decoratorVariousValues(): Promise<TestModel> {
    return new ModelService().getModel();
  }

  @SuccessResponse('201', 'Created')
  @Get('SuccessResponse')
  public async successResponse(): Promise<void> {
    this.setStatus(201);
    return Promise.resolve();
  }

  @Security('api_key')
  @Get('ApiSecurity')
  public async apiSecurity(): Promise<TestModel> {
    return new ModelService().getModel();
  }

  @Security('tsoa_auth', ['write:pets', 'read:pets'])
  @Get('OauthSecurity')
  public async oauthSecurity(): Promise<TestModel> {
    return new ModelService().getModel();
  }

  @Security('tsoa_auth', ['write:pets', 'read:pets'])
  @Security('api_key')
  @Get('OauthOrApiKeySecurity')
  public async oauthOrAPIkeySecurity(): Promise<TestModel> {
    return new ModelService().getModel();
  }

  @Security({
    api_key: [],
    tsoa_auth: ['write:pets', 'read:pets'],
  })
  @Get('OauthAndApiKeySecurity')
  public async oauthAndAPIkeySecurity(): Promise<TestModel> {
    return new ModelService().getModel();
  }

  /**
   * @deprecated
   */
  @Get('DeprecatedMethod')
  public async deprecatedMethod(): Promise<TestModel> {
    return new ModelService().getModel();
  }

  /**
   * @summary simple summary
   */
  @Get('SummaryMethod')
  public async summaryMethod(): Promise<TestModel> {
    return new ModelService().getModel();
  }

  @Get('returnAnyType')
  public async returnAnyType(): Promise<any> {
    return 'Hello Word';
  }

  @Example(undefined)
  @Get('returnAliasedVoidType')
  public async returnAliasedVoidType(): Promise<VoidAlias1> {
    return;
  }

  @Extension('x-attKey', 'attValue')
  @Extension('x-attKey1', 123)
  @Extension('x-attKey2', true)
  @Extension('x-attKey3', null)
  @Extension('x-attKey4', { test: 'testVal' })
  @Extension('x-attKey5', ['y0', 'y1', 123, true, null])
  @Extension('x-attKey6', [{ y0: 'yt0', y1: 'yt1', y2: 123, y3: true, y4: null }, { y2: 'yt2' }])
  @Extension('x-attKey7', { test: ['testVal', 123, true, null] })
  @Extension('x-attKey8', { test: { testArray: ['testVal1', true, null, ['testVal2', 'testVal3', 123, true, null]] } })
  @Get('Extension')
  public async extension(): Promise<TestModel> {
    return new ModelService().getModel();
  }
}

type VoidAlias1 = VoidAlias2;
type VoidAlias2 = void;
