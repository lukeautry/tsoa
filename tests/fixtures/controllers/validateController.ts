import {
  Route, Get, Post, Query, Body,
  Minimum, Maximum,
  MinLength, MaxLength, Pattern,
  MinDate, MaxDate,
  IsLong, IsDouble, IsBoolean
} from './../../../src';
import {
  ValidateModel
} from './../testModel';

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
}

@Route('Validate')
export class ValidateController {
  @Get('parameter/date')
  public dateValidate(
    @Query() @MinDate('2018-01-01') minDateValue: Date,
    @Query() @MaxDate('2016-01-01') maxDateValue: Date): Promise<ValidateDateResponse> {
    return Promise.resolve({
      minDateValue,
      maxDateValue,
    });
  }
  @Get('parameter/datetime')
  public dateTimeValidate(
    @Query() @MinDate('2018-01-01T00:00:00') minDateValue: Date,
    @Query() @MaxDate('2016-01-01T00:00:00') maxDateValue: Date): Promise<ValidateDateResponse> {
    return Promise.resolve({
      minDateValue,
      maxDateValue,
    });
  }
  @Get('parameter/long')
  public longValidate(
    @Query() @IsLong() @Minimum(5) minValue: number,
    @Query() @IsLong() @Maximum(3) maxValue: number): Promise<ValidateNumberResponse> {
    return Promise.resolve({
      minValue,
      maxValue,
    });
  }
  @Get('parameter/double')
  public doubleValidate(
    @Query() @IsDouble() @Minimum(5.5) minValue?: number,
    @Query() @IsDouble() @Maximum(3.5) maxValue?: number): Promise<ValidateNumberResponse> {
    return Promise.resolve({
      minValue,
      maxValue,
    });
  }
  @Get('parameter/boolean')
  public booleanValidate(
    @Query() @IsBoolean() boolValue: boolean): Promise<ValidateBooleanResponse> {
    return Promise.resolve({
      boolValue
    });
  }
  @Get('parameter/string')
  public stringValidate(
    @Query() @MinLength(5) minLength: string,
    @Query() @MaxLength(3) maxLength: string,
    @Query() @Pattern('^[a-zA-Z]+$') patternValue: string): Promise<ValidateStringResponse> {
    return Promise.resolve({
      minLength,
      maxLength,
      patternValue,
    });
  }
  @Get('parameter/customRequiredErrorMsg')
  public customRequiredErrorMsg(
    @Query() @IsLong('Required long number.') longValue: number): Promise<void> {
    return Promise.resolve();
  }
  @Get('parameter/customInvalidErrorMsg')
  public customInvalidErrorMsg(
    @Query() @IsLong('Invalid long number.') longValue: number): Promise<void> {
    return Promise.resolve();
  }

  @Post('body')
  public bodyValidate( @Body() body: ValidateModel): Promise<ValidateModel> {
    return Promise.resolve(body);
  }
}
