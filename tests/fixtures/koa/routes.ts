/* tslint:disable */
import { ValidateParam } from '../../../src/routeGeneration/templateHelpers';
import { Controller } from '../../../src/interfaces/controller';
import { PutTestController } from './../controllers/putController';
import { PostTestController } from './../controllers/postController';
import { PatchTestController } from './../controllers/patchController';
import { GetTestController } from './../controllers/getController';
import { DeleteTestController } from './../controllers/deleteController';
import { MethodController } from './../controllers/methodController';
import { ParameterController } from './../controllers/parameterController';
import { SecurityTestController } from './../controllers/securityController';

const models: any = {
  "TestModel": {
    properties: {
      "numberValue": { "required": true, "typeName": "double" },
      "numberArray": { "required": true, "typeName": "array", "array": { "typeName": "double" } },
      "stringValue": { "required": true, "typeName": "string" },
      "stringArray": { "required": true, "typeName": "array", "array": { "typeName": "string" } },
      "boolValue": { "required": true, "typeName": "boolean" },
      "boolArray": { "required": true, "typeName": "array", "array": { "typeName": "boolean" } },
      "enumValue": { "required": false, "typeName": "enum", "enumMembers": [0, 1] },
      "enumArray": { "required": false, "typeName": "array", "array": { "typeName": "enum", "enumMembers": [0, 1] } },
      "enumStringValue": { "required": false, "typeName": "enum", "enumMembers": ["VALUE_1", "VALUE_2"] },
      "enumStringArray": { "required": false, "typeName": "array", "array": { "typeName": "enum", "enumMembers": ["VALUE_1", "VALUE_2"] } },
      "modelValue": { "required": true, "typeName": "TestSubModel" },
      "modelsArray": { "required": true, "typeName": "array", "array": { "typeName": "TestSubModel" } },
      "strLiteralVal": { "required": true, "typeName": "enum", "enumMembers": ["Foo", "Bar"] },
      "strLiteralArr": { "required": true, "typeName": "array", "array": { "typeName": "enum", "enumMembers": ["Foo", "Bar"] } },
      "dateValue": { "required": false, "typeName": "datetime" },
      "optionalString": { "required": false, "typeName": "string" },
      "modelsObjectIndirect": { "required": false, "typeName": "TestSubModelContainer" },
      "modelsObjectIndirectNS": { "required": false, "typeName": "TestSubModelContainerNamespace.TestSubModelContainer" },
      "modelsObjectIndirectNS2": { "required": false, "typeName": "TestSubModelContainerNamespace.InnerNamespace.TestSubModelContainer2" },
      "modelsObjectIndirectNS_Alias": { "required": false, "typeName": "TestSubModelContainerNamespace_TestSubModelContainer" },
      "modelsObjectIndirectNS2_Alias": { "required": false, "typeName": "TestSubModelContainerNamespace_InnerNamespace_TestSubModelContainer2" },
      "id": { "required": true, "typeName": "double" },
    },
  },
  "TestSubModel": {
    properties: {
      "email": { "required": true, "typeName": "string" },
      "circular": { "required": false, "typeName": "TestModel" },
      "id": { "required": true, "typeName": "double" },
    },
  },
  "TestSubModel2": {
    properties: {
      "testSubModel2": { "required": true, "typeName": "boolean" },
      "email": { "required": true, "typeName": "string" },
      "circular": { "required": false, "typeName": "TestModel" },
      "id": { "required": true, "typeName": "double" },
    },
  },
  "TestSubModelContainer": {
    properties: {
    },
    additionalProperties: [
      { typeName: 'TestSubModel2' },
    ],
  },
  "TestSubModelNamespace.TestSubModelNS": {
    properties: {
      "testSubModelNS": { "required": true, "typeName": "boolean" },
      "email": { "required": true, "typeName": "string" },
      "circular": { "required": false, "typeName": "TestModel" },
      "id": { "required": true, "typeName": "double" },
    },
  },
  "TestSubModelContainerNamespace.TestSubModelContainer": {
    properties: {
    },
    additionalProperties: [
      { typeName: 'TestSubModelNamespace.TestSubModelNS' },
    ],
  },
  "TestSubModelContainerNamespace.InnerNamespace.TestSubModelContainer2": {
    properties: {
    },
    additionalProperties: [
      { typeName: 'TestSubModelNamespace.TestSubModelNS' },
    ],
  },
  "TestSubModelContainerNamespace_TestSubModelContainer": {
    properties: {
    },
  },
  "TestSubModelContainerNamespace_InnerNamespace_TestSubModelContainer2": {
    properties: {
    },
  },
  "TestClassModel": {
    properties: {
      "publicStringProperty": { "required": true, "typeName": "string" },
      "optionalPublicStringProperty": { "required": false, "typeName": "string" },
      "stringProperty": { "required": true, "typeName": "string" },
      "publicConstructorVar": { "required": true, "typeName": "string" },
      "optionalPublicConstructorVar": { "required": false, "typeName": "string" },
      "id": { "required": true, "typeName": "double" },
    },
  },
  "GenericRequestTestModel": {
    properties: {
      "name": { "required": true, "typeName": "string" },
      "value": { "required": true, "typeName": "TestModel" },
    },
  },
  "Result": {
    properties: {
      "value": { "required": true, "typeName": "object" },
    },
  },
  "GenericModelTestModel": {
    properties: {
      "result": { "required": true, "typeName": "TestModel" },
    },
  },
  "GenericModelTestModel[]": {
    properties: {
      "result": { "required": true, "typeName": "array", "array": { "typeName": "TestModel" } },
    },
  },
  "GenericModelstring": {
    properties: {
      "result": { "required": true, "typeName": "string" },
    },
  },
  "GenericModelstring[]": {
    properties: {
      "result": { "required": true, "typeName": "array", "array": { "typeName": "string" } },
    },
  },
  "ErrorResponseModel": {
    properties: {
      "status": { "required": true, "typeName": "double" },
      "message": { "required": true, "typeName": "string" },
    },
  },
  "ParameterTestModel": {
    properties: {
      "firstname": { "required": true, "typeName": "string" },
      "lastname": { "required": true, "typeName": "string" },
      "age": { "required": true, "typeName": "integer" },
      "weight": { "required": true, "typeName": "float" },
      "human": { "required": true, "typeName": "boolean" },
      "gender": { "required": true, "typeName": "enum", "enumMembers": ["MALE", "FEMALE"] },
    },
  },
  "UserResponseModel": {
    properties: {
      "id": { "required": true, "typeName": "double" },
      "name": { "required": true, "typeName": "string" },
    },
  },
};

