///<reference path="../tsoaTestModule.d.ts" />
import { Controller, Example, Get, OperationId, Queries, Query, Request, Res, Response, Route, SuccessResponse, Tags, TsoaResponse } from '@tsoa/runtime';
import { Readable } from 'stream';
import TsoaTest from 'tsoaTest';
import '../duplicateTestModel';
import {
  GenericModel,
  GetterClass,
  GetterInterface,
  GetterInterfaceHerited,
  IndexedValue,
  IndexedValueGeneric,
  IndexedValueReference,
  IndexedValueTypeReference,
  ParenthesizedIndexedValue,
  SimpleClassWithToJSON,
  TestClassModel,
  TestModel,
  TestSubModel,
} from '../testModel';
import { ModelService } from './../services/modelService';

export type BadRequest = TsoaResponse<400, TestModel, { name: 'some_thing' }>;
export type ForbiddenRequest = TsoaResponse<401, TestModel, { name: 'another some_thing' }>;
export type BadAndInternalErrorRequest = TsoaResponse<400 | 500, TestModel, { name: 'combine' }>;
export const PathFromConstant = 'PathFromConstantValue';
export enum EnumPaths {
  PathFromEnum = 'PathFromEnumValue',
}

@Route('GetTest')
export class GetTestController extends Controller {
  /**
   * This is a description of the getModel method
   * this is some more text on another line
   */
  @Get()
  @SuccessResponse('200', 'Returns TestModel')
  // Have to give also values that are not part of the Swagger schema to get example to caller.
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
    numberArrayReadonly: [1, 2, 3],
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
    nullableStringLiteral: 'NULLABLE_LIT_1',
    undefineableUnionPrimitiveType: undefined,
    undefinedValue: undefined,
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

  @Get('GetterClass')
  public async getGetterClass(): Promise<GetterClass> {
    return new GetterClass();
  }

  @Get('SimpleClassWithToJSON')
  public async simpleClassWithToJSON(): Promise<SimpleClassWithToJSON> {
    return new SimpleClassWithToJSON('hello, world', true);
  }

  @Get('GetterInterface')
  public async getGetterInterface(): Promise<GetterInterface> {
    return {} as GetterInterface;
  }

  @Get('GetterInterfaceHerited')
  public async getGetterInterfaceHerited(): Promise<GetterInterfaceHerited> {
    return {} as GetterInterfaceHerited;
  }

  @Get('ModuleRedeclarationAndNamespace')
  public async getModuleRedeclarationAndNamespace(): Promise<TsoaTest.TestModel73> {
    return {} as TsoaTest.TestModel73;
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
  ) {
    const model = new ModelService().getModel();
    model.optionalString = optionalStringParam;
    model.numberValue = numberPathParam;
    model.boolValue = booleanPathParam;
    model.stringValue = stringPathParam;

    return model;
  }

  @Get('AllQueriesInOneObject')
  public async getAllQueriesInOneObject(@Queries() queryParams: QueryParams) {
    const model = new ModelService().getModel();
    model.optionalString = queryParams.optionalStringParam;
    model.numberValue = queryParams.numberParam;
    model.boolValue = queryParams.booleanParam;
    model.stringValue = queryParams.stringParam;

    return model;
  }

  @Get('WildcardQueries')
  public async getWildcardQueries(@Queries() queryParams: { [name: string]: any }) {
    const model = new ModelService().getModel();
    model.anyType = queryParams;

    return model;
  }

  @Get('TypedRecordQueries')
  public async getTypedRecordQueries(@Queries() queryParams: { [name: string]: number }) {
    const model = new ModelService().getModel();
    model.anyType = queryParams;

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
    model.stringValue = request.stringValue;
    return model;
  }

  @Get('DateParam')
  public async getByDataParam(@Query() date: Date): Promise<TestModel> {
    const model = new ModelService().getModel();
    model.dateValue = date;

    return model;
  }

