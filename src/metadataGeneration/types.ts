export interface Metadata {
  Controllers: Controller[];
  ReferenceTypes: { [typeName: string]: ReferenceType };
}

export interface Controller {
  location: string;
  methods: Method[];
  name: string;
  path: string;
}

export interface Method {
  deprecated?: boolean;
  description?: string;
  method: string;
  name: string;
  parameters: Parameter[];
  path: string;
  type: Type;
  tags: string[];
  responses: ResponseType[];
  security?: Security;
  summary?: string;
  produces?: string[];
}

export interface Parameter {
  parameterName: string;
  description?: string;
  in: 'query' | 'header' | 'path' | 'formData' | 'body' | 'body-prop' | 'request';
  name: string;
  required?: boolean;
  type: Type;
  validators: Validators;
}

export interface Validators {
  [key: string]: { value: any, errorMsg?: string };
}

export interface Security {
  name: string;
  scopes?: string[];
}

export interface Type {
  typeName: string;
};

export interface EnumerateType extends Type {
  enumMembers: string[];
}

export interface ReferenceType extends Type {
  description?: string;
  properties: Property[];
  additionalProperties?: Type;
}

export interface ArrayType extends Type {
  elementType: Type;
}

export interface ResponseType {
  code: number;
  description: string;
  name: string;
  schema?: Type;
  examples?: any;
}

export interface Property {
  description?: string;
  name: string;
  type: Type;
  required: boolean;
  validators: Validators;
}