/* tslint:disable:forin */
import * as KoaRouter from 'koa-router';
import { set } from 'lodash';
import { koaAuthentication } from './authentication';

export function RegisterRoutes(router: KoaRouter) {
  router.put('/v1/PutTest',
    async (context, next) => {
      const args = {
        model: { "in": "body", "name": "model", "required": true, "typeName": "TestModel" },
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new PutTestController();

      const promise = controller.putModel.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.put('/v1/PutTest/Location',
    async (context, next) => {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new PutTestController();

      const promise = controller.putModelAtLocation.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.put('/v1/PutTest/Multi',
    async (context, next) => {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new PutTestController();

      const promise = controller.putWithMultiReturn.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.put('/v1/PutTest/WithId/:id',
    async (context, next) => {
      const args = {
        id: { "in": "path", "name": "id", "required": true, "typeName": "double" },
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new PutTestController();

      const promise = controller.putWithId.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.post('/v1/PostTest',
    async (context, next) => {
      const args = {
        model: { "in": "body", "name": "model", "required": true, "typeName": "TestModel" },
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new PostTestController();

      const promise = controller.postModel.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.patch('/v1/PostTest',
    async (context, next) => {
      const args = {
        model: { "in": "body", "name": "model", "required": true, "typeName": "TestModel" },
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new PostTestController();

      const promise = controller.updateModel.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.post('/v1/PostTest/WithClassModel',
    async (context, next) => {
      const args = {
        model: { "in": "body", "name": "model", "required": true, "typeName": "TestClassModel" },
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new PostTestController();

      const promise = controller.postClassModel.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.post('/v1/PostTest/Location',
    async (context, next) => {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new PostTestController();

      const promise = controller.postModelAtLocation.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.post('/v1/PostTest/Multi',
    async (context, next) => {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new PostTestController();

      const promise = controller.postWithMultiReturn.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.post('/v1/PostTest/WithId/:id',
    async (context, next) => {
      const args = {
        id: { "in": "path", "name": "id", "required": true, "typeName": "double" },
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new PostTestController();

      const promise = controller.postWithId.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.post('/v1/PostTest/WithBodyAndQueryParams',
    async (context, next) => {
      const args = {
        model: { "in": "body", "name": "model", "required": true, "typeName": "TestModel" },
        query: { "in": "query", "name": "query", "required": true, "typeName": "string" },
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new PostTestController();

      const promise = controller.postWithBodyAndQueryParams.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.post('/v1/PostTest/GenericBody',
    async (context, next) => {
      const args = {
        genericReq: { "in": "body", "name": "genericReq", "required": true, "typeName": "GenericRequestTestModel" },
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new PostTestController();

      const promise = controller.getGenericRequest.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.patch('/v1/PatchTest',
    async (context, next) => {
      const args = {
        model: { "in": "body", "name": "model", "required": true, "typeName": "TestModel" },
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new PatchTestController();

      const promise = controller.patchModel.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.patch('/v1/PatchTest/Location',
    async (context, next) => {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new PatchTestController();

      const promise = controller.patchModelAtLocation.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.patch('/v1/PatchTest/Multi',
    async (context, next) => {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new PatchTestController();

      const promise = controller.patchWithMultiReturn.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.patch('/v1/PatchTest/WithId/:id',
    async (context, next) => {
      const args = {
        id: { "in": "path", "name": "id", "required": true, "typeName": "double" },
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new PatchTestController();

      const promise = controller.patchWithId.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.get('/v1/GetTest',
    async (context, next) => {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new GetTestController();

      const promise = controller.getModel.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.get('/v1/GetTest/Current',
    async (context, next) => {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new GetTestController();

      const promise = controller.getCurrentModel.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.get('/v1/GetTest/ClassModel',
    async (context, next) => {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new GetTestController();

      const promise = controller.getClassModel.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.get('/v1/GetTest/Multi',
    async (context, next) => {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new GetTestController();

      const promise = controller.getMultipleModels.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.get('/v1/GetTest/:numberPathParam/:booleanPathParam/:stringPathParam',
    async (context, next) => {
      const args = {
        numberPathParam: { "in": "path", "name": "numberPathParam", "required": true, "typeName": "double" },
        stringPathParam: { "in": "path", "name": "stringPathParam", "required": true, "typeName": "string" },
        booleanPathParam: { "in": "path", "name": "booleanPathParam", "required": true, "typeName": "boolean" },
        booleanParam: { "in": "query", "name": "booleanParam", "required": true, "typeName": "boolean" },
        stringParam: { "in": "query", "name": "stringParam", "required": true, "typeName": "string" },
        numberParam: { "in": "query", "name": "numberParam", "required": true, "typeName": "double" },
        optionalStringParam: { "in": "query", "name": "optionalStringParam", "required": false, "typeName": "string" },
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new GetTestController();

      const promise = controller.getModelByParams.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.get('/v1/GetTest/ResponseWithUnionTypeProperty',
    async (context, next) => {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new GetTestController();

      const promise = controller.getResponseWithUnionTypeProperty.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.get('/v1/GetTest/UnionTypeResponse',
    async (context, next) => {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new GetTestController();

      const promise = controller.getUnionTypeResponse.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.get('/v1/GetTest/Request',
    async (context, next) => {
      const args = {
        request: { "in": "request", "name": "request", "required": true, "typeName": "object" },
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new GetTestController();

      const promise = controller.getRequest.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.get('/v1/GetTest/DateParam',
    async (context, next) => {
      const args = {
        date: { "in": "query", "name": "date", "required": true, "typeName": "datetime" },
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new GetTestController();

      const promise = controller.getByDataParam.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.get('/v1/GetTest/ThrowsError',
    async (context, next) => {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new GetTestController();

      const promise = controller.getThrowsError.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.get('/v1/GetTest/GeneratesTags',
    async (context, next) => {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new GetTestController();

      const promise = controller.getGeneratesTags.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.get('/v1/GetTest/HandleBufferType',
    async (context, next) => {
      const args = {
        buffer: { "in": "query", "name": "buffer", "required": true, "typeName": "buffer" },
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new GetTestController();

      const promise = controller.getBuffer.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.get('/v1/GetTest/GenericModel',
    async (context, next) => {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new GetTestController();

      const promise = controller.getGenericModel.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.get('/v1/GetTest/GenericModelArray',
    async (context, next) => {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new GetTestController();

      const promise = controller.getGenericModelArray.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.get('/v1/GetTest/GenericPrimitive',
    async (context, next) => {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new GetTestController();

      const promise = controller.getGenericPrimitive.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.get('/v1/GetTest/GenericPrimitiveArray',
    async (context, next) => {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new GetTestController();

      const promise = controller.getGenericPrimitiveArray.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.delete('/v1/DeleteTest',
    async (context, next) => {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new DeleteTestController();

      const promise = controller.deleteWithReturnValue.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.delete('/v1/DeleteTest/Current',
    async (context, next) => {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new DeleteTestController();

      const promise = controller.deleteCurrent.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.delete('/v1/DeleteTest/:numberPathParam/:booleanPathParam/:stringPathParam',
    async (context, next) => {
      const args = {
        numberPathParam: { "in": "path", "name": "numberPathParam", "required": true, "typeName": "double" },
        stringPathParam: { "in": "path", "name": "stringPathParam", "required": true, "typeName": "string" },
        booleanPathParam: { "in": "path", "name": "booleanPathParam", "required": true, "typeName": "boolean" },
        booleanParam: { "in": "query", "name": "booleanParam", "required": true, "typeName": "boolean" },
        stringParam: { "in": "query", "name": "stringParam", "required": true, "typeName": "string" },
        numberParam: { "in": "query", "name": "numberParam", "required": true, "typeName": "double" },
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new DeleteTestController();

      const promise = controller.getModelByParams.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.get('/v1/MethodTest/Get',
    async (context, next) => {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new MethodController();

      const promise = controller.getMethod.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.post('/v1/MethodTest/Post',
    async (context, next) => {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new MethodController();

      const promise = controller.postMethod.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.patch('/v1/MethodTest/Patch',
    async (context, next) => {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new MethodController();

      const promise = controller.patchMethod.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.put('/v1/MethodTest/Put',
    async (context, next) => {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new MethodController();

      const promise = controller.putMethod.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.delete('/v1/MethodTest/Delete',
    async (context, next) => {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new MethodController();

      const promise = controller.deleteMethod.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.get('/v1/MethodTest/Description',
    async (context, next) => {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new MethodController();

      const promise = controller.description.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.get('/v1/MethodTest/Tags',
    async (context, next) => {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new MethodController();

      const promise = controller.tags.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.get('/v1/MethodTest/MultiResponse',
    async (context, next) => {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new MethodController();

      const promise = controller.multiResponse.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.get('/v1/MethodTest/SuccessResponse',
    async (context, next) => {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new MethodController();

      const promise = controller.successResponse.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.get('/v1/MethodTest/ApiSecurity',
    authenticateMiddleware('api_key'
    ),
    async (context, next) => {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new MethodController();

      const promise = controller.apiSecurity.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.get('/v1/MethodTest/OauthSecurity',
    authenticateMiddleware('tsoa_auth'
      , ["write:pets", "read:pets"]
    ),
    async (context, next) => {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new MethodController();

      const promise = controller.oauthSecurity.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.get('/v1/MethodTest/DeprecatedMethod',
    async (context, next) => {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new MethodController();

      const promise = controller.deprecatedMethod.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.get('/v1/MethodTest/SummaryMethod',
    async (context, next) => {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new MethodController();

      const promise = controller.summaryMethod.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.get('/v1/ParameterTest/Query',
    async (context, next) => {
      const args = {
        firstname: { "in": "query", "name": "firstname", "required": true, "typeName": "string" },
        lastname: { "in": "query", "name": "last_name", "required": true, "typeName": "string" },
        age: { "in": "query", "name": "age", "required": true, "typeName": "integer" },
        weight: { "in": "query", "name": "weight", "required": true, "typeName": "float" },
        human: { "in": "query", "name": "human", "required": true, "typeName": "boolean" },
        gender: { "in": "query", "name": "gender", "required": true, "typeName": "enum", "enumMembers": ["MALE", "FEMALE"] },
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new ParameterController();

      const promise = controller.getQuery.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.get('/v1/ParameterTest/Path/:firstname/:last_name/:age/:weight/:human/:gender',
    async (context, next) => {
      const args = {
        firstname: { "in": "path", "name": "firstname", "required": true, "typeName": "string" },
        lastname: { "in": "path", "name": "last_name", "required": true, "typeName": "string" },
        age: { "in": "path", "name": "age", "required": true, "typeName": "integer" },
        weight: { "in": "path", "name": "weight", "required": true, "typeName": "float" },
        human: { "in": "path", "name": "human", "required": true, "typeName": "boolean" },
        gender: { "in": "path", "name": "gender", "required": true, "typeName": "enum", "enumMembers": ["MALE", "FEMALE"] },
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new ParameterController();

      const promise = controller.getPath.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.get('/v1/ParameterTest/Header',
    async (context, next) => {
      const args = {
        firstname: { "in": "header", "name": "firstname", "required": true, "typeName": "string" },
        lastname: { "in": "header", "name": "last_name", "required": true, "typeName": "string" },
        age: { "in": "header", "name": "age", "required": true, "typeName": "integer" },
        weight: { "in": "header", "name": "weight", "required": true, "typeName": "float" },
        human: { "in": "header", "name": "human", "required": true, "typeName": "boolean" },
        gender: { "in": "header", "name": "gender", "required": true, "typeName": "enum", "enumMembers": ["MALE", "FEMALE"] },
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new ParameterController();

      const promise = controller.getHeader.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.get('/v1/ParameterTest/Request',
    async (context, next) => {
      const args = {
        request: { "in": "request", "name": "request", "required": true, "typeName": "object" },
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new ParameterController();

      const promise = controller.getRequest.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.post('/v1/ParameterTest/Body',
    async (context, next) => {
      const args = {
        body: { "in": "body", "name": "body", "required": true, "typeName": "ParameterTestModel" },
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new ParameterController();

      const promise = controller.getBody.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.post('/v1/ParameterTest/BodyProps',
    async (context, next) => {
      const args = {
        firstname: { "in": "body-prop", "name": "firstname", "required": true, "typeName": "string" },
        lastname: { "in": "body-prop", "name": "lastname", "required": true, "typeName": "string" },
        age: { "in": "body-prop", "name": "age", "required": true, "typeName": "integer" },
        weight: { "in": "body-prop", "name": "weight", "required": true, "typeName": "float" },
        human: { "in": "body-prop", "name": "human", "required": true, "typeName": "boolean" },
        gender: { "in": "body-prop", "name": "gender", "required": true, "typeName": "enum", "enumMembers": ["MALE", "FEMALE"] },
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new ParameterController();

      const promise = controller.getBodyProps.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.get('/v1/SecurityTest',
    authenticateMiddleware('api_key'
    ),
    async (context, next) => {
      const args = {
        request: { "in": "request", "name": "request", "required": true, "typeName": "object" },
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new SecurityTestController();

      const promise = controller.GetWithApi.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.get('/v1/SecurityTest/Koa',
    authenticateMiddleware('api_key'
    ),
    async (context, next) => {
      const args = {
        ctx: { "in": "request", "name": "ctx", "required": true, "typeName": "object" },
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new SecurityTestController();

      const promise = controller.GetWithApiForKoa.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });
  router.get('/v1/SecurityTest/Oauth',
    authenticateMiddleware('tsoa_auth'
      , ["write:pets", "read:pets"]
    ),
    async (context, next) => {
      const args = {
        request: { "in": "request", "name": "request", "required": true, "typeName": "object" },
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, context);
      } catch (error) {
        context.status = error.status || 500;
        context.body = error;
        return next();
      }

      const controller = new SecurityTestController();

      const promise = controller.GetWithSecurity.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }

      return promiseHandler(promise, statusCode, context, next);
    });

  function authenticateMiddleware(name: string, scopes: string[] = []) {
    return async (context: any, next: any) => {
      koaAuthentication(context.request, name, scopes).then((user: any) => {
        set(context.request, 'user', user);
        next();
      })
        .catch((error: any) => {
          context.status = error.status || 401;
          context.body = error;
          next();
        });
    }
  }

  function promiseHandler(promise: any, statusCode: any, context: KoaRouter.IRouterContext, next: () => Promise<any>) {
    return promise
      .then((data: any) => {
        if (data) {
          context.body = data;
          context.status = (statusCode || 200)
        } else {
          context.status = (statusCode || 204)
        }

        next();
      })
      .catch((error: any) => {
        context.status = error.status || 500;
        context.body = error;
        next();
      });
  }

  function getValidatedArgs(args: any, context: KoaRouter.IRouterContext): any[] {
    return Object.keys(args).map(key => {
      const name = args[key].name;
      switch (args[key].in) {
        case 'request':
          return context;
        case 'query':
          return ValidateParam(args[key], context.request.query[name], models, name)
        case 'path':
          return ValidateParam(args[key], context.params[name], models, name)
        case 'header':
          return ValidateParam(args[key], context.request.headers[name], models, name);
        case 'body':
          return ValidateParam(args[key], context.request.body, models, name);
        case 'body-prop':
          return ValidateParam(args[key], context.request.body[name], models, name);
      }
    });
  }
}
