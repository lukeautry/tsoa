import { Body, BodyProp, Get, Header, Path, Post, Query, Request, Route, Res, TsoaResponse, Deprecated, Queries } from '@tsoa/runtime';
import { Gender, ParameterTestModel } from '../testModel';

@Route('ParameterTest')
export class ParameterController {
  /**
   * Example test parameter
   *
   * @example firstname "name1"
   * @example firstname "name2"
   * @example lastname "lastname"
   * @example gender {
   *  "MALE": "MALE",
   *  "FEMALE": "FEMALE"
   * }
   * @example gender {
   *  "MALE": "MALE2",
   *  "FEMALE": "FEMALE2"
   * }
   * @example nicknames [
   * "name1", "name2"
   * ]
   * @example nicknames [
   *  "name2_1", "name2_2"
   * ]
   */
  @Post('Example/{firstname}')
  public async example(@Path() firstname: string, @Query() lastname: string, @Body() gender: Gender, @Query() nicknames: string[]): Promise<void> {
    return;
  }

  /**
   * Query test paramater
   *
   * @param {string} firstname Firstname description
   * @param {string} lastname Lastname description
   * @param {number} age Age description
   * @param {number} weight Weight description
   * @param {boolean} human Human description
   * @param {Gender} gender Gender description
   * @param {string[]} nicknames Nicknames description
   *
   * @isInt age
   * @isFloat weight
   *
   * @example lastname "name1"
   * @example lastname "name2"
   */
  @Get('Query')
  public async getQuery(
    @Query() firstname: string,
    @Query('last_name') lastname: string,
    @Query() age: number,
    @Query() weight: number,
    @Query() human: boolean,
    @Query() gender: Gender,
    @Query() nicknames: string[],
  ): Promise<ParameterTestModel> {
    return Promise.resolve<ParameterTestModel>({
      age,
      firstname,
      gender,
      human,
      lastname,
      nicknames,
      weight,
    });
  }

  /**
   * Queries test paramater
   *
   * @param {object} queryParams Queries description
   *
   * @example queryParams {
   *  "firstname": "first1",
   *  "lastname": "last1",
   *  "age": 1
   * }
   * @example queryParams {
   *  "firstname": "first2",
   *  "lastname": "last2",
   *  "age": 2
   * }
   */
  @Get('Queries')
  public async getQueries(@Queries() queryParams: ParameterTestModel): Promise<ParameterTestModel> {
    return Promise.resolve<ParameterTestModel>({
      age: queryParams.age,
      firstname: queryParams.firstname,
      gender: queryParams.gender,
      human: queryParams.human,
      lastname: queryParams.lastname,
      nicknames: queryParams.nicknames,
      weight: queryParams.weight,
    });
  }

  /**
   * Path test paramater
   *
   * @param {string} firstname Firstname description
   * @param {string} lastname Lastname description
   * @param {number} age Age description
   * @param {number} weight Weight description
   * @param {boolean} human Human description
   * @param {Gender} gender Gender description
   *
   * @isInt age
   * @isFloat weight
   *
   * @example lastname "name1"
   * @example lastname "name2"
   */
  @Get('Path/{firstname}/{last_name}/{age}/{weight}/{human}/{gender}')
  public async getPath(
    firstname: string,
    @Path('last_name') lastname: string,
    @Path() age: number,
    @Path() weight: number,
    @Path() human: boolean,
    @Path() gender: Gender,
  ): Promise<ParameterTestModel> {
    return Promise.resolve<ParameterTestModel>({
      age,
      firstname,
      gender,
      human,
      lastname,
      weight,
    });
  }

  /**
   * Path test paramater
   *
   * @param {string} firstname Firstname description
   * @param {string} lastname Lastname description
   * @param {number} age Age description
   * @param {number} weight Weight description
   * @param {boolean} human Human description
   * @param {Gender} gender Gender description
   *
   * @isInt age
   * @isFloat weight
   */
  @Get('PathColonDelimiter/:firstname/:last_name/:age/:weight/:human/:gender')
  public async getPathColonDelimiter(
    firstname: string,
    @Path('last_name') lastname: string,
    @Path() age: number,
    @Path() weight: number,
    @Path() human: boolean,
    @Path() gender: Gender,
  ): Promise<ParameterTestModel> {
    return Promise.resolve<ParameterTestModel>({
      age,
      firstname,
      gender,
      human,
      lastname,
      weight,
    });
  }

  /**
   * Path test paramater
   *
   * @param {string} id ID description
   */
  @Get(`PathTemplateLiteral/{id}`)
  public async getPathTemplateLiteral(@Path() id: string): Promise<void> {
    return;
  }

  /**
   * Header test paramater
   *
   * @param {string} firstname Firstname description
   * @param {string} lastname Lastname description
   * @param {number} age Age description
   * @param {number} weight Weight description
   * @param {boolean} human Human description
   * @param {Gender} gender Gender description
   *
   * @isInt age
   * @isFloat weight
   *
   * @example lastname "name1"
   * @example lastname "name2"
   */
  @Get('Header')
  public async getHeader(
    @Header() firstname: string,
    @Header('last_name') lastname: string,
    @Header() age: number,
    @Header() weight: number,
    @Header() human: boolean,
    @Header() gender: Gender,
  ): Promise<ParameterTestModel> {
    return Promise.resolve<ParameterTestModel>({
      age,
      firstname,
      gender,
      human,
      lastname,
      weight,
    });
  }

