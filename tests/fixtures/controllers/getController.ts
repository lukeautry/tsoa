import { Example } from '../../../src/decorators/example';
import { Inject, Request } from '../../../src/decorators/inject';
import { Get } from '../../../src/decorators/methods';
import { ModelService } from '../services/modelService';
import { Route } from '../../../src/decorators/route';
import { Security } from '../../../src/decorators/security';
import { Response, DefaultResponse } from '../../../src/decorators/response';
import { TestModel, TestSubModel, TestClassModel } from '../testModel';
import { Tags } from '../../../src/decorators/tags';

@Route('GetTest')
export class GetTestController {
  /**
  * This is a description of the getModel method
  * this is some more text on another line
  */
  @Get()
  @Example<TestModel>({
    boolArray: [true, false],
    boolValue: true,
    id: 1,
    modelValue: {
      email: 'test@test.com',
      id: 100,
    },
    modelsArray: new Array<TestSubModel>(),
    numberArray: [1, 2, 3],
    numberValue: 1,
    optionalString: 'optional string',
    strLiteralArr: ['Foo', 'Bar'],
    strLiteralVal: 'Foo',
    stringArray: ['string one', 'string two'],
    stringValue: 'a string'
  })
  public async getModel(): Promise<TestModel> {
    return new ModelService().getModel();
  }

  @Get('Current')
  public async getCurrentModel(): Promise<TestModel> {
    return new ModelService().getModel();
  }

  @Get('ClassModel')
  public async getClassModel(): Promise<TestClassModel> {
    return new ModelService().getClassModel();
  }

  @Get('Multi')
  public async getMultipleModels(): Promise<TestModel[]> {
    return [
      new ModelService().getModel(),
      new ModelService().getModel(),
      new ModelService().getModel()
    ];
  }

  /**
  * @param numberPathParam This is a description for numberPathParam
  * @param numberParam This is a description for numberParam
  */
  @Get('{numberPathParam}/{booleanPathParam}/{stringPathParam}')
  public async getModelByParams(
    numberPathParam: number,
    stringPathParam: string,
    booleanPathParam: boolean,
    booleanParam: boolean,
    stringParam: string,
    numberParam: number,
    optionalStringParam?: string): Promise<TestModel> {
    const model = new ModelService().getModel();
    model.optionalString = optionalStringParam;
    model.numberValue = numberPathParam;
    model.boolValue = booleanPathParam;
    model.stringValue = stringPathParam;

    return model;
  }

  @Get('ResponseWithUnionTypeProperty')
  public async getResponseWithUnionTypeProperty(): Promise<Result> {
    return {
      value: 'success'
    };
  }

  @Get('UnionTypeResponse')
  public async getUnionTypeResponse(): Promise<string | boolean> {
    return '';
  }

  @Get('InjectedRequest')
  public async getInjectedRequest( @Request() request: Object): Promise<TestModel> {
    let model = new ModelService().getModel();
    // set the stringValue from the request context to test successful injection
    model.stringValue = (<any>request).stringValue;
    return model;
  }

  @Get('InjectedValue')
  public async getInjectedValue( @Inject() someValue: string): Promise<TestModel> {
    let model = new ModelService().getModel();
    // set the stringValue to the injected value to test successful injection
    model.stringValue = someValue;
    return model;
  }

  @Get('DateParam')
  public async getByDataParam(date: Date): Promise<TestModel> {
    const model = new ModelService().getModel();
    model.dateValue = date;

    return model;
  }

  @Get('ThrowsError')
  public async getThrowsError(): Promise<TestModel> {
    throw {
      message: 'error thrown',
      status: 400
    };
  }

  @Get('GeneratesTags')
  @Tags('test', 'test-two')
  public async getGeneratesTags(): Promise<TestModel> {
    return new ModelService().getModel();
  }

  @Get('HandleBufferType')
  public async getBuffer(buffer: Buffer): Promise<Buffer> {
    return new Buffer('testbuffer');
  }

  @DefaultResponse<ErrorResponse>()
  @Get('DefaultResponse')
  public async getDefaultResponse(): Promise<TestModel> {
    return new ModelService().getModel();
  }

  @Response('400', 'Bad request')
  @DefaultResponse<ErrorResponse>('Unexpected error')
  @Get('Response')
  public async getResponse(): Promise<TestModel> {
    return new ModelService().getModel();
  }

  @Security('api_key')
  @Get('ApiSecurity')
  public async getApiSecurity(): Promise<TestModel> {
    return new ModelService().getModel();
  }

  @Security('tsoa_auth', ['read:pets'])
  @Get('OauthSecurity')
  public async getOauthSecurity(): Promise<TestModel> {
    return new ModelService().getModel();
  }
}

export interface ErrorResponse {
  code: string;
  msg: string;
}

export interface CustomError extends Error {
  message: string;
  status: number;
}

export interface Result {
  value: 'success' | 'failure';
}
