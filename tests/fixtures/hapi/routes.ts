// TODO: Replace this with HAPI middleware stuff
/* tslint:disable */
import { Controller, ValidateParam, FieldErrors, ValidateError, TsoaRoute } from '../../../src';
import { RootController } from './../controllers/rootController';
import { DeleteTestController } from './../controllers/deleteController';
import { GetTestController } from './../controllers/getController';
import { PatchTestController } from './../controllers/patchController';
import { PostTestController } from './../controllers/postController';
import { PutTestController } from './../controllers/putController';
import { MethodController } from './../controllers/methodController';
import { ParameterController } from './../controllers/parameterController';
import { SecurityTestController } from './../controllers/securityController';
import { TestController } from './../controllers/testController';
import { ValidateController } from './../controllers/validateController';
import { hapiAuthentication } from './authentication';

const models: TsoaRoute.Models={
  "EnumIndexValue": {
    "enums": ["0", "1"],
  },
  "EnumNumberValue": {
    "enums": ["2", "5"],
  },
  "EnumStringValue": {
    "enums": ["VALUE_1", "VALUE_2"],
  },
  "TestModel": {
    "properties": {
      "id": { "dataType": "double", "required": true },
      "numberValue": { "dataType": "double", "required": true },
      "numberArray": { "dataType": "array", "array": { "dataType": "double" }, "required": true },
      "stringValue": { "dataType": "string", "required": true },
      "stringArray": { "dataType": "array", "array": { "dataType": "string" }, "required": true },
      "boolValue": { "dataType": "boolean", "required": true },
      "boolArray": { "dataType": "array", "array": { "dataType": "boolean" }, "required": true },
      "enumValue": { "ref": "EnumIndexValue" },
      "enumArray": { "dataType": "array", "array": { "ref": "EnumIndexValue" } },
      "enumNumberValue": { "ref": "EnumNumberValue" },
      "enumNumberArray": { "dataType": "array", "array": { "ref": "EnumNumberValue" } },
      "enumStringValue": { "ref": "EnumStringValue" },
      "enumStringArray": { "dataType": "array", "array": { "ref": "EnumStringValue" } },
      "modelValue": { "ref": "TestSubModel", "required": true },
      "modelsArray": { "dataType": "array", "array": { "ref": "TestSubModel" }, "required": true },
      "strLiteralVal": { "dataType": "enum", "enums": ["Foo", "Bar"], "required": true },
      "strLiteralArr": { "dataType": "array", "array": { "dataType": "enum", "enums": ["Foo", "Bar"] }, "required": true },
      "unionPrimetiveType": { "dataType": "enum", "enums": ["String", "1", "20", "true", "false"] },
      "dateValue": { "dataType": "datetime" },
      "optionalString": { "dataType": "string" },
      "anyType": { "dataType": "any" },
      "modelsObjectIndirect": { "ref": "TestSubModelContainer" },
      "modelsObjectIndirectNS": { "ref": "TestSubModelContainerNamespace.TestSubModelContainer" },
      "modelsObjectIndirectNS2": { "ref": "TestSubModelContainerNamespace.InnerNamespace.TestSubModelContainer2" },
      "modelsObjectIndirectNS_Alias": { "ref": "TestSubModelContainerNamespace_TestSubModelContainer" },
      "modelsObjectIndirectNS2_Alias": { "ref": "TestSubModelContainerNamespace_InnerNamespace_TestSubModelContainer2" },
      "modelsArrayIndirect": { "ref": "TestSubArrayModelContainer" },
      "modelsEnumIndirect": { "ref": "TestSubEnumModelContainer" },
      "typeAliasCase1": { "ref": "TypeAliasModelCase1" },
      "TypeAliasCase2": { "ref": "TypeAliasModelCase2" },
    },
  },
  "TestSubModel": {
    "properties": {
      "id": { "dataType": "double", "required": true },
      "email": { "dataType": "string", "required": true },
      "circular": { "ref": "TestModel" },
    },
  },
  "TestSubModel2": {
    "properties": {
      "id": { "dataType": "double", "required": true },
      "email": { "dataType": "string", "required": true },
      "circular": { "ref": "TestModel" },
      "testSubModel2": { "dataType": "boolean", "required": true },
    },
  },
  "TestSubModelContainer": {
    "additionalProperties": { "ref": "TestSubModel2" },
  },
  "TestSubModelNamespace.TestSubModelNS": {
    "properties": {
      "id": { "dataType": "double", "required": true },
      "email": { "dataType": "string", "required": true },
      "circular": { "ref": "TestModel" },
      "testSubModelNS": { "dataType": "boolean", "required": true },
    },
  },
  "TestSubModelContainerNamespace.TestSubModelContainer": {
    "additionalProperties": { "ref": "TestSubModelNamespace.TestSubModelNS" },
  },
  "TestSubModelContainerNamespace.InnerNamespace.TestSubModelContainer2": {
    "additionalProperties": { "ref": "TestSubModelNamespace.TestSubModelNS" },
  },
  "TestSubModelContainerNamespace_TestSubModelContainer": {
  },
  "TestSubModelContainerNamespace_InnerNamespace_TestSubModelContainer2": {
  },
  "TestSubArrayModelContainer": {
    "additionalProperties": { "dataType": "array", "array": { "ref": "TestSubModel2" } },
  },
  "TestSubEnumModelContainer": {
    "additionalProperties": { "ref": "EnumStringValue" },
  },
  "TypeAliasModelCase1": {
    "properties": {
      "value1": { "dataType": "string", "required": true },
      "value2": { "dataType": "string", "required": true },
    },
  },
  "TypeAliasModelCase2": {
    "properties": {
      "value1": { "dataType": "string", "required": true },
      "value2": { "dataType": "string", "required": true },
      "value3": { "dataType": "string", "required": true },
    },
  },
  "Account": {
    "properties": {
      "id": { "dataType": "double", "required": true },
    },
  },
  "TestClassModel": {
    "properties": {
      "id": { "dataType": "double", "required": true },
      "defaultValue1": { "dataType": "string", "default": "Default Value 1" },
      "account": { "ref": "Account", "required": true },
      "defaultValue2": { "dataType": "string", "default": "Default Value 2" },
      "publicStringProperty": { "dataType": "string", "required": true, "validators": { "minLength": { "value": 3 }, "maxLength": { "value": 20 }, "pattern": { "value": "^[a-zA-Z]+$" } } },
      "optionalPublicStringProperty": { "dataType": "string", "validators": { "minLength": { "value": 0 }, "maxLength": { "value": 10 } } },
      "emailPattern": { "dataType": "string", "validators": { "pattern": { "value": "^[a-zA-Z0-9_.+-]+" } } },
      "stringProperty": { "dataType": "string", "required": true },
      "typeLiterals": { "dataType": "any", "default": { "booleanTypeLiteral": {}, "numberTypeLiteral": {}, "stringTypeLiteral": {} } },
      "publicConstructorVar": { "dataType": "string", "required": true },
      "optionalPublicConstructorVar": { "dataType": "string" },
    },
  },
  "Result": {
    "properties": {
      "value": { "dataType": "enum", "enums": ["success", "failure"], "required": true },
    },
  },
  "GenericModelTestModel": {
    "properties": {
      "result": { "ref": "TestModel", "required": true },
    },
  },
  "GenericModelTestModel[]": {
    "properties": {
      "result": { "dataType": "array", "array": { "ref": "TestModel" }, "required": true },
    },
  },
  "GenericModelstring": {
    "properties": {
      "result": { "dataType": "string", "required": true },
    },
  },
  "GenericModelstring[]": {
    "properties": {
      "result": { "dataType": "array", "array": { "dataType": "string" }, "required": true },
    },
  },
  "GenericRequestTestModel": {
    "properties": {
      "name": { "dataType": "string", "required": true },
      "value": { "ref": "TestModel", "required": true },
    },
  },
  "ErrorResponseModel": {
    "properties": {
      "status": { "dataType": "double", "required": true },
      "message": { "dataType": "string", "required": true },
    },
  },
  "Gender": {
    "enums": ["MALE", "FEMALE"],
  },
  "ParameterTestModel": {
    "properties": {
      "firstname": { "dataType": "string", "required": true },
      "lastname": { "dataType": "string", "required": true },
      "age": { "dataType": "double", "required": true, "validators": { "minimum": { "value": 1 }, "maximum": { "value": 100 } } },
      "weight": { "dataType": "double", "required": true },
      "human": { "dataType": "boolean", "required": true },
      "gender": { "ref": "Gender", "required": true },
    },
  },
  "UserResponseModel": {
    "properties": {
      "id": { "dataType": "double", "required": true },
      "name": { "dataType": "string", "required": true },
    },
  },
  "ValidateDateResponse": {
    "properties": {
      "minDateValue": { "dataType": "datetime", "required": true },
      "maxDateValue": { "dataType": "datetime", "required": true },
    },
  },
  "ValidateNumberResponse": {
    "properties": {
      "minValue": { "dataType": "double", "required": true },
      "maxValue": { "dataType": "double", "required": true },
    },
  },
  "ValidateBooleanResponse": {
    "properties": {
      "boolValue": { "dataType": "boolean", "required": true },
    },
  },
  "ValidateStringResponse": {
    "properties": {
      "minLength": { "dataType": "string", "required": true },
      "maxLength": { "dataType": "string", "required": true },
      "patternValue": { "dataType": "string", "required": true },
    },
  },
  "ValidateModel": {
    "properties": {
      "floatValue": { "dataType": "float", "required": true, "validators": { "isFloat": { "errorMsg": "Invalid float error message." } } },
      "doubleValue": { "dataType": "double", "required": true, "validators": { "isDouble": { "errorMsg": "Invalid double error message." } } },
      "intValue": { "dataType": "integer", "required": true, "validators": { "isInt": { "errorMsg": "invalid integer number" } } },
      "longValue": { "dataType": "long", "required": true, "validators": { "isLong": { "errorMsg": "Custom Required long number." } } },
      "booleanValue": { "dataType": "boolean", "required": true },
      "arrayValue": { "dataType": "array", "array": { "dataType": "double" }, "required": true },
      "dateValue": { "dataType": "date", "required": true, "validators": { "isDate": { "errorMsg": "invalid ISO 8601 date format, i.e. YYYY-MM-DD" } } },
      "datetimeValue": { "dataType": "datetime", "required": true },
      "numberMax10": { "dataType": "double", "required": true, "validators": { "maximum": { "value": 10 } } },
      "numberMin5": { "dataType": "double", "required": true, "validators": { "minimum": { "value": 5 } } },
      "stringMax10Lenght": { "dataType": "string", "required": true, "validators": { "maxLength": { "value": 10 } } },
      "stringMin5Lenght": { "dataType": "string", "required": true, "validators": { "minLength": { "value": 5 } } },
      "stringPatternAZaz": { "dataType": "string", "required": true, "validators": { "pattern": { "value": "^[a-zA-Z]+$" } } },
      "arrayMax5Item": { "dataType": "array", "array": { "dataType": "double" }, "required": true, "validators": { "maxItems": { "value": 5 } } },
      "arrayMin2Item": { "dataType": "array", "array": { "dataType": "double" }, "required": true, "validators": { "minItems": { "value": 2 } } },
      "arrayUniqueItem": { "dataType": "array", "array": { "dataType": "double" }, "required": true, "validators": { "uniqueItems": {} } },
    },
  },
  "ValidateMapStringToNumber": {
    "additionalProperties": { "dataType": "double" },
  },
};

