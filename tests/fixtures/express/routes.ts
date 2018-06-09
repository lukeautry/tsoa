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
import { expressAuthentication } from './authentication';

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
};

export function RegisterRoutes(app: any) {
  app.get('/v1',
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new RootController();


      const promise=controller.rootHandler.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/rootControllerMethodWithPath',
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new RootController();


      const promise=controller.rootControllerMethodWithPath.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.delete('/v1/DeleteTest',
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new DeleteTestController();


      const promise=controller.deleteWithReturnValue.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.delete('/v1/DeleteTest/Current',
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new DeleteTestController();


      const promise=controller.deleteCurrent.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.delete('/v1/DeleteTest/:numberPathParam/:booleanPathParam/:stringPathParam',
    function(request: any, response: any, next: any) {
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
        return next(err);
      }

      const controller=new DeleteTestController();


      const promise=controller.getModelByParams.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/GetTest',
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new GetTestController();


      const promise=controller.getModel.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/GetTest/Current',
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new GetTestController();


      const promise=controller.getCurrentModel.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/GetTest/ClassModel',
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new GetTestController();


      const promise=controller.getClassModel.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/GetTest/Multi',
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new GetTestController();


      const promise=controller.getMultipleModels.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/GetTest/:numberPathParam/:booleanPathParam/:stringPathParam',
    function(request: any, response: any, next: any) {
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
        return next(err);
      }

      const controller=new GetTestController();


      const promise=controller.getModelByParams.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/GetTest/ResponseWithUnionTypeProperty',
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new GetTestController();


      const promise=controller.getResponseWithUnionTypeProperty.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/GetTest/UnionTypeResponse',
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new GetTestController();


      const promise=controller.getUnionTypeResponse.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/GetTest/Request',
    function(request: any, response: any, next: any) {
      const args={
        request: { "in": "request", "name": "request", "required": true, "dataType": "object" },
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new GetTestController();


      const promise=controller.getRequest.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/GetTest/DateParam',
    function(request: any, response: any, next: any) {
      const args={
        date: { "in": "query", "name": "date", "required": true, "dataType": "datetime" },
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new GetTestController();


      const promise=controller.getByDataParam.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/GetTest/ThrowsError',
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new GetTestController();


      const promise=controller.getThrowsError.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/GetTest/GeneratesTags',
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new GetTestController();


      const promise=controller.getGeneratesTags.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/GetTest/HandleBufferType',
    function(request: any, response: any, next: any) {
      const args={
        buffer: { "in": "query", "name": "buffer", "required": true, "dataType": "buffer" },
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new GetTestController();


      const promise=controller.getBuffer.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/GetTest/GenericModel',
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new GetTestController();


      const promise=controller.getGenericModel.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/GetTest/GenericModelArray',
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new GetTestController();


      const promise=controller.getGenericModelArray.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/GetTest/GenericPrimitive',
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new GetTestController();


      const promise=controller.getGenericPrimitive.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/GetTest/GenericPrimitiveArray',
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new GetTestController();


      const promise=controller.getGenericPrimitiveArray.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.patch('/v1/PatchTest',
    function(request: any, response: any, next: any) {
      const args={
        model: { "in": "body", "name": "model", "required": true, "ref": "TestModel" },
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new PatchTestController();


      const promise=controller.patchModel.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.patch('/v1/PatchTest/Location',
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new PatchTestController();


      const promise=controller.patchModelAtLocation.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.patch('/v1/PatchTest/Multi',
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new PatchTestController();


      const promise=controller.patchWithMultiReturn.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.patch('/v1/PatchTest/WithId/:id',
    function(request: any, response: any, next: any) {
      const args={
        id: { "in": "path", "name": "id", "required": true, "dataType": "double" },
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new PatchTestController();


      const promise=controller.patchWithId.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.post('/v1/PostTest',
    function(request: any, response: any, next: any) {
      const args={
        model: { "in": "body", "name": "model", "required": true, "ref": "TestModel" },
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new PostTestController();


      const promise=controller.postModel.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.patch('/v1/PostTest',
    function(request: any, response: any, next: any) {
      const args={
        model: { "in": "body", "name": "model", "required": true, "ref": "TestModel" },
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new PostTestController();


      const promise=controller.updateModel.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.post('/v1/PostTest/WithClassModel',
    function(request: any, response: any, next: any) {
      const args={
        model: { "in": "body", "name": "model", "required": true, "ref": "TestClassModel" },
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new PostTestController();


      const promise=controller.postClassModel.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.post('/v1/PostTest/Location',
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new PostTestController();


      const promise=controller.postModelAtLocation.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.post('/v1/PostTest/Multi',
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new PostTestController();


      const promise=controller.postWithMultiReturn.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.post('/v1/PostTest/WithId/:id',
    function(request: any, response: any, next: any) {
      const args={
        id: { "in": "path", "name": "id", "required": true, "dataType": "double" },
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new PostTestController();


      const promise=controller.postWithId.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.post('/v1/PostTest/WithBodyAndQueryParams',
    function(request: any, response: any, next: any) {
      const args={
        model: { "in": "body", "name": "model", "required": true, "ref": "TestModel" },
        query: { "in": "query", "name": "query", "required": true, "dataType": "string" },
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new PostTestController();


      const promise=controller.postWithBodyAndQueryParams.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.post('/v1/PostTest/GenericBody',
    function(request: any, response: any, next: any) {
      const args={
        genericReq: { "in": "body", "name": "genericReq", "required": true, "ref": "GenericRequestTestModel" },
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new PostTestController();


      const promise=controller.getGenericRequest.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.put('/v1/PutTest',
    function(request: any, response: any, next: any) {
      const args={
        model: { "in": "body", "name": "model", "required": true, "ref": "TestModel" },
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new PutTestController();


      const promise=controller.putModel.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.put('/v1/PutTest/Location',
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new PutTestController();


      const promise=controller.putModelAtLocation.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.put('/v1/PutTest/Multi',
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new PutTestController();


      const promise=controller.putWithMultiReturn.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.put('/v1/PutTest/WithId/:id',
    function(request: any, response: any, next: any) {
      const args={
        id: { "in": "path", "name": "id", "required": true, "dataType": "double" },
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new PutTestController();


      const promise=controller.putWithId.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/MethodTest/Get',
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new MethodController();


      const promise=controller.getMethod.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.post('/v1/MethodTest/Post',
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new MethodController();


      const promise=controller.postMethod.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.patch('/v1/MethodTest/Patch',
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new MethodController();


      const promise=controller.patchMethod.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.put('/v1/MethodTest/Put',
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new MethodController();


      const promise=controller.putMethod.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.delete('/v1/MethodTest/Delete',
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new MethodController();


      const promise=controller.deleteMethod.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/MethodTest/Description',
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new MethodController();


      const promise=controller.description.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/MethodTest/Tags',
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new MethodController();


      const promise=controller.tags.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/MethodTest/MultiResponse',
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new MethodController();


      const promise=controller.multiResponse.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/MethodTest/SuccessResponse',
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new MethodController();


      const promise=controller.successResponse.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/MethodTest/ApiSecurity',
    authenticateMiddleware([{ "name": "api_key" }]),
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new MethodController();


      const promise=controller.apiSecurity.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/MethodTest/OauthSecurity',
    authenticateMiddleware([{ "name": "tsoa_auth", "scopes": ["write:pets", "read:pets"] }]),
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new MethodController();


      const promise=controller.oauthSecurity.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/MethodTest/OauthOrAPIkeySecurity',
    authenticateMiddleware([{ "name": "tsoa_auth", "scopes": ["write:pets", "read:pets"] }, { "name": "api_key" }]),
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new MethodController();


      const promise=controller.oauthOrAPIkeySecurity.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/MethodTest/DeprecatedMethod',
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new MethodController();


      const promise=controller.deprecatedMethod.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/MethodTest/SummaryMethod',
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new MethodController();


      const promise=controller.summaryMethod.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/MethodTest/returnAnyType',
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new MethodController();


      const promise=controller.returnAnyType.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/ParameterTest/Query',
    function(request: any, response: any, next: any) {
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
        return next(err);
      }

      const controller=new ParameterController();


      const promise=controller.getQuery.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/ParameterTest/Path/:firstname/:last_name/:age/:weight/:human/:gender',
    function(request: any, response: any, next: any) {
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
        return next(err);
      }

      const controller=new ParameterController();


      const promise=controller.getPath.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/ParameterTest/Header',
    function(request: any, response: any, next: any) {
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
        return next(err);
      }

      const controller=new ParameterController();


      const promise=controller.getHeader.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/ParameterTest/Request',
    function(request: any, response: any, next: any) {
      const args={
        request: { "in": "request", "name": "request", "required": true, "dataType": "object" },
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new ParameterController();


      const promise=controller.getRequest.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.post('/v1/ParameterTest/Body',
    function(request: any, response: any, next: any) {
      const args={
        body: { "in": "body", "name": "body", "required": true, "ref": "ParameterTestModel" },
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new ParameterController();


      const promise=controller.getBody.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.post('/v1/ParameterTest/BodyProps',
    function(request: any, response: any, next: any) {
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
        return next(err);
      }

      const controller=new ParameterController();


      const promise=controller.getBodyProps.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/ParameterTest/ParamaterQueyAnyType',
    function(request: any, response: any, next: any) {
      const args={
        name: { "in": "query", "name": "name", "required": true, "dataType": "any" },
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new ParameterController();


      const promise=controller.queryAnyType.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.post('/v1/ParameterTest/ParamaterQueyArray',
    function(request: any, response: any, next: any) {
      const args={
        name: { "in": "query", "name": "name", "required": true, "dataType": "array", "array": { "dataType": "string" } },
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new ParameterController();


      const promise=controller.queyArray.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.post('/v1/ParameterTest/ParamaterBodyAnyType',
    function(request: any, response: any, next: any) {
      const args={
        body: { "in": "body", "name": "body", "required": true, "dataType": "any" },
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new ParameterController();


      const promise=controller.bodyAnyType.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.post('/v1/ParameterTest/ParamaterBodyArrayType',
    function(request: any, response: any, next: any) {
      const args={
        body: { "in": "body", "name": "body", "required": true, "dataType": "array", "array": { "ref": "ParameterTestModel" } },
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new ParameterController();


      const promise=controller.bodyArrayType.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/ParameterTest/ParamaterImplicitString',
    function(request: any, response: any, next: any) {
      const args={
        name: { "default": "Iron man", "in": "query", "name": "name", "dataType": "string" },
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new ParameterController();


      const promise=controller.implicitString.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/ParameterTest/ParamaterImplicitNumber',
    function(request: any, response: any, next: any) {
      const args={
        age: { "default": 40, "in": "query", "name": "age", "dataType": "double" },
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new ParameterController();


      const promise=controller.implicitNumber.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/ParameterTest/ParamaterImplicitEnum',
    function(request: any, response: any, next: any) {
      const args={
        gender: { "in": "query", "name": "gender", "dataType": "enum", "enums": ["MALE", "FEMALE"] },
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new ParameterController();


      const promise=controller.implicitEnum.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/ParameterTest/ParamaterImplicitStringArray',
    function(request: any, response: any, next: any) {
      const args={
        arr: { "default": ["V1", "V2"], "in": "query", "name": "arr", "dataType": "array", "array": { "dataType": "string" } },
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new ParameterController();


      const promise=controller.implicitStringArray.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/ParameterTest/paramaterImplicitNumberArray',
    function(request: any, response: any, next: any) {
      const args={
        arr: { "default": [1, 2, 3], "in": "query", "name": "arr", "dataType": "array", "array": { "dataType": "double" } },
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new ParameterController();


      const promise=controller.implicitNumberArray.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/ParameterTest/paramaterImplicitDateTime',
    function(request: any, response: any, next: any) {
      const args={
        date: { "default": "2017-01-01T00:00:00.000Z", "in": "query", "name": "date", "dataType": "datetime" },
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new ParameterController();


      const promise=controller.implicitDateTime.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/ParameterTest/paramaterImplicitDate',
    function(request: any, response: any, next: any) {
      const args={
        date: { "default": "2018-01-15", "in": "query", "name": "date", "dataType": "date", "validators": { "isDate": { "errorMsg": "date" } } },
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new ParameterController();


      const promise=controller.implicitDate.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/SecurityTest',
    authenticateMiddleware([{ "name": "api_key" }]),
    function(request: any, response: any, next: any) {
      const args={
        request: { "in": "request", "name": "request", "required": true, "dataType": "object" },
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new SecurityTestController();


      const promise=controller.GetWithApi.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/SecurityTest/Koa',
    authenticateMiddleware([{ "name": "api_key" }]),
    function(request: any, response: any, next: any) {
      const args={
        request: { "in": "request", "name": "request", "required": true, "dataType": "object" },
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new SecurityTestController();


      const promise=controller.GetWithApiForKoa.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/SecurityTest/Oauth',
    authenticateMiddleware([{ "name": "tsoa_auth", "scopes": ["write:pets", "read:pets"] }]),
    function(request: any, response: any, next: any) {
      const args={
        request: { "in": "request", "name": "request", "required": true, "dataType": "object" },
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new SecurityTestController();


      const promise=controller.GetWithSecurity.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/SecurityTest/OauthOrAPIkey',
    authenticateMiddleware([{ "name": "tsoa_auth", "scopes": ["write:pets", "read:pets"] }, { "name": "api_key" }]),
    function(request: any, response: any, next: any) {
      const args={
        request: { "in": "request", "name": "request", "required": true, "dataType": "object" },
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new SecurityTestController();


      const promise=controller.GetWithDoubleSecurity.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/Controller/normalStatusCode',
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new TestController();


      const promise=controller.normalStatusCode.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/Controller/noContentStatusCode',
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new TestController();


      const promise=controller.noContentStatusCode.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/Controller/falseStatusCode',
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new TestController();


      const promise=controller.falseStatusCode.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/Controller/customStatusCode',
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new TestController();


      const promise=controller.customNomalStatusCode.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/Controller/customHeader',
    function(request: any, response: any, next: any) {
      const args={
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new TestController();


      const promise=controller.customHeader.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/Validate/parameter/date',
    function(request: any, response: any, next: any) {
      const args={
        minDateValue: { "in": "query", "name": "minDateValue", "required": true, "dataType": "date", "validators": { "isDate": { "errorMsg": "minDateValue" }, "minDate": { "value": "2018-01-01" } } },
        maxDateValue: { "in": "query", "name": "maxDateValue", "required": true, "dataType": "date", "validators": { "isDate": { "errorMsg": "maxDateValue" }, "maxDate": { "value": "2016-01-01" } } },
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new ValidateController();


      const promise=controller.dateValidate.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/Validate/parameter/datetime',
    function(request: any, response: any, next: any) {
      const args={
        minDateValue: { "in": "query", "name": "minDateValue", "required": true, "dataType": "datetime", "validators": { "isDateTime": { "errorMsg": "minDateValue" }, "minDate": { "value": "2018-01-01T00:00:00" } } },
        maxDateValue: { "in": "query", "name": "maxDateValue", "required": true, "dataType": "datetime", "validators": { "isDateTime": { "errorMsg": "maxDateValue" }, "maxDate": { "value": "2016-01-01T00:00:00" } } },
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new ValidateController();


      const promise=controller.dateTimeValidate.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/Validate/parameter/integer',
    function(request: any, response: any, next: any) {
      const args={
        minValue: { "in": "query", "name": "minValue", "required": true, "dataType": "integer", "validators": { "isInt": { "errorMsg": "minValue" }, "minimum": { "value": 5 } } },
        maxValue: { "in": "query", "name": "maxValue", "required": true, "dataType": "integer", "validators": { "isInt": { "errorMsg": "maxValue" }, "maximum": { "value": 3 } } },
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new ValidateController();


      const promise=controller.longValidate.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/Validate/parameter/float',
    function(request: any, response: any, next: any) {
      const args={
        minValue: { "in": "query", "name": "minValue", "required": true, "dataType": "float", "validators": { "isFloat": { "errorMsg": "minValue" }, "minimum": { "value": 5.5 } } },
        maxValue: { "in": "query", "name": "maxValue", "required": true, "dataType": "float", "validators": { "isFloat": { "errorMsg": "maxValue" }, "maximum": { "value": 3.5 } } },
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new ValidateController();


      const promise=controller.doubleValidate.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/Validate/parameter/boolean',
    function(request: any, response: any, next: any) {
      const args={
        boolValue: { "in": "query", "name": "boolValue", "required": true, "dataType": "boolean", "validators": { "isBoolean": { "errorMsg": "boolValue" } } },
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new ValidateController();


      const promise=controller.booleanValidate.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/Validate/parameter/string',
    function(request: any, response: any, next: any) {
      const args={
        minLength: { "in": "query", "name": "minLength", "required": true, "dataType": "string", "validators": { "minLength": { "value": 5 } } },
        maxLength: { "in": "query", "name": "maxLength", "required": true, "dataType": "string", "validators": { "maxLength": { "value": 3 } } },
        patternValue: { "in": "query", "name": "patternValue", "required": true, "dataType": "string", "validators": { "pattern": { "value": "^[a-zA-Z]+$" } } },
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new ValidateController();


      const promise=controller.stringValidate.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/Validate/parameter/customRequiredErrorMsg',
    function(request: any, response: any, next: any) {
      const args={
        longValue: { "in": "query", "name": "longValue", "required": true, "dataType": "long", "validators": { "isLong": { "errorMsg": "Required long number." } } },
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new ValidateController();


      const promise=controller.customRequiredErrorMsg.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.get('/v1/Validate/parameter/customInvalidErrorMsg',
    function(request: any, response: any, next: any) {
      const args={
        longValue: { "in": "query", "name": "longValue", "required": true, "dataType": "long", "validators": { "isLong": { "errorMsg": "Invalid long number." } } },
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new ValidateController();


      const promise=controller.customInvalidErrorMsg.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });
  app.post('/v1/Validate/body',
    function(request: any, response: any, next: any) {
      const args={
        body: { "in": "body", "name": "body", "required": true, "ref": "ValidateModel" },
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=new ValidateController();


      const promise=controller.bodyValidate.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });

  function authenticateMiddleware(security: TsoaRoute.Security[]=[]) {
    return (request: any, response: any, next: any) => {
      let responded=0;
      let success=false;
      for (const secMethod of security) {
        expressAuthentication(request, secMethod.name, secMethod.scopes).then((user: any) => {
          // only need to respond once
          if (!success) {
            success=true;
            responded++;
            request['user']=user;
            next();
          }
        })
          .catch((error: any) => {
            responded++;
            if (responded==security.length&&!success) {
              response.status(401);
              next(error)
            }
          })
      }
    }
  }

  function promiseHandler(controllerObj: any, promise: any, response: any, next: any) {
    return Promise.resolve(promise)
      .then((data: any) => {
        let statusCode;
        if (controllerObj instanceof Controller) {
          const controller=controllerObj as Controller
          const headers=controller.getHeaders();
          Object.keys(headers).forEach((name: string) => {
            response.set(name, headers[name]);
          });

          statusCode=controller.getStatus();
        }

        if (data||data===false) { // === false allows boolean result
          response.status(statusCode||200).json(data);
        } else {
          response.status(statusCode||204).end();
        }
      })
      .catch((error: any) => next(error));
  }

  function getValidatedArgs(args: any, request: any): any[] {
    const fieldErrors: FieldErrors={};
    const values=Object.keys(args).map((key) => {
      const name=args[key].name;
      switch (args[key].in) {
        case 'request':
          return request;
        case 'query':
          return ValidateParam(args[key], request.query[name], models, name, fieldErrors);
        case 'path':
          return ValidateParam(args[key], request.params[name], models, name, fieldErrors);
        case 'header':
          return ValidateParam(args[key], request.header(name), models, name, fieldErrors);
        case 'body':
          return ValidateParam(args[key], request.body, models, name, fieldErrors, name+'.');
        case 'body-prop':
          return ValidateParam(args[key], request.body[name], models, name, fieldErrors, 'body.');
      }
    });
    if (Object.keys(fieldErrors).length>0) {
      throw new ValidateError(fieldErrors, '');
    }
    return values;
  }
}
