import { Tsoa } from './../metadataGeneration/tsoa';

/**
 * For Swagger, additionalProperties is implicitly allowed. So use this function to clarify that undefined should be associated with allowing additional properties
 * @param test if this is undefined then you should interpret it as a "yes"
 */
export function isDefaultForAdditionalPropertiesAllowed(test: TsoaRoute.RefObjectModelSchema['additionalProperties']): test is undefined {
  return test === undefined;
}

export namespace TsoaRoute {
  export interface Models {
    [name: string]: ModelSchema;
  }

  export interface RefEnumModelSchema {
    dataType: 'refEnum';
    enums: string[] | number[];
  }

  export interface RefObjectModelSchema {
    dataType: 'refObject';
    properties: { [name: string]: PropertySchema };
    additionalProperties?: boolean | PropertySchema;
  }

  export type ModelSchema = RefEnumModelSchema | RefObjectModelSchema;

  export type ValidatorSchema = Tsoa.Validators;

  export interface PropertySchema {
    dataType?: Tsoa.TypeStringLiteral;
    ref?: string;
    required?: boolean;
    array?: PropertySchema;
    enums?: string[] | number[];
    subSchemas?: PropertySchema[];
    validators?: ValidatorSchema;
    default?: any;
    additionalProperties?: boolean | PropertySchema;
    nestedProperties?: { [name: string]: PropertySchema };
  }

  export interface ParameterSchema extends PropertySchema {
    name: string;
    in: string;
  }

  export interface Security {
    [key: string]: string[];
  }
}
