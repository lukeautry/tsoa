import { Body, BodyProp, Get, Post, Query, Route } from '@tsoa/runtime';
import { ValidateMapStringToAny, ValidateMapStringToNumber, ValidateModel } from './../testModel';

export interface ValidateDateResponse {
  minDateValue: Date;
  maxDateValue: Date;
}
export interface ValidateNumberResponse {
  minValue: number;
  maxValue: number;
}
export interface ValidateBooleanResponse {
  boolValue: boolean;
}
export interface ValidateStringResponse {
  minLength: string;
  maxLength: string;
  patternValue: string;
  quotedPatternValue: string;
}

export interface ValidateBodyPropResponse {
  name: string;
}

@Route('Validate')
export class ValidateController {
  /**
   *
   * @param {Date} minDateValue
   * @param {Date} maxDateValue
   * @isDate minDateValue
   * @minDate minDateValue 2018-01-01
   * @isDate maxDateValue
   * @maxDate maxDateValue 2016-01-01
   */
  @Get('parameter/date')
  public dateValidate(@Query() minDateValue: Date, @Query() maxDateValue: Date): Promise<ValidateDateResponse> {
    return Promise.resolve({
      maxDateValue,
      minDateValue,
    });
  }
  /**
   *
   * @param {Date} minDateValue
   * @param {Date} maxDateValue
   * @isDateTime minDateValue
   * @minDate minDateValue 2018-01-01T00:00:00
   * @isDateTime maxDateValue
   * @maxDate maxDateValue 2016-01-01T00:00:00
   */
  @Get('parameter/datetime')
  public dateTimeValidate(@Query() minDateValue: Date, @Query() maxDateValue: Date): Promise<ValidateDateResponse> {
    return Promise.resolve({
      maxDateValue,
      minDateValue,
    });
  }
  /**
   * @param {number} value
   * @param {number} value_max
   * @isInt value
   * @minimum value 5
   * @isInt value_max
   * @maximum value_max 3
   */
  @Get('parameter/integer')
  public longValidate(@Query() value: number, @Query() value_max: number): Promise<ValidateNumberResponse> {
    return Promise.resolve({
      minValue: value,
      maxValue: value_max,
    });
  }
  /**
   * @param {number} minValue
   * @param {number} maxValue
   * @isFloat minValue
   * @minimum minValue 5.5
   * @isFloat maxValue
   * @maximum maxValue 3.5
   */
  @Get('parameter/float')
  public doubleValidate(@Query() minValue: number, @Query() maxValue: number): Promise<ValidateNumberResponse> {
    return Promise.resolve({
      maxValue,
      minValue,
    });
  }
  /**
   * @param {boolean} boolValue
   * @isBoolean boolValue
   */
  @Get('parameter/boolean')
  public booleanValidate(@Query() boolValue: boolean): Promise<ValidateBooleanResponse> {
    return Promise.resolve({
      boolValue,
    });
  }
  /**
   * @param {string} minLength
   * @param {string} maxLength
   * @param {string} patternValue
   * @minLength minLength 5
   * @maxLength maxLength 3
   * @pattern patternValue ^[a-zA-Z]+$
   * @pattern quotedPatternValue `^([A-Z])(?!@)$`
   * @example quotedPatternValue "A"
   */
  @Get('parameter/string')
  public stringValidate(@Query() minLength: string, @Query() maxLength: string, @Query() patternValue: string, @Query() quotedPatternValue: string): Promise<ValidateStringResponse> {
    return Promise.resolve({
      maxLength,
      minLength,
      patternValue,
      quotedPatternValue,
    });
  }
  /**
   * @param {number} longValue
   * @isLong longValue Required long number.
   */
  @Get('parameter/customRequiredErrorMsg')
  public customRequiredErrorMsg(@Query() longValue: number): Promise<void> {
    return Promise.resolve();
  }
  /**
   * @param {number} longValue
   * @isLong longValue Invalid long number.
   */
  @Get('parameter/customInvalidErrorMsg')
  public customInvalidErrorMsg(@Query() longValue: number): Promise<void> {
    return Promise.resolve();
  }

  @Post('body')
  public bodyValidate(@Body() body: ValidateModel): Promise<ValidateModel> {
    return Promise.resolve(body);
  }

  @Post('body-prop')
  public bodyPropValidate(@BodyProp('name') name: string): Promise<ValidateBodyPropResponse> {
    return Promise.resolve({ name: `${name}-validated` });
  }

  @Post('map')
  public async getNumberBodyRequest(@Body() map: ValidateMapStringToNumber): Promise<number[]> {
    return Object.keys(map).map(key => map[key]);
  }

  @Post('mapAny')
  public async getDictionaryRequest(@Body() map: ValidateMapStringToAny): Promise<any[]> {
    return Object.keys(map).map(key => map[key]);
  }
}
