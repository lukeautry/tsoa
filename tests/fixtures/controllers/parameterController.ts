import {
  Body,
  BodyProp,
  Get,
  Header,
  Path,
  Post,
  Query,
  Request,
  Route,
} from '../../../src';
import { Gender, ParameterTestModel } from '../testModel';

@Route('ParameterTest')
export class ParameterController {
  /**
   * Get test paramater
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
   * @param {string} firstname firstname description
   * @param {string} lastname lastname description
   * @param {number} age age description
   * @param {number} weight weight description
   * @param {boolean} human human description
   * @param {Gender} gender Gender description
   *
   * @isInt age
   * @isFloat weight
   */
  @Post('BodyProps')
  public async getBodyProps(
    @BodyProp('firstname') firstname: string,
    @BodyProp('lastname') lastname: string,
    @BodyProp('age') age: number,
    @BodyProp('weight') weight: number,
    @BodyProp('human') human: boolean,
    @BodyProp('gender') gender: Gender): Promise<ParameterTestModel> {
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

}