export function RegisterRoutes(server: any) {
  server.route({
    method: 'get',
    path: '/v1',
    options: {
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new RootController();

        const promise=controller.rootHandler.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/rootControllerMethodWithPath',
    options: {
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new RootController();

        const promise=controller.rootControllerMethodWithPath.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'delete',
    path: '/v1/DeleteTest',
    options: {
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new DeleteTestController();

        const promise=controller.deleteWithReturnValue.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'delete',
    path: '/v1/DeleteTest/Current',
    options: {
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new DeleteTestController();

        const promise=controller.deleteCurrent.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'delete',
    path: '/v1/DeleteTest/{numberPathParam}/{booleanPathParam}/{stringPathParam}',
    options: {
      handler: (request: any, h: any) => {
        const args={
          numberPathParam: { "in": "path", "name": "numberPathParam", "required": true, "dataType": "double" },
          stringPathParam: { "in": "path", "name": "stringPathParam", "required": true, "dataType": "string" },
          booleanPathParam: { "in": "path", "name": "booleanPathParam", "required": true, "dataType": "boolean" },
          booleanParam: { "in": "query", "name": "booleanParam", "required": true, "dataType": "boolean" },
          stringParam: { "in": "query", "name": "stringParam", "required": true, "dataType": "string" },
          numberParam: { "in": "query", "name": "numberParam", "required": true, "dataType": "double" },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new DeleteTestController();

        const promise=controller.getModelByParams.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest',
    options: {
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new GetTestController();

        const promise=controller.getModel.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/Current',
    options: {
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new GetTestController();

        const promise=controller.getCurrentModel.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/ClassModel',
    options: {
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new GetTestController();

        const promise=controller.getClassModel.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/Multi',
    options: {
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new GetTestController();

        const promise=controller.getMultipleModels.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/{numberPathParam}/{booleanPathParam}/{stringPathParam}',
    options: {
      handler: (request: any, h: any) => {
        const args={
          numberPathParam: { "in": "path", "name": "numberPathParam", "required": true, "dataType": "double", "validators": { "isDouble": { "errorMsg": "numberPathParam" }, "minimum": { "value": 1 }, "maximum": { "value": 10 } } },
          stringPathParam: { "in": "path", "name": "stringPathParam", "required": true, "dataType": "string", "validators": { "minLength": { "value": 1 }, "maxLength": { "value": 10 } } },
          booleanPathParam: { "in": "path", "name": "booleanPathParam", "required": true, "dataType": "boolean" },
          booleanParam: { "in": "query", "name": "booleanParam", "required": true, "dataType": "boolean" },
          stringParam: { "in": "query", "name": "stringParam", "required": true, "dataType": "string", "validators": { "isString": { "errorMsg": "Custom error message" }, "minLength": { "value": 3 }, "maxLength": { "value": 10 } } },
          numberParam: { "in": "query", "name": "numberParam", "required": true, "dataType": "double" },
          optionalStringParam: { "default": "", "in": "query", "name": "optionalStringParam", "dataType": "string" },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new GetTestController();

        const promise=controller.getModelByParams.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/ResponseWithUnionTypeProperty',
    options: {
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new GetTestController();

        const promise=controller.getResponseWithUnionTypeProperty.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/UnionTypeResponse',
    options: {
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new GetTestController();

        const promise=controller.getUnionTypeResponse.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/Request',
    options: {
      handler: (request: any, h: any) => {
        const args={
          request: { "in": "request", "name": "request", "required": true, "dataType": "object" },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new GetTestController();

        const promise=controller.getRequest.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/DateParam',
    options: {
      handler: (request: any, h: any) => {
        const args={
          date: { "in": "query", "name": "date", "required": true, "dataType": "datetime" },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new GetTestController();

        const promise=controller.getByDataParam.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/ThrowsError',
    options: {
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new GetTestController();

        const promise=controller.getThrowsError.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/GeneratesTags',
    options: {
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new GetTestController();

        const promise=controller.getGeneratesTags.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/CustomOperationId',
    options: {
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new GetTestController();

        const promise=controller.getCustomOperationId.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/HandleBufferType',
    options: {
      handler: (request: any, h: any) => {
        const args={
          buffer: { "in": "query", "name": "buffer", "required": true, "dataType": "buffer" },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new GetTestController();

        const promise=controller.getBuffer.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/GenericModel',
    options: {
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new GetTestController();

        const promise=controller.getGenericModel.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/GenericModelArray',
    options: {
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new GetTestController();

        const promise=controller.getGenericModelArray.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/GenericPrimitive',
    options: {
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new GetTestController();

        const promise=controller.getGenericPrimitive.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/GenericPrimitiveArray',
    options: {
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new GetTestController();

        const promise=controller.getGenericPrimitiveArray.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'patch',
    path: '/v1/PatchTest',
    options: {
      handler: (request: any, h: any) => {
        const args={
          model: { "in": "body", "name": "model", "required": true, "ref": "TestModel" },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new PatchTestController();

        const promise=controller.patchModel.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'patch',
    path: '/v1/PatchTest/Location',
    options: {
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new PatchTestController();

        const promise=controller.patchModelAtLocation.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'patch',
    path: '/v1/PatchTest/Multi',
    options: {
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new PatchTestController();

        const promise=controller.patchWithMultiReturn.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'patch',
    path: '/v1/PatchTest/WithId/{id}',
    options: {
      handler: (request: any, h: any) => {
        const args={
          id: { "in": "path", "name": "id", "required": true, "dataType": "double" },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new PatchTestController();

        const promise=controller.patchWithId.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'post',
    path: '/v1/PostTest',
    options: {
      handler: (request: any, h: any) => {
        const args={
          model: { "in": "body", "name": "model", "required": true, "ref": "TestModel" },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new PostTestController();

        const promise=controller.postModel.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'patch',
    path: '/v1/PostTest',
    options: {
      handler: (request: any, h: any) => {
        const args={
          model: { "in": "body", "name": "model", "required": true, "ref": "TestModel" },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new PostTestController();

        const promise=controller.updateModel.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'post',
    path: '/v1/PostTest/WithDifferentReturnCode',
    options: {
      handler: (request: any, h: any) => {
        const args={
          model: { "in": "body", "name": "model", "required": true, "ref": "TestModel" },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new PostTestController();

        const promise=controller.postWithDifferentReturnCode.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'post',
    path: '/v1/PostTest/WithClassModel',
    options: {
      handler: (request: any, h: any) => {
        const args={
          model: { "in": "body", "name": "model", "required": true, "ref": "TestClassModel" },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new PostTestController();

        const promise=controller.postClassModel.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'post',
    path: '/v1/PostTest/Location',
    options: {
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new PostTestController();

        const promise=controller.postModelAtLocation.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'post',
    path: '/v1/PostTest/Multi',
    options: {
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new PostTestController();

        const promise=controller.postWithMultiReturn.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'post',
    path: '/v1/PostTest/WithId/{id}',
    options: {
      handler: (request: any, h: any) => {
        const args={
          id: { "in": "path", "name": "id", "required": true, "dataType": "double" },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new PostTestController();

        const promise=controller.postWithId.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'post',
    path: '/v1/PostTest/WithBodyAndQueryParams',
    options: {
      handler: (request: any, h: any) => {
        const args={
          model: { "in": "body", "name": "model", "required": true, "ref": "TestModel" },
          query: { "in": "query", "name": "query", "required": true, "dataType": "string" },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new PostTestController();

        const promise=controller.postWithBodyAndQueryParams.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'post',
    path: '/v1/PostTest/GenericBody',
    options: {
      handler: (request: any, h: any) => {
        const args={
          genericReq: { "in": "body", "name": "genericReq", "required": true, "ref": "GenericRequestTestModel" },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new PostTestController();

        const promise=controller.getGenericRequest.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'put',
    path: '/v1/PutTest',
    options: {
      handler: (request: any, h: any) => {
        const args={
          model: { "in": "body", "name": "model", "required": true, "ref": "TestModel" },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new PutTestController();

        const promise=controller.putModel.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'put',
    path: '/v1/PutTest/Location',
    options: {
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new PutTestController();

        const promise=controller.putModelAtLocation.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'put',
    path: '/v1/PutTest/Multi',
    options: {
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new PutTestController();

        const promise=controller.putWithMultiReturn.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'put',
    path: '/v1/PutTest/WithId/{id}',
    options: {
      handler: (request: any, h: any) => {
        const args={
          id: { "in": "path", "name": "id", "required": true, "dataType": "double" },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new PutTestController();

        const promise=controller.putWithId.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/MethodTest/Get',
    options: {
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new MethodController();

        const promise=controller.getMethod.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'post',
    path: '/v1/MethodTest/Post',
    options: {
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new MethodController();

        const promise=controller.postMethod.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'patch',
    path: '/v1/MethodTest/Patch',
    options: {
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new MethodController();

        const promise=controller.patchMethod.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'put',
    path: '/v1/MethodTest/Put',
    options: {
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new MethodController();

        const promise=controller.putMethod.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'delete',
    path: '/v1/MethodTest/Delete',
    options: {
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new MethodController();

        const promise=controller.deleteMethod.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/MethodTest/Description',
    options: {
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new MethodController();

        const promise=controller.description.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/MethodTest/Tags',
    options: {
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new MethodController();

        const promise=controller.tags.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/MethodTest/MultiResponse',
    options: {
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new MethodController();

        const promise=controller.multiResponse.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/MethodTest/SuccessResponse',
    options: {
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new MethodController();

        const promise=controller.successResponse.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/MethodTest/ApiSecurity',
    options: {
      pre: [
        {
          method: authenticateMiddleware([{ "api_key": [] }]),
          assign: "user"
        }
      ],
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new MethodController();

        const promise=controller.apiSecurity.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/MethodTest/OauthSecurity',
    options: {
      pre: [
        {
          method: authenticateMiddleware([{ "tsoa_auth": ["write:pets", "read:pets"] }]),
          assign: "user"
        }
      ],
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new MethodController();

        const promise=controller.oauthSecurity.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/MethodTest/OauthOrAPIkeySecurity',
    options: {
      pre: [
        {
          method: authenticateMiddleware([{ "tsoa_auth": ["write:pets", "read:pets"] }, { "api_key": [] }]),
          assign: "user"
        }
      ],
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new MethodController();

        const promise=controller.oauthOrAPIkeySecurity.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/MethodTest/OauthAndAPIkeySecurity',
    options: {
      pre: [
        {
          method: authenticateMiddleware([{ "api_key": [], "tsoa_auth": ["write:pets", "read:pets"] }]),
          assign: "user"
        }
      ],
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new MethodController();

        const promise=controller.oauthAndAPIkeySecurity.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/MethodTest/DeprecatedMethod',
    options: {
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new MethodController();

        const promise=controller.deprecatedMethod.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/MethodTest/SummaryMethod',
    options: {
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new MethodController();

        const promise=controller.summaryMethod.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/MethodTest/returnAnyType',
    options: {
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new MethodController();

        const promise=controller.returnAnyType.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/ParameterTest/Query',
    options: {
      handler: (request: any, h: any) => {
        const args={
          firstname: { "in": "query", "name": "firstname", "required": true, "dataType": "string" },
          lastname: { "in": "query", "name": "last_name", "required": true, "dataType": "string" },
          age: { "in": "query", "name": "age", "required": true, "dataType": "integer", "validators": { "isInt": { "errorMsg": "age" } } },
          weight: { "in": "query", "name": "weight", "required": true, "dataType": "float", "validators": { "isFloat": { "errorMsg": "weight" } } },
          human: { "in": "query", "name": "human", "required": true, "dataType": "boolean" },
          gender: { "in": "query", "name": "gender", "required": true, "dataType": "enum", "enums": ["MALE", "FEMALE"] },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new ParameterController();

        const promise=controller.getQuery.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/ParameterTest/Path/{firstname}/{last_name}/{age}/{weight}/{human}/{gender}',
    options: {
      handler: (request: any, h: any) => {
        const args={
          firstname: { "in": "path", "name": "firstname", "required": true, "dataType": "string" },
          lastname: { "in": "path", "name": "last_name", "required": true, "dataType": "string" },
          age: { "in": "path", "name": "age", "required": true, "dataType": "integer", "validators": { "isInt": { "errorMsg": "age" } } },
          weight: { "in": "path", "name": "weight", "required": true, "dataType": "float", "validators": { "isFloat": { "errorMsg": "weight" } } },
          human: { "in": "path", "name": "human", "required": true, "dataType": "boolean" },
          gender: { "in": "path", "name": "gender", "required": true, "dataType": "enum", "enums": ["MALE", "FEMALE"] },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new ParameterController();

        const promise=controller.getPath.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/ParameterTest/Header',
    options: {
      handler: (request: any, h: any) => {
        const args={
          firstname: { "in": "header", "name": "firstname", "required": true, "dataType": "string" },
          lastname: { "in": "header", "name": "last_name", "required": true, "dataType": "string" },
          age: { "in": "header", "name": "age", "required": true, "dataType": "integer", "validators": { "isInt": { "errorMsg": "age" } } },
          weight: { "in": "header", "name": "weight", "required": true, "dataType": "float", "validators": { "isFloat": { "errorMsg": "weight" } } },
          human: { "in": "header", "name": "human", "required": true, "dataType": "boolean" },
          gender: { "in": "header", "name": "gender", "required": true, "dataType": "enum", "enums": ["MALE", "FEMALE"] },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new ParameterController();

        const promise=controller.getHeader.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/ParameterTest/Request',
    options: {
      handler: (request: any, h: any) => {
        const args={
          request: { "in": "request", "name": "request", "required": true, "dataType": "object" },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new ParameterController();

        const promise=controller.getRequest.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'post',
    path: '/v1/ParameterTest/Body',
    options: {
      handler: (request: any, h: any) => {
        const args={
          body: { "in": "body", "name": "body", "required": true, "ref": "ParameterTestModel" },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new ParameterController();

        const promise=controller.getBody.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'post',
    path: '/v1/ParameterTest/BodyProps',
    options: {
      handler: (request: any, h: any) => {
        const args={
          firstname: { "in": "body-prop", "name": "firstname", "required": true, "dataType": "string" },
          lastname: { "in": "body-prop", "name": "lastname", "required": true, "dataType": "string" },
          age: { "in": "body-prop", "name": "age", "required": true, "dataType": "integer", "validators": { "isInt": { "errorMsg": "age" } } },
          weight: { "in": "body-prop", "name": "weight", "required": true, "dataType": "float", "validators": { "isFloat": { "errorMsg": "weight" } } },
          human: { "in": "body-prop", "name": "human", "required": true, "dataType": "boolean" },
          gender: { "in": "body-prop", "name": "gender", "required": true, "ref": "Gender" },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new ParameterController();

        const promise=controller.getBodyProps.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/ParameterTest/ParamaterQueyAnyType',
    options: {
      handler: (request: any, h: any) => {
        const args={
          name: { "in": "query", "name": "name", "required": true, "dataType": "any" },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new ParameterController();

        const promise=controller.queryAnyType.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'post',
    path: '/v1/ParameterTest/ParamaterQueyArray',
    options: {
      handler: (request: any, h: any) => {
        const args={
          name: { "in": "query", "name": "name", "required": true, "dataType": "array", "array": { "dataType": "string" } },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new ParameterController();

        const promise=controller.queyArray.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'post',
    path: '/v1/ParameterTest/ParamaterBodyAnyType',
    options: {
      handler: (request: any, h: any) => {
        const args={
          body: { "in": "body", "name": "body", "required": true, "dataType": "any" },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new ParameterController();

        const promise=controller.bodyAnyType.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'post',
    path: '/v1/ParameterTest/ParamaterBodyArrayType',
    options: {
      handler: (request: any, h: any) => {
        const args={
          body: { "in": "body", "name": "body", "required": true, "dataType": "array", "array": { "ref": "ParameterTestModel" } },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new ParameterController();

        const promise=controller.bodyArrayType.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/ParameterTest/ParamaterImplicitString',
    options: {
      handler: (request: any, h: any) => {
        const args={
          name: { "default": "Iron man", "in": "query", "name": "name", "dataType": "string" },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new ParameterController();

        const promise=controller.implicitString.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/ParameterTest/ParamaterImplicitNumber',
    options: {
      handler: (request: any, h: any) => {
        const args={
          age: { "default": 40, "in": "query", "name": "age", "dataType": "double" },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new ParameterController();

        const promise=controller.implicitNumber.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/ParameterTest/ParamaterImplicitEnum',
    options: {
      handler: (request: any, h: any) => {
        const args={
          gender: { "in": "query", "name": "gender", "dataType": "enum", "enums": ["MALE", "FEMALE"] },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new ParameterController();

        const promise=controller.implicitEnum.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/ParameterTest/ParamaterImplicitStringArray',
    options: {
      handler: (request: any, h: any) => {
        const args={
          arr: { "default": ["V1", "V2"], "in": "query", "name": "arr", "dataType": "array", "array": { "dataType": "string" } },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new ParameterController();

        const promise=controller.implicitStringArray.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/ParameterTest/paramaterImplicitNumberArray',
    options: {
      handler: (request: any, h: any) => {
        const args={
          arr: { "default": [1, 2, 3], "in": "query", "name": "arr", "dataType": "array", "array": { "dataType": "double" } },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new ParameterController();

        const promise=controller.implicitNumberArray.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/ParameterTest/paramaterImplicitDateTime',
    options: {
      handler: (request: any, h: any) => {
        const args={
          date: { "default": "2017-01-01T00:00:00.000Z", "in": "query", "name": "date", "dataType": "datetime" },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new ParameterController();

        const promise=controller.implicitDateTime.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/ParameterTest/paramaterImplicitDate',
    options: {
      handler: (request: any, h: any) => {
        const args={
          date: { "default": "2018-01-15", "in": "query", "name": "date", "dataType": "date", "validators": { "isDate": { "errorMsg": "date" } } },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new ParameterController();

        const promise=controller.implicitDate.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/SecurityTest',
    options: {
      pre: [
        {
          method: authenticateMiddleware([{ "api_key": [] }]),
          assign: "user"
        }
      ],
      handler: (request: any, h: any) => {
        const args={
          request: { "in": "request", "name": "request", "required": true, "dataType": "object" },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new SecurityTestController();

        const promise=controller.GetWithApi.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/SecurityTest/Hapi',
    options: {
      pre: [
        {
          method: authenticateMiddleware([{ "api_key": [] }]),
          assign: "user"
        }
      ],
      handler: (request: any, h: any) => {
        const args={
          request: { "in": "request", "name": "request", "required": true, "dataType": "object" },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new SecurityTestController();

        const promise=controller.GetWithApiForHapi.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/SecurityTest/Koa',
    options: {
      pre: [
        {
          method: authenticateMiddleware([{ "api_key": [] }]),
          assign: "user"
        }
      ],
      handler: (request: any, h: any) => {
        const args={
          request: { "in": "request", "name": "request", "required": true, "dataType": "object" },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new SecurityTestController();

        const promise=controller.GetWithApiForKoa.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/SecurityTest/Oauth',
    options: {
      pre: [
        {
          method: authenticateMiddleware([{ "tsoa_auth": ["write:pets", "read:pets"] }]),
          assign: "user"
        }
      ],
      handler: (request: any, h: any) => {
        const args={
          request: { "in": "request", "name": "request", "required": true, "dataType": "object" },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new SecurityTestController();

        const promise=controller.GetWithSecurity.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/SecurityTest/OauthOrAPIkey',
    options: {
      pre: [
        {
          method: authenticateMiddleware([{ "tsoa_auth": ["write:pets", "read:pets"] }, { "api_key": [] }]),
          assign: "user"
        }
      ],
      handler: (request: any, h: any) => {
        const args={
          request: { "in": "request", "name": "request", "required": true, "dataType": "object" },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new SecurityTestController();

        const promise=controller.GetWithOrSecurity.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/SecurityTest/OauthAndAPIkey',
    options: {
      pre: [
        {
          method: authenticateMiddleware([{ "api_key": [], "tsoa_auth": ["write:pets", "read:pets"] }]),
          assign: "user"
        }
      ],
      handler: (request: any, h: any) => {
        const args={
          request: { "in": "request", "name": "request", "required": true, "dataType": "object" },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new SecurityTestController();

        const promise=controller.GetWithAndSecurity.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/Controller/normalStatusCode',
    options: {
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new TestController();

        const promise=controller.normalStatusCode.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/Controller/noContentStatusCode',
    options: {
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new TestController();

        const promise=controller.noContentStatusCode.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/Controller/falseStatusCode',
    options: {
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new TestController();

        const promise=controller.falseStatusCode.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/Controller/customStatusCode',
    options: {
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new TestController();

        const promise=controller.customNomalStatusCode.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/Controller/customHeader',
    options: {
      handler: (request: any, h: any) => {
        const args={
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new TestController();

        const promise=controller.customHeader.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/Validate/parameter/date',
    options: {
      handler: (request: any, h: any) => {
        const args={
          minDateValue: { "in": "query", "name": "minDateValue", "required": true, "dataType": "date", "validators": { "isDate": { "errorMsg": "minDateValue" }, "minDate": { "value": "2018-01-01" } } },
          maxDateValue: { "in": "query", "name": "maxDateValue", "required": true, "dataType": "date", "validators": { "isDate": { "errorMsg": "maxDateValue" }, "maxDate": { "value": "2016-01-01" } } },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new ValidateController();

        const promise=controller.dateValidate.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/Validate/parameter/datetime',
    options: {
      handler: (request: any, h: any) => {
        const args={
          minDateValue: { "in": "query", "name": "minDateValue", "required": true, "dataType": "datetime", "validators": { "isDateTime": { "errorMsg": "minDateValue" }, "minDate": { "value": "2018-01-01T00:00:00" } } },
          maxDateValue: { "in": "query", "name": "maxDateValue", "required": true, "dataType": "datetime", "validators": { "isDateTime": { "errorMsg": "maxDateValue" }, "maxDate": { "value": "2016-01-01T00:00:00" } } },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new ValidateController();

        const promise=controller.dateTimeValidate.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/Validate/parameter/integer',
    options: {
      handler: (request: any, h: any) => {
        const args={
          minValue: { "in": "query", "name": "minValue", "required": true, "dataType": "integer", "validators": { "isInt": { "errorMsg": "minValue" }, "minimum": { "value": 5 } } },
          maxValue: { "in": "query", "name": "maxValue", "required": true, "dataType": "integer", "validators": { "isInt": { "errorMsg": "maxValue" }, "maximum": { "value": 3 } } },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new ValidateController();

        const promise=controller.longValidate.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/Validate/parameter/float',
    options: {
      handler: (request: any, h: any) => {
        const args={
          minValue: { "in": "query", "name": "minValue", "required": true, "dataType": "float", "validators": { "isFloat": { "errorMsg": "minValue" }, "minimum": { "value": 5.5 } } },
          maxValue: { "in": "query", "name": "maxValue", "required": true, "dataType": "float", "validators": { "isFloat": { "errorMsg": "maxValue" }, "maximum": { "value": 3.5 } } },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new ValidateController();

        const promise=controller.doubleValidate.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/Validate/parameter/boolean',
    options: {
      handler: (request: any, h: any) => {
        const args={
          boolValue: { "in": "query", "name": "boolValue", "required": true, "dataType": "boolean", "validators": { "isBoolean": { "errorMsg": "boolValue" } } },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new ValidateController();

        const promise=controller.booleanValidate.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/Validate/parameter/string',
    options: {
      handler: (request: any, h: any) => {
        const args={
          minLength: { "in": "query", "name": "minLength", "required": true, "dataType": "string", "validators": { "minLength": { "value": 5 } } },
          maxLength: { "in": "query", "name": "maxLength", "required": true, "dataType": "string", "validators": { "maxLength": { "value": 3 } } },
          patternValue: { "in": "query", "name": "patternValue", "required": true, "dataType": "string", "validators": { "pattern": { "value": "^[a-zA-Z]+$" } } },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new ValidateController();

        const promise=controller.stringValidate.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/Validate/parameter/customRequiredErrorMsg',
    options: {
      handler: (request: any, h: any) => {
        const args={
          longValue: { "in": "query", "name": "longValue", "required": true, "dataType": "long", "validators": { "isLong": { "errorMsg": "Required long number." } } },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new ValidateController();

        const promise=controller.customRequiredErrorMsg.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/Validate/parameter/customInvalidErrorMsg',
    options: {
      handler: (request: any, h: any) => {
        const args={
          longValue: { "in": "query", "name": "longValue", "required": true, "dataType": "long", "validators": { "isLong": { "errorMsg": "Invalid long number." } } },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new ValidateController();

        const promise=controller.customInvalidErrorMsg.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'post',
    path: '/v1/Validate/body',
    options: {
      handler: (request: any, h: any) => {
        const args={
          body: { "in": "body", "name": "body", "required": true, "ref": "ValidateModel" },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new ValidateController();

        const promise=controller.bodyValidate.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });
  server.route({
    method: 'post',
    path: '/v1/Validate/map',
    options: {
      handler: (request: any, h: any) => {
        const args={
          map: { "in": "body", "name": "map", "required": true, "ref": "ValidateMapStringToNumber" },
        };

        let validatedArgs: any[]=[];
        try {
          validatedArgs=getValidatedArgs(args, request);
        } catch (err) {
          return h
            .response(err)
            .code(err.status||500);
        }

        const controller=new ValidateController();

        const promise=controller.getNumberBodyRequest.apply(controller, validatedArgs);
        return promiseHandler(controller, promise, request, h);
      }
    }
  });

  function authenticateMiddleware(security: TsoaRoute.Security[]=[]) {
    return (request: any, h: any) => {
      let responded=0;
      let success=false;

      const succeed=function(user: any) {
        if (!success) {
          success=true;
          responded++;
          request['user']=user;
        }
        return user;
      };

      const fail=function(error: any) {
        responded++;
        if (responded==security.length&&!success) {
          h.response(error).code(error.status||401);
        }
        return error;
      };

      for (const secMethod of security) {
        if (Object.keys(secMethod).length>1) {
          let promises: Promise<any>[]=[];

          for (const name in secMethod) {
            promises.push(hapiAuthentication(request, name, secMethod[name]));
          }

          return Promise.all(promises)
            .then((users) => { succeed(users[0]); })
            .catch(fail);
        } else {
          for (const name in secMethod) {
            return hapiAuthentication(request, name, secMethod[name])
              .then(succeed)
              .catch(fail);
          }
        }
      }
      return null;
    }
  }

  function isController(object: any): object is Controller {
    return 'getHeaders' in object&&'getStatus' in object&&'setStatus' in object;
  }

  function promiseHandler(controllerObj: any, promise: any, request: any, h: any) {
    return Promise.resolve(promise)
      .then((data: any) => {
        const response=(data||data===false)
          ? h.response(data).code(200)
          :h.response("").code(204);

        if (isController(controllerObj)) {
          const headers=controllerObj.getHeaders();
          Object.keys(headers).forEach((name: string) => {
            response.header(name, headers[name]);
          });

          const statusCode=controllerObj.getStatus();
          if (statusCode) {
            response.code(statusCode);
          }
        }
        return response;
      })
      .catch((error: any) => h.response(error).code(error.status||500));
  }

  function getValidatedArgs(args: any, request: any): any[] {
    const errorFields: FieldErrors={};
    const values=Object.keys(args).map(key => {
      const name=args[key].name;
      switch (args[key].in) {
        case 'request':
          return request;
        case 'query':
          return ValidateParam(args[key], request.query[name], models, name, errorFields)
        case 'path':
          return ValidateParam(args[key], request.params[name], models, name, errorFields)
        case 'header':
          return ValidateParam(args[key], request.headers[name], models, name, errorFields);
        case 'body':
          return ValidateParam(args[key], request.payload, models, name, errorFields, name+'.');
        case 'body-prop':
          return ValidateParam(args[key], request.payload[name], models, name, errorFields, 'body.');
      }
    });
    if (Object.keys(errorFields).length>0) {
      throw new ValidateError(errorFields, '');
    }
    return values;
  }
}
