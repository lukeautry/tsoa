import { Route, Get, Path, Query, Header, Post, Body, BodyProp, Example, Res, TsoaResponse, Produces } from '@tsoa/runtime';
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

export interface Doc {
  id: number;
  description: string;
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
   * @example prop1 "prop1"
   */
  @Post('/post_body_prop_single')
  public async postBodyPropSingle(@BodyProp() prop1: string): Promise<void> {
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
   * @example res {
   *      "session": "asd.f"
   * }
   * @example res { "errorMessage":"No custom label", "errorCode": 40000 }
   */
  @Get('CustomExampleLabels')
  public async customExampleLabels(@Res() res: TsoaResponse<400, number, { 'custom-header': string }>): Promise<string> {
    res?.(400, 123, { 'custom-header': 'hello' });
    return 'test 1';
  }

  /**
   * @example requestBody.CustomLabel "CustomLabel"
   * @example requestBody. "No Custom Label"
   * @example requestBody "Unlabeled 1"
   * @example requestBody "Another unlabeled one"
   * @example requestBody.CustomLabel2 "CustomLabel2"
   * @example requestBody "Unlabeled 2"
   */
  @Post('CustomBodyExampleLabels')
  public async customBodyExampleLabels(@Body() requestBody: string): Promise<string> {
    return 'test custom body labels';
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

  /**
   * @example res 123
   * @example res 1
   */
  @Example<string>(exampleResponse, 'Custom_label')
  @Get('ResponseExampleWithLabel')
  public async responseExamplesWithLabel(): Promise<string> {
    return 'test 1';
  }

  /**
   * @example res 123
   * @example res 1
   */
  @Example<string>(exampleResponse, 'OneExample')
  @Example<string>('another example', 'AnotherExample')
  @Example<string>('no label example')
  @Get('ResponseMultiExampleWithLabel')
  public async responseMultiExampleWithLabel(): Promise<string> {
    return 'test 1';
  }

  /**
   * @example res 123
   * @example res 1
   */
  @Produces('text/plain')
  @Example<string>(exampleResponse, 'OneExample')
  @Get('ResponseExampleWithProduces')
  public async responseExampleWithProduces(): Promise<string> {
    return 'test 1';
  }

  /**
   * @example res 123
   * @example res 1
   */
  @Produces('text/plain')
  @Produces('application/json')
  @Example<string>(exampleResponse, 'OneExample')
  @Example<string>(exampleResponse, 'TwoExample')
  @Get('ResponseMultiExamplesWithProduces')
  public async responseMultiExamplesWithProduces(): Promise<string> {
    return 'test 1';
  }

  @Example<Doc>({
    id: -1,
    description: 'test doc des',
  })
  @Get('ResponseExampleWithMinusOperatorPrefixValue')
  public async responseExampleWithMinusOperatorPrefixValue(): Promise<Doc> {
    return {
      id: -1,
      description: 'test doc des',
    };
  }

  @Example<Doc>({
    id: +1,
    description: 'test doc des',
  })
  @Get('ResponseExampleWithPlusOperatorPrefixValue')
  public async responseExampleWithPlusOperatorPrefixValue(): Promise<Doc> {
    return {
      id: 1,
      description: 'test doc des',
    };
  }
}