  @Get('ThrowsError')
  @Response<CustomError>('400')
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
    return Buffer.from('testbuffer');
  }

  @Get('HandleStreamType')
  public async getStream(): Promise<Readable> {
    const readable = new Readable();
    readable._read = () => ({});
    readable.push(Buffer.from('testbuffer'));
    readable.push(null);
    return readable;
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

  @Get('Void')
  public async getVoid(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * @param res The alternate response
   */
  @Get('Res')
  public async getRes(@Res() res: TsoaResponse<400, TestModel, { 'custom-header': string }>): Promise<void> {
    res?.(400, new ModelService().getModel(), { 'custom-header': 'hello' });
  }

  /**
   * @param res The alternate response
   */
  @Get('Res_Alias')
  public async getResAlias(@Res() res: BadRequest): Promise<void> {
    res?.(400, new ModelService().getModel(), { name: 'some_thing' });
  }

  /**
   * @param res The alternate response
   * @param res Another alternate response
   */
  @Get('MultipleRes')
  public async multipleRes(@Res() res: TsoaResponse<400, TestModel, { 'custom-header': string }>, @Res() anotherRes: TsoaResponse<401, TestModel, { 'custom-header': string }>): Promise<Result> {
    res?.(400, new ModelService().getModel(), { 'custom-header': 'hello' });
    anotherRes?.(401, new ModelService().getModel(), { 'custom-header': 'another hello' });
    return {
      value: 'success',
    };
  }

  /**
   * @param res The alternate response
   */
  @Get('MultipleRes_Alias')
  public async multipleResAlias(@Res() res: BadRequest, @Res() anotherRes: ForbiddenRequest): Promise<Result> {
    res?.(400, new ModelService().getModel(), { name: 'some_thing' });
    anotherRes?.(401, new ModelService().getModel(), { name: 'another some_thing' });
    return {
      value: 'success',
    };
  }

  /**
   * @param res The alternate response
   */
  @Get('MultipleStatusCodeRes')
  public async multipleStatusCodeRes(@Res() res: TsoaResponse<400 | 500, TestModel, { 'custom-header': string }>, @Query('statusCode') statusCode: 400 | 500): Promise<void> {
    res?.(statusCode, new ModelService().getModel(), { 'custom-header': 'hello' });
  }

  /**
   * @param res The alternate response
   */
  @Get('MultipleStatusCodeRes_Alias')
  public async multipleStatusCodeResAlias(@Res() res: BadAndInternalErrorRequest, @Query('statusCode') statusCode: 400 | 500): Promise<void> {
    res?.(statusCode, new ModelService().getModel(), { name: 'combine' });
  }

  @Get(PathFromConstant)
  public async getPathFromConstantValue(): Promise<TestModel> {
    return new ModelService().getModel();
  }

  @Get(EnumPaths.PathFromEnum)
  public async getPathFromEnumValue(): Promise<TestModel> {
    return new ModelService().getModel();
  }

  @Get('IndexedValue')
  public async getIndexedValue(): Promise<IndexedValue> {
    return 'FOO';
  }

  @Get('ParenthesizedIndexedValue')
  public async getParenthesizedIndexedValue(): Promise<ParenthesizedIndexedValue> {
    return 'FOO';
  }

  @Get('IndexedValueReference')
  public async getIndexedValueReference(): Promise<IndexedValueReference> {
    return 'FOO';
  }

  @Get('IndexedValueGeneric')
  public async getIndexedValueGeneric(): Promise<IndexedValueGeneric<IndexedValueTypeReference>> {
    return 'FOO';
  }

  @Get('UnionTypeWithDefault')
  public async getUnionTypeWithDefault(@Query() unionType: 'a' | 'b' | undefined = 'a'): Promise<void> {
    return;
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

export interface QueryParams {
  numberParam: number;
  stringParam: string;
  booleanParam: boolean;
  optionalStringParam?: string;
}
