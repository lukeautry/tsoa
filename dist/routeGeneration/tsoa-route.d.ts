import { Tsoa } from './../metadataGeneration/tsoa';
export declare namespace TsoaRoute {
    interface Models {
        [name: string]: ModelSchema;
    }
    interface ModelSchema {
        enums?: string[];
        properties?: {
            [name: string]: PropertySchema;
        };
        additionalProperties?: PropertySchema;
    }
    type ValidatorSchema = Tsoa.Validators;
    interface PropertySchema {
        dataType?: 'string' | 'boolean' | 'double' | 'float' | 'integer' | 'long' | 'enum' | 'array' | 'datetime' | 'date' | 'buffer' | 'void' | 'any' | 'object';
        ref?: string;
        required?: boolean;
        array?: PropertySchema;
        enums?: string[];
        validators?: ValidatorSchema;
        default?: any;
    }
    interface ParameterSchema extends PropertySchema {
        name: string;
        in: string;
    }
    interface Security {
        name: string;
        scopes?: string[];
    }
}
