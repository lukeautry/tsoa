import { Tsoa } from './../metadataGeneration/tsoa';

export namespace TsoaRoute {
    export interface Models {
        [name: string]: ModelSchema;
    }

    export interface ModelSchema {
        enums?: string[];
        properties?: { [name: string]: PropertySchema };
        additionalProperties?: PropertySchema;
    }

    export type ValidatorSchema = Tsoa.Validators;

    export interface PropertySchema {
        dataType?: 'string' | 'boolean' | 'double' | 'float' | 'integer' | 'long' | 'enum' | 'array' | 'datetime' | 'date' | 'buffer' | 'void' | 'any' | 'object';
        ref?: string;
        required?: boolean;
        array?: PropertySchema;
        enums?: string[];
        validators?: ValidatorSchema;
        default?: any;
    }

    export interface ParameterSchema extends PropertySchema {
        name: string;
        in: string;
    }

    export interface Security {
      [key: string]: string[];
    }
}
