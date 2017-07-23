export declare function ValidateParam(schema: any, value: any, generatedModels: any, name: string | undefined, fieldErrors: FieldErrors, parent?: string): any;
export declare function validateInt(name: string, numberValue: string, fieldErrors: FieldErrors, validators?: IntegerValidator, parent?: string): number | undefined;
export declare function validateFloat(name: string, numberValue: string, fieldErrors: FieldErrors, validators?: FloatValidator, parent?: string): number | undefined;
export declare function validateEnum(name: string, enumValue: string | number, fieldErrors: FieldErrors, members?: string[], parent?: string): any;
export declare function validateDate(name: string, dateValue: string, fieldErrors: FieldErrors, validators?: DateValidator, parent?: string): Date | undefined;
export declare function validateDateTime(name: string, datetimeValue: string, fieldErrors: FieldErrors, validators?: DateTimeValidator, parent?: string): Date | undefined;
export declare function validateString(name: string, stringValue: string, fieldErrors: FieldErrors, validators?: StringValidator, parent?: string): string | undefined;
export declare function validateBool(name: string, boolValue: any, fieldErrors: FieldErrors, validators?: BooleanValidator, parent?: string): any;
export declare function validateArray(name: string, arrayValue: any[], fieldErrors: FieldErrors, schema?: any, validators?: ArrayValidator, parent?: string): any[] | undefined;
export interface IntegerValidator {
    isInt?: {
        errorMsg?: string;
    };
    isLong?: {
        errorMsg?: string;
    };
    minimum?: {
        value: number;
        errorMsg?: string;
    };
    maximum?: {
        value: number;
        errorMsg?: string;
    };
}
export interface FloatValidator {
    isFloat?: {
        errorMsg?: string;
    };
    isDouble?: {
        errorMsg?: string;
    };
    minimum?: {
        value: number;
        errorMsg?: string;
    };
    maximum?: {
        value: number;
        errorMsg?: string;
    };
}
export interface DateValidator {
    isDate?: {
        errorMsg?: string;
    };
    minDate?: {
        value: string;
        errorMsg?: string;
    };
    maxDate?: {
        value: string;
        errorMsg?: string;
    };
}
export interface DateTimeValidator {
    isDateTime?: {
        errorMsg?: string;
    };
    minDate?: {
        value: string;
        errorMsg?: string;
    };
    maxDate?: {
        value: string;
        errorMsg?: string;
    };
}
export interface StringValidator {
    isString?: {
        errorMsg?: string;
    };
    minLength?: {
        value: number;
        errorMsg?: string;
    };
    maxLength?: {
        value: number;
        errorMsg?: string;
    };
    pattern?: {
        value: string;
        errorMsg?: string;
    };
}
export interface BooleanValidator {
    isArray?: {
        errorMsg?: string;
    };
}
export interface ArrayValidator {
    isArray?: {
        errorMsg?: string;
    };
    minItems?: {
        value: number;
        errorMsg?: string;
    };
    maxItems?: {
        value: number;
        errorMsg?: string;
    };
    uniqueItems?: {
        errorMsg?: string;
    };
}
export declare type Validator = IntegerValidator | FloatValidator | DateValidator | DateTimeValidator | StringValidator | BooleanValidator | ArrayValidator;
export interface FieldErrors {
    [name: string]: {
        message: string;
        value?: any;
    };
}
export interface Exception extends Error {
    status: number;
}
export declare class ValidateError implements Exception {
    fields: FieldErrors;
    message: string;
    status: number;
    name: string;
    constructor(fields: FieldErrors, message: string);
}
