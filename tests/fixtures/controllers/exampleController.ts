import { Route, Get, Path, Query, Header, Post, Body, BodyProp, Example, Res, TsoaResponse } from '@tsoa/runtime';
import { exampleResponse } from './consts';

/**
 * @example {
 *  "contry": "123",
 *  "city": "456"
 * }
 */
export interface Location {
  contry: string;
  city: string;
}

@Route('ExampleTest')
export class ExampleTestController {
  /**
   * @example path "an_example_path"
   * @example path "an_example_path2"
   */
  @Get('/path/{path}')
  public async path(@Path() path: string): Promise<void> {
    return;
  }

  /**
   * @example query "an_example_query"
   * @example query "an_example_query2"
   */
  @Get('/query')
  public async query(@Query() query: string): Promise<void> {
    return;
  }

  /**
   * @example header "aaaaaaLongCookie"
   * @example header "aaaaaaLongCookie2"
   */
  @Get('/header')
  public async header(@Header() header: string): Promise<void> {
    return;
  }

  /**
   * @example location {
   *  "contry": "1",
   *  "city": "1"
   * }
   * @example location {
   *  "contry": "2",
   *  "city": "2"
   * }
   */
  @Post('/post_body')
  public async post(@Body() location: Location): Promise<void> {
    return;
  }

  /**
   * @example prop1 "prop1_1"
   * @example prop1 "prop1_2"
   * @example prop1 "prop1_3"
   * @example prop2 "prop2_1"
   * @example prop2 "prop2_2"
   * @example prop2 "prop2_3"
   */
  @Post('/post_body_prop')
  public async postBodyProp(@BodyProp() prop1: string, @BodyProp() prop2: string): Promise<void> {
    return;
  }

  /**
   * @example location {
   *  "contry": "1",
   *  "city": "1"
   * }
   * @example location {
   *  "contry": "2",
   *  "city": "2"
   * }
   * @example s "aa0"
   * @example s "aa1"
   * @example s "aa2"
   */
  @Post('/two_parameter/{s}')
  public async twoParameter(@Body() location: Location, @Path() s: string): Promise<void> {
    return;
  }

  /**
   *
   * @example locations [
   *  {
   *    "contry": "1",
   *    "city": "1"
   *  },
   *  {
   *    "contry": "2",
   *    "city": "2"
   *  }
   * ]
   * @example locations [
   *  {
   *    "contry": "22",
   *    "city": "22"
   *  },
   *  {
   *    "contry": "33",
   *    "city": "33"
   *  }
   * ]
   */
  @Post('/array_with_object')
  public async arrayWithObject(@Body() locations: Location[]): Promise<void> {
    return;
  }

  /**
   * @param res The alternate response
   * @example res 123
   * @example res 1
   */
  @Example<string>('test 1')
  @Example<string>('test 2')
  @Get('MultiResponseExamples')
  public async responseExamples(@Res() res: TsoaResponse<400, number, { 'custom-header': string }>): Promise<string> {
    res?.(400, 123, { 'custom-header': 'hello' });
    return 'test 1';
  }

  /**
   * @param res The alternate response
   * @example res.NoSuchCountry { "errorMessage":"No such country", "errorCode": 40000 }
   * @example res. { "errorMessage":"No custom label", "errorCode": 40000 }
   * @example res "Unlabeled 1"
   * @example res "Another unlabeled one"
   * @example res.NoSuchCity {
   *     "errorMessage":"No such city",
   *     "errorCode": 40000
   * }
   * @example res { "errorMessage":"No custom label", "errorCode": 40000 }
   */
  @Get('CustomExampleLabels')
  public async customExampleLabels(@Res() res: TsoaResponse<400, number, { 'custom-header': string }>): Promise<string> {
    res?.(400, 123, { 'custom-header': 'hello' });
    return 'test 1';
  }

  /**
   * @example res 123
   * @example res 1
   */
  @Example<string>(exampleResponse)
  @Get('ResponseExampleWithImportedValue')
  public async responseExamplesWithImportedValue(): Promise<string> {
    return 'test 1';
  }
}
