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
  'TestSubModel': {
    'email': { typeName: 'string', required: true },
    'circular': { typeName: 'TestModel', required: false },
    'id': { typeName: 'number', required: true },
  },
  'StrLiteral': {
  },
  'TestModel': {
    'numberValue': { typeName: 'number', required: true },
    'numberArray': { typeName: 'array', required: true, arrayType: 'number' },
    'stringValue': { typeName: 'string', required: true },
    'stringArray': { typeName: 'array', required: true, arrayType: 'string' },
    'boolValue': { typeName: 'boolean', required: true },
    'boolArray': { typeName: 'array', required: true, arrayType: 'boolean' },
    'modelValue': { typeName: 'TestSubModel', required: true },
    'modelsArray': { typeName: 'array', required: true, arrayType: 'TestSubModel' },
    'strLiteralVal': { typeName: 'StrLiteral', required: true },
    'strLiteralArr': { typeName: 'array', required: true, arrayType: 'StrLiteral' },
    'dateValue': { typeName: 'datetime', required: false },
    'optionalString': { typeName: 'string', required: false },
    'id': { typeName: 'number', required: true },
  },
  'TestClassModel': {
    'publicStringProperty': { typeName: 'string', required: true },
    'optionalPublicStringProperty': { typeName: 'string', required: false },
    'stringProperty': { typeName: 'string', required: true },
    'publicConstructorVar': { typeName: 'string', required: true },
    'optionalPublicConstructorVar': { typeName: 'string', required: false },
    'id': { typeName: 'number', required: true },
  },
  'GenericRequest<TestModel>': {
    'name': { typeName: 'string', required: true },
    'value': { typeName: 'TestModel', required: true },
  },
  'Result': {
    'value': { typeName: 'object', required: true },
  },
  'GenericModel<TestModel>': {
    'result': { typeName: 'TestModel', required: true },
  },
  'GenericModel<TestModel[]>': {
    'result': { typeName: 'array', required: true, arrayType: 'TestModel' },
  },
  'GenericModel<string>': {
    'result': { typeName: 'string', required: true },
  },
  'GenericModel<string[]>': {
    'result': { typeName: 'array', required: true, arrayType: 'string' },
  },
  'ErrorResponseModel': {
    'status': { typeName: 'number', required: true },
    'message': { typeName: 'string', required: true },
  },
  'ParameterTestModel': {
    'firstname': { typeName: 'string', required: true },
    'lastname': { typeName: 'string', required: true },
    'age': { typeName: 'number', required: true },
    'human': { typeName: 'boolean', required: true },
  },
  'UserResponseModel': {
    'id': { typeName: 'number', required: true },
    'name': { typeName: 'string', required: true },
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
        'model': { name: 'model', typeName: 'TestModel', required: true, in: 'body', },
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
        'id': { name: 'id', typeName: 'number', required: true, in: 'path', },
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
        'model': { name: 'model', typeName: 'TestModel', required: true, in: 'body', },
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
        'model': { name: 'model', typeName: 'TestModel', required: true, in: 'body', },
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
        'model': { name: 'model', typeName: 'TestClassModel', required: true, in: 'body', },
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
        'id': { name: 'id', typeName: 'number', required: true, in: 'path', },
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
        'model': { name: 'model', typeName: 'TestModel', required: true, in: 'body', },
        'query': { name: 'query', typeName: 'string', required: true, in: 'query', },
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
        'genericReq': { name: 'genericReq', typeName: 'GenericRequest<TestModel>', required: true, in: 'body', },
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
        'model': { name: 'model', typeName: 'TestModel', required: true, in: 'body', },
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
        'id': { name: 'id', typeName: 'number', required: true, in: 'path', },
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
        'numberPathParam': { name: 'numberPathParam', typeName: 'number', required: true, in: 'path', },
        'stringPathParam': { name: 'stringPathParam', typeName: 'string', required: true, in: 'path', },
        'booleanPathParam': { name: 'booleanPathParam', typeName: 'boolean', required: true, in: 'path', },
        'booleanParam': { name: 'booleanParam', typeName: 'boolean', required: true, in: 'query', },
        'stringParam': { name: 'stringParam', typeName: 'string', required: true, in: 'query', },
        'numberParam': { name: 'numberParam', typeName: 'number', required: true, in: 'query', },
        'optionalStringParam': { name: 'optionalStringParam', typeName: 'string', required: false, in: 'query', },
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
        'request': { name: 'request', typeName: 'object', required: true, in: 'request', },
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
        'date': { name: 'date', typeName: 'datetime', required: true, in: 'query', },
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
        'buffer': { name: 'buffer', typeName: 'buffer', required: true, in: 'query', },
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
        'numberPathParam': { name: 'numberPathParam', typeName: 'number', required: true, in: 'path', },
        'stringPathParam': { name: 'stringPathParam', typeName: 'string', required: true, in: 'path', },
        'booleanPathParam': { name: 'booleanPathParam', typeName: 'boolean', required: true, in: 'path', },
        'booleanParam': { name: 'booleanParam', typeName: 'boolean', required: true, in: 'query', },
        'stringParam': { name: 'stringParam', typeName: 'string', required: true, in: 'query', },
        'numberParam': { name: 'numberParam', typeName: 'number', required: true, in: 'query', },
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
      , [
        'write:pets',
        'read:pets'
      ]
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
  router.get('/v1/ParameterTest/Query',
    async (context, next) => {
      const args = {
        'firstname': { name: 'firstname', typeName: 'string', required: true, in: 'query', },
        'lastname': { name: 'last_name', typeName: 'string', required: true, in: 'query', },
        'age': { name: 'age', typeName: 'number', required: true, in: 'query', },
        'human': { name: 'human', typeName: 'boolean', required: true, in: 'query', },
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
  router.get('/v1/ParameterTest/Path/:firstname/:last_name/:age/:human',
    async (context, next) => {
      const args = {
        'firstname': { name: 'firstname', typeName: 'string', required: true, in: 'path', },
        'lastname': { name: 'last_name', typeName: 'string', required: true, in: 'path', },
        'age': { name: 'age', typeName: 'number', required: true, in: 'path', },
        'human': { name: 'human', typeName: 'boolean', required: true, in: 'path', },
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
        'firstname': { name: 'firstname', typeName: 'string', required: true, in: 'header', },
        'lastname': { name: 'last_name', typeName: 'string', required: true, in: 'header', },
        'age': { name: 'age', typeName: 'number', required: true, in: 'header', },
        'human': { name: 'human', typeName: 'boolean', required: true, in: 'header', },
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
        'request': { name: 'request', typeName: 'object', required: true, in: 'request', },
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
        'body': { name: 'body', typeName: 'ParameterTestModel', required: true, in: 'body', },
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
        'firstname': { name: 'firstname', typeName: 'string', required: true, in: 'body-props', },
        'lastname': { name: 'lastname', typeName: 'string', required: true, in: 'body-props', },
        'human': { name: 'human', typeName: 'boolean', required: true, in: 'body-props', },
        'age': { name: 'age', typeName: 'number', required: true, in: 'body-props', },
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
        'request': { name: 'request', typeName: 'object', required: true, in: 'request', },
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
        'ctx': { name: 'ctx', typeName: 'object', required: true, in: 'request', },
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
      , [
        'write:pets',
        'read:pets'
      ]
    ),
    async (context, next) => {
      const args = {
        'request': { name: 'request', typeName: 'object', required: true, in: 'request', },
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
        case 'body-props':
          return ValidateParam(args[key], context.request.body[name], models, name);
      }
    });
  }
}
