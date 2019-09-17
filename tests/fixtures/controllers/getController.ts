import { Controller, Example, Get, OperationId, Query, Request, Route, SuccessResponse, Tags } from '../../../src';
import '../duplicateTestModel';
import { GenericModel, TestClassModel, TestModel, TestSubModel } from '../testModel';
import { ModelService } from './../services/modelService';

@Route('GetTest')
export class GetTestController extends Controller {
  /**
   * This is a description of the getModel method
   * this is some more text on another line
   */
  @Get()
  @SuccessResponse('200', 'Returns TestModel')
  @Example<TestModel>({
    and: { value1: 'foo', value2: 'bar' },
    boolArray: [true, false],
    boolValue: true,
    dateValue: new Date(),
    id: 1,
    modelValue: {
      email: 'test@test.com',
      id: 100,
    },
    modelsArray: new Array<TestSubModel>(),
    numberArray: [1, 2, 3],
    numberValue: 1,
    objLiteral: {
      name: 'a string',
    },
    object: {
      a: 'a',
    },
    objectArray: [
      {
        a: 'a',
      },
    ],
    optionalString: 'optional string',
    or: { value1: 'Foo' },
    referenceAnd: { value1: 'foo', value2: 'bar' },
    strLiteralArr: ['Foo', 'Bar'],
    strLiteralVal: 'Foo',
    stringArray: ['string one', 'string two'],
    stringValue: 'a string',
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
    return [new ModelService().getModel(), new ModelService().getModel(), new ModelService().getModel()];
  }

  /**
   * @param numberPathParam This is a description for numberPathParam
   * @param numberParam This is a description for numberParam
   * @isDouble numberPathParam
   * @minimum numberPathParam 1
   * @maximum numberPathParam 10
   *
   * @minLength stringPathParam 1
   * @maxLength stringPathParam 10
   *
   * @isString stringParam Custom error message
   * @minLength stringParam 3
   * @maxLength stringParam 10
   */
  @Get('{numberPathParam}/{booleanPathParam}/{stringPathParam}')
  public async getModelByParams(
    numberPathParam: number,
    stringPathParam: string,
    booleanPathParam: boolean,
    @Query() booleanParam: boolean,
    @Query() stringParam: string,
    @Query() numberParam: number,
    @Query() optionalStringParam = '',
  ): Promise<TestModel> {
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
      value: 'success',
    };
  }

  @Get('UnionTypeResponse')
  public async getUnionTypeResponse(): Promise<string | boolean> {
    return '';
  }

  @Get('Request')
  public async getRequest(@Request() request: any): Promise<TestModel> {
    const model = new ModelService().getModel();
    // set the stringValue from the request context to test successful injection
    model.stringValue = (request as any).stringValue;
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
      status: 400,
    };
  }

  @Get('GeneratesTags')
  @Tags('test', 'test-two')
  public async getGeneratesTags(): Promise<TestModel> {
    return new ModelService().getModel();
  }

  @Get('CustomOperationId')
  @OperationId('MyCustomOperationId')
  public async getCustomOperationId(): Promise<TestModel> {
    return new ModelService().getModel();
  }

  @Get('HandleBufferType')
  public async getBuffer(@Query() buffer: Buffer): Promise<Buffer> {
    return new Buffer('testbuffer');
  }

  @Get('GenericModel')
  public async getGenericModel(): Promise<GenericModel<TestModel>> {
    return {
      result: new ModelService().getModel(),
    };
  }

  @Get('GenericModelArray')
  public async getGenericModelArray(): Promise<GenericModel<TestModel[]>> {
    return {
      result: [new ModelService().getModel()],
    };
  }

  @Get('GenericPrimitive')
  public async getGenericPrimitive(): Promise<GenericModel<string>> {
    return {
      result: new ModelService().getModel().stringValue,
    };
  }

  @Get('GenericPrimitiveArray')
  public async getGenericPrimitiveArray(): Promise<GenericModel<string[]>> {
    return {
      result: new ModelService().getModel().stringArray,
    };
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
