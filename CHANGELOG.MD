# 1.2.0
## Feature:
- Support http request validation
- CLI pretty error

## New JSDocTag for property
- `@minimum value [errorMsg]`
- `@maximum value [errorMsg]`
- `@maxLength value [errorMsg]`
- `@minLength value [errorMsg]`
- `@pattern value [errorMsg]`
- `@minDate value [errorMsg]`
- `@maxDate value [errorMsg]`
- `@minItems value [errorMsg]`
- `@maxItems value [errorMsg]`
- `@uniqueItems [errorMsg]`
- `@isString [invalidErrorMsg]`
- `@isInt [invalidErrorMsg]`
- `@isLong [invalidErrorMsg]`
- `@isFloat [invalidErrorMsg]`
- `@isDouble [invalidErrorMsg]`
- `@isDate [invalidErrorMsg]`
- `@isDateTime [invalidErrorMsg]`
- `@isBoolean [invalidErrorMsg]`
- `@isArray [invalidErrorMsg]`

```typescript
interface Model {
   /**
    * @isString Invalid error message
    */ 
    public name: string;

   /**
    * @isInt
    * @minimum 0
    * @maximum 150 maximum age 150 year.
    */ 
    public age: number;
}
```

## New JSDocTag for parameter
- `@minimum argumentName value [errorMsg]`
- `@maximum argumentName value [errorMsg]`
- `@maxLength argumentName value [errorMsg]`  for parameter
- `@minLength argumentName value [errorMsg]`  for parameter
- `@pattern argumentName value [errorMsg]`
- `@minDate argumentName value [errorMsg]`
- `@maxDate argumentName value [errorMsg]`
- `@minItems argumentName value [errorMsg]`
- `@maxItems argumentName value [errorMsg]`
- `@uniqueItems argumentName [errorMsg]`
- `@isString argumentName [invalidErrorMsg]`
- `@isInt argumentName [invalidErrorMsg]`
- `@isLong argumentName [invalidErrorMsg]`
- `@isFloat argumentName [invalidErrorMsg]`
- `@isDouble argumentName [invalidErrorMsg]`
- `@isDate argumentName [invalidErrorMsg]`
- `@isDateTime argumentName [invalidErrorMsg]`
- `@isBoolean argumentName [invalidErrorMsg]`
- `@isArray argumentName [invalidErrorMsg]`

```typescript
class DemoControllrt {
    /**
     * @isString name - Invald error message
     * @isInt age
     * @minimum age 0
     * @maximum age 150 - maximum age 150 year.
     */
     @Get()
     public hello(@Query()name: string, @Query() age: number): Promise<void> {...}
}
```

## Remove decorator
- `@IsString(errorMsg?)`
- `@IsInt(errorMsg?)`
- `@IsLong(errorMsg?)`
- `@IsFloat(errorMsg?)`
- `@IsDouble(errorMsg?)`
- `@IsDate(errorMsg?)`
- `@IsDateTime(errorMsg?)`
- `@IsArray(errorMsg?)`

# 1.0.8
- Support for Hapi middleware
- Support for Koa middleware
