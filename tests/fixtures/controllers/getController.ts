import { Example } from '../../../src/decorators/example';
import { Request, Query } from '../../../src/decorators/parameter';
import { Get } from '../../../src/decorators/methods';
import { Controller } from '../../../src/interfaces/controller';
import { ModelService } from '../services/modelService';
import { Route } from '../../../src/decorators/route';
import { TestModel, TestSubModel, TestClassModel } from '../testModel';
import { Tags } from '../../../src/decorators/tags';

@Route('GetTest')
export class GetTestController extends Controller {
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
    @Query() booleanParam: boolean,
    @Query() stringParam: string,
    @Query() numberParam: number,
    @Query() optionalStringParam?: string): Promise<TestModel> {
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

  @Get('Request')
  public async getRequest(@Request() request: Object): Promise<TestModel> {
    const model = new ModelService().getModel();
    // set the stringValue from the request context to test successful injection
    model.stringValue = (<any>request).stringValue;
    return model;
  }

  @Get('DateParam')
  public async getByDataParam(@Query() date: Date): Promise<TestModel> {
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
  public async getBuffer(@Query() buffer: Buffer): Promise<Buffer> {
    return new Buffer('testbuffer');
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
