export declare namespace Tsoa {
    interface Metadata {
        controllers: Controller[];
        referenceTypeMap: ReferenceTypeMap;
    }
    interface Controller {
        location: string;
        methods: Method[];
        name: string;
        path: string;
    }
    interface Method {
        deprecated?: boolean;
        description?: string;
        method: 'get' | 'post' | 'put' | 'delete' | 'options' | 'head' | 'patch';
        name: string;
        parameters: Parameter[];
        path: string;
        type: Type;
        tags?: string[];
        responses: Response[];
        security: Security[];
        summary?: string;
        isHidden: boolean;
    }
    interface Parameter {
        parameterName: string;
        description?: string;
        in: 'query' | 'header' | 'path' | 'formData' | 'body' | 'body-prop' | 'request';
        name: string;
        required?: boolean;
        type: Type;
        default?: any;
        validators: Validators;
    }
    interface Validators {
        [key: string]: {
            value?: any;
            errorMsg?: string;
        };
    }
    interface Security {
        name: string;
        scopes?: string[];
    }
    interface Response {
        description: string;
        name: string;
        schema?: Type;
        examples?: any;
    }
    interface Property {
        default?: any;
        description?: string;
        name: string;
        type: Type;
        required: boolean;
        validators: Validators;
    }
    interface Type {
        dataType: 'string' | 'double' | 'float' | 'integer' | 'long' | 'enum' | 'array' | 'datetime' | 'date' | 'buffer' | 'void' | 'object' | 'any' | 'refEnum' | 'refObject';
    }
    interface EnumerateType extends Type {
        dataType: 'enum';
        enums: string[];
    }
    interface ArrayType extends Type {
        dataType: 'array';
        elementType: Type;
    }
    interface ReferenceType extends Type {
        description?: string;
        dataType: 'refObject' | 'refEnum';
        refName: string;
        properties?: Property[];
        additionalProperties?: Type;
        enums?: string[];
    }
    interface ReferenceTypeMap {
        [refName: string]: Tsoa.ReferenceType;
    }
}