  /**
   * Request test paramater
   *
   * @param {object} request Request description
   */
  @Get('Request')
  public async getRequest(@Request() request: any): Promise<ParameterTestModel> {
    return Promise.resolve<ParameterTestModel>({
      age: Number(request.query.age),
      firstname: request.query.firstname,
      gender: request.query.gender === 'MALE' ? Gender.MALE : Gender.FEMALE,
      human: Boolean(request.query.age),
      lastname: request.query.lastname,
      weight: Number(request.query.weight),
    });
  }

  /**
   * Body test paramater
   *
   * @param {object} body Body description
   *
   * @example body {
   *  "firstname": "first1",
   *  "lastname": "last1",
   *  "age": 1
   * }
   * @example body {
   *  "firstname": "first2",
   *  "lastname": "last2",
   *  "age": 2
   * }
   */
  @Post('Body')
  public async getBody(@Body() body: ParameterTestModel): Promise<ParameterTestModel> {
    return Promise.resolve<ParameterTestModel>({
      age: body.age,
      firstname: body.firstname,
      gender: body.gender,
      human: body.human,
      lastname: body.lastname,
      weight: body.weight,
    });
  }

  /**
   * Body test paramater
   *
   * @param {object} body Body description
   */
  @Post('Bodies')
  public async getBodies(@Body() body: ParameterTestModel[]): Promise<ParameterTestModel[]> {
    const bodies = [...[body].flat()];

    return Promise.resolve<ParameterTestModel[]>(bodies);
  }

  /**
   * @param {string} firstname firstname description
   * @param {string} lastname lastname description
   * @param {number} age age description
   * @param {number} weight weight description
   * @param {boolean} human human description
   * @param {Gender} gender Gender description
   *
   * @isInt age
   * @isFloat weight
   *
   * @example firstname "name1"
   * @example firstname "name2"
   */
  @Post('BodyProps')
  public async getBodyProps(
    @BodyProp('firstname') firstname: string,
    @BodyProp('lastname') lastname: string,
    @BodyProp('age') age: number,
    @BodyProp('weight') weight: number,
    @BodyProp('human') human: boolean,
    @BodyProp('gender') gender: Gender,
  ): Promise<ParameterTestModel> {
    return Promise.resolve<ParameterTestModel>({
      age,
      firstname,
      gender,
      human,
      lastname,
      weight,
    });
  }

  @Get('ParamaterQueyAnyType')
  public async queryAnyType(@Query() name: any): Promise<void> {
    //
  }

  @Post('ParamaterQueyArray')
  public async queyArray(@Query() name: string[]): Promise<void> {
    //
  }

  @Post('ParamaterBodyAnyType')
  public async bodyAnyType(@Body() body: any): Promise<void> {
    //
  }

  @Post('ParamaterBodyArrayType')
  public async bodyArrayType(@Body() body: ParameterTestModel[]): Promise<void> {
    //
  }

  @Get('ParamaterImplicitString')
  public async implicitString(@Query() name = 'Iron man'): Promise<void> {
    //
  }

  @Get('ParamaterImplicitNumber')
  public async implicitNumber(@Query() age = 40): Promise<void> {
    //
  }

  @Get('ParamaterImplicitEnum')
  public async implicitEnum(@Query() gender = Gender.MALE): Promise<void> {
    //
  }

  @Get('ParamaterImplicitStringArray')
  public async implicitStringArray(@Query() arr = ['V1', 'V2']): Promise<void> {
    //
  }

  @Get('paramaterImplicitNumberArray')
  public async implicitNumberArray(@Query() arr = [1, 2, 3]): Promise<void> {
    //
  }

  @Get('paramaterImplicitDateTime')
  public async implicitDateTime(@Query() date = new Date('2017-01-01')): Promise<void> {
    //
  }

  /**
   * @isDate date
   */
  @Get('paramaterImplicitDate')
  public async implicitDate(@Query() date = new Date(2018, 1, 15)): Promise<void> {
    //
  }

  /**
   * @param res The alternate response
   */
  @Get('Res')
  public async getRes(@Res() res: TsoaResponse<400, { name: string }>): Promise<void> {
    res?.(400, { name: 'alternate response' });
  }

  @Post('ParameterDeprecated')
  public async postDeprecated(
    @Query('supportedSetting') supportedSetting = true,
    @Deprecated() @Query('deprecatedSetting') deprecatedSetting = false,
    /** @deprecated */ @Query('anotherDeprecatedSetting') anotherDeprecatedSetting = false,
  ): Promise<void> {
    //
  }

  @Post('Inline1')
  public async inline1(@Body() body: { requestString: string; requestNumber: number }): Promise<{ resultString: string; responseNumber: number }> {
    return { resultString: 'a', responseNumber: 1 };
  }
}
