export declare function ValidateParam(schema: any, value: any, generatedModels: any, name: string | undefined, fieldErrors: FieldErrors, parent?: string): any;
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
