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

  /**
   * This is a convenience type so you can check .properties on the items in the Record without having TypeScript throw a compiler error. That's because this Record can't have enums in it. If you want that, then just use the base interface
   */
  export interface RefObjectModels extends TsoaRoute.Models {
    [refNames: string]: TsoaRoute.RefObjectModelSchema;
  }

  export interface RefEnumModelSchema {
    dataType: 'refEnum';
    enums: Array<string | number>;
  }

  export interface RefObjectModelSchema {
    dataType: 'refObject';
    properties: { [name: string]: PropertySchema };
    additionalProperties?: boolean | PropertySchema;
  }

  export interface RefTypeAliasModelSchema {
    dataType: 'refAlias';
    type: PropertySchema;
  }

  export type ModelSchema = RefEnumModelSchema | RefObjectModelSchema | RefTypeAliasModelSchema;

  export type ValidatorSchema = Tsoa.Validators;

  export interface PropertySchema {
    dataType?: Tsoa.TypeStringLiteral;
    ref?: string;
    required?: boolean;
    array?: PropertySchema;
    enums?: Array<string | number | boolean | null>;
    type?: PropertySchema;
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
