import { Tsoa } from './../metadataGeneration/tsoa';

/**
 * For Swagger, additionalProperties is implicitly allowed. So use this function to clarify that undefined should be associated with allowing additional properties
 * @param test if this is undefined then you should interpret it as a "yes"
 */
export function isDefaultForAdditionalPropertiesAllowed(test: TsoaRoute.ModelSchema['additionalProperties']): test is undefined {
  return test === undefined;
}

export namespace TsoaRoute {
  export interface Models {
    [name: string]: ModelSchema;
  }

  export interface ModelSchema {
    enums?: Array<string | number>;
    properties?: { [name: string]: PropertySchema };
    additionalProperties?: boolean | PropertySchema;
  }

  export type ValidatorSchema = Tsoa.Validators;

  export interface PropertySchema {
    dataType?: Tsoa.TypeStringLiteral;
    ref?: string;
    required?: boolean;
    array?: PropertySchema;
    enums?: string[];
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
