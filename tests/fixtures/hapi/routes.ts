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
  'TestSubModel': {
    'email': { typeName: 'string', required: true },
    'circular': { typeName: 'TestModel', required: false },
    'id': { typeName: 'number', required: true },
  },
  'StrLiteral': {
  },
  'TestClassModel': {
    'publicStringProperty': { typeName: 'string', required: true },
    'optionalPublicStringProperty': { typeName: 'string', required: false },
    'stringProperty': { typeName: 'string', required: true },
    'publicConstructorVar': { typeName: 'string', required: true },
    'optionalPublicConstructorVar': { typeName: 'string', required: false },
    'id': { typeName: 'number', required: true },
  },
  'GenericRequestTestModel': {
    'name': { typeName: 'string', required: true },
    'value': { typeName: 'TestModel', required: true },
  },
  'Result': {
    'value': { typeName: 'object', required: true },
  },
  'GenericModelTestModel': {
    'result': { typeName: 'TestModel', required: true },
  },
  'GenericModelTestModel[]': {
    'result': { typeName: 'array', required: true, arrayType: 'TestModel' },
  },
  'GenericModelstring': {
    'result': { typeName: 'string', required: true },
  },
  'GenericModelstring[]': {
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
import * as hapi from 'hapi';
import { set } from 'lodash';
import { hapiAuthentication } from './authentication';

export function RegisterRoutes(server: hapi.Server) {
  server.route({
    method: 'put',
    path: '/v1/PutTest',
    config: {
      handler: (request: any, reply) => {
        const args = {
          'model': { name: 'model', typeName: 'TestModel', required: true, in: 'body', },
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new PutTestController();

        const promise = controller.putModel.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'put',
    path: '/v1/PutTest/Location',
    config: {
      handler: (request: any, reply) => {
        const args = {
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new PutTestController();

        const promise = controller.putModelAtLocation.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'put',
    path: '/v1/PutTest/Multi',
    config: {
      handler: (request: any, reply) => {
        const args = {
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new PutTestController();

        const promise = controller.putWithMultiReturn.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'put',
    path: '/v1/PutTest/WithId/{id}',
    config: {
      handler: (request: any, reply) => {
        const args = {
          'id': { name: 'id', typeName: 'number', required: true, in: 'path', },
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new PutTestController();

        const promise = controller.putWithId.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'post',
    path: '/v1/PostTest',
    config: {
      handler: (request: any, reply) => {
        const args = {
          'model': { name: 'model', typeName: 'TestModel', required: true, in: 'body', },
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new PostTestController();

        const promise = controller.postModel.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'patch',
    path: '/v1/PostTest',
    config: {
      handler: (request: any, reply) => {
        const args = {
          'model': { name: 'model', typeName: 'TestModel', required: true, in: 'body', },
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new PostTestController();

        const promise = controller.updateModel.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'post',
    path: '/v1/PostTest/WithClassModel',
    config: {
      handler: (request: any, reply) => {
        const args = {
          'model': { name: 'model', typeName: 'TestClassModel', required: true, in: 'body', },
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new PostTestController();

        const promise = controller.postClassModel.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'post',
    path: '/v1/PostTest/Location',
    config: {
      handler: (request: any, reply) => {
        const args = {
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new PostTestController();

        const promise = controller.postModelAtLocation.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'post',
    path: '/v1/PostTest/Multi',
    config: {
      handler: (request: any, reply) => {
        const args = {
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new PostTestController();

        const promise = controller.postWithMultiReturn.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'post',
    path: '/v1/PostTest/WithId/{id}',
    config: {
      handler: (request: any, reply) => {
        const args = {
          'id': { name: 'id', typeName: 'number', required: true, in: 'path', },
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new PostTestController();

        const promise = controller.postWithId.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'post',
    path: '/v1/PostTest/WithBodyAndQueryParams',
    config: {
      handler: (request: any, reply) => {
        const args = {
          'model': { name: 'model', typeName: 'TestModel', required: true, in: 'body', },
          'query': { name: 'query', typeName: 'string', required: true, in: 'query', },
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new PostTestController();

        const promise = controller.postWithBodyAndQueryParams.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'post',
    path: '/v1/PostTest/GenericBody',
    config: {
      handler: (request: any, reply) => {
        const args = {
          'genericReq': { name: 'genericReq', typeName: 'GenericRequestTestModel', required: true, in: 'body', },
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new PostTestController();

        const promise = controller.getGenericRequest.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'patch',
    path: '/v1/PatchTest',
    config: {
      handler: (request: any, reply) => {
        const args = {
          'model': { name: 'model', typeName: 'TestModel', required: true, in: 'body', },
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new PatchTestController();

        const promise = controller.patchModel.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'patch',
    path: '/v1/PatchTest/Location',
    config: {
      handler: (request: any, reply) => {
        const args = {
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new PatchTestController();

        const promise = controller.patchModelAtLocation.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'patch',
    path: '/v1/PatchTest/Multi',
    config: {
      handler: (request: any, reply) => {
        const args = {
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new PatchTestController();

        const promise = controller.patchWithMultiReturn.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'patch',
    path: '/v1/PatchTest/WithId/{id}',
    config: {
      handler: (request: any, reply) => {
        const args = {
          'id': { name: 'id', typeName: 'number', required: true, in: 'path', },
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new PatchTestController();

        const promise = controller.patchWithId.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest',
    config: {
      handler: (request: any, reply) => {
        const args = {
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new GetTestController();

        const promise = controller.getModel.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/Current',
    config: {
      handler: (request: any, reply) => {
        const args = {
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new GetTestController();

        const promise = controller.getCurrentModel.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/ClassModel',
    config: {
      handler: (request: any, reply) => {
        const args = {
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new GetTestController();

        const promise = controller.getClassModel.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/Multi',
    config: {
      handler: (request: any, reply) => {
        const args = {
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new GetTestController();

        const promise = controller.getMultipleModels.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/{numberPathParam}/{booleanPathParam}/{stringPathParam}',
    config: {
      handler: (request: any, reply) => {
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
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new GetTestController();

        const promise = controller.getModelByParams.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/ResponseWithUnionTypeProperty',
    config: {
      handler: (request: any, reply) => {
        const args = {
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new GetTestController();

        const promise = controller.getResponseWithUnionTypeProperty.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/UnionTypeResponse',
    config: {
      handler: (request: any, reply) => {
        const args = {
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new GetTestController();

        const promise = controller.getUnionTypeResponse.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/Request',
    config: {
      handler: (request: any, reply) => {
        const args = {
          'request': { name: 'request', typeName: 'object', required: true, in: 'request', },
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new GetTestController();

        const promise = controller.getRequest.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/DateParam',
    config: {
      handler: (request: any, reply) => {
        const args = {
          'date': { name: 'date', typeName: 'datetime', required: true, in: 'query', },
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new GetTestController();

        const promise = controller.getByDataParam.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/ThrowsError',
    config: {
      handler: (request: any, reply) => {
        const args = {
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new GetTestController();

        const promise = controller.getThrowsError.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/GeneratesTags',
    config: {
      handler: (request: any, reply) => {
        const args = {
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new GetTestController();

        const promise = controller.getGeneratesTags.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/HandleBufferType',
    config: {
      handler: (request: any, reply) => {
        const args = {
          'buffer': { name: 'buffer', typeName: 'buffer', required: true, in: 'query', },
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new GetTestController();

        const promise = controller.getBuffer.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/GenericModel',
    config: {
      handler: (request: any, reply) => {
        const args = {
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new GetTestController();

        const promise = controller.getGenericModel.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/GenericModelArray',
    config: {
      handler: (request: any, reply) => {
        const args = {
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new GetTestController();

        const promise = controller.getGenericModelArray.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/GenericPrimitive',
    config: {
      handler: (request: any, reply) => {
        const args = {
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new GetTestController();

        const promise = controller.getGenericPrimitive.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/GenericPrimitiveArray',
    config: {
      handler: (request: any, reply) => {
        const args = {
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new GetTestController();

        const promise = controller.getGenericPrimitiveArray.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'delete',
    path: '/v1/DeleteTest',
    config: {
      handler: (request: any, reply) => {
        const args = {
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new DeleteTestController();

        const promise = controller.deleteWithReturnValue.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'delete',
    path: '/v1/DeleteTest/Current',
    config: {
      handler: (request: any, reply) => {
        const args = {
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new DeleteTestController();

        const promise = controller.deleteCurrent.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'delete',
    path: '/v1/DeleteTest/{numberPathParam}/{booleanPathParam}/{stringPathParam}',
    config: {
      handler: (request: any, reply) => {
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
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new DeleteTestController();

        const promise = controller.getModelByParams.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/MethodTest/Get',
    config: {
      handler: (request: any, reply) => {
        const args = {
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new MethodController();

        const promise = controller.getMethod.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'post',
    path: '/v1/MethodTest/Post',
    config: {
      handler: (request: any, reply) => {
        const args = {
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new MethodController();

        const promise = controller.postMethod.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'patch',
    path: '/v1/MethodTest/Patch',
    config: {
      handler: (request: any, reply) => {
        const args = {
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new MethodController();

        const promise = controller.patchMethod.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'put',
    path: '/v1/MethodTest/Put',
    config: {
      handler: (request: any, reply) => {
        const args = {
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new MethodController();

        const promise = controller.putMethod.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'delete',
    path: '/v1/MethodTest/Delete',
    config: {
      handler: (request: any, reply) => {
        const args = {
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new MethodController();

        const promise = controller.deleteMethod.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/MethodTest/Description',
    config: {
      handler: (request: any, reply) => {
        const args = {
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new MethodController();

        const promise = controller.description.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/MethodTest/Tags',
    config: {
      handler: (request: any, reply) => {
        const args = {
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new MethodController();

        const promise = controller.tags.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/MethodTest/MultiResponse',
    config: {
      handler: (request: any, reply) => {
        const args = {
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new MethodController();

        const promise = controller.multiResponse.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/MethodTest/SuccessResponse',
    config: {
      handler: (request: any, reply) => {
        const args = {
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new MethodController();

        const promise = controller.successResponse.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/MethodTest/ApiSecurity',
    config: {
      pre: [
        {
          method: authenticateMiddleware('api_key'
          )
        }
      ],
      handler: (request: any, reply) => {
        const args = {
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new MethodController();

        const promise = controller.apiSecurity.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/MethodTest/OauthSecurity',
    config: {
      pre: [
        {
          method: authenticateMiddleware('tsoa_auth'
            , [
              'write:pets',
              'read:pets'
            ]
          )        
}
      ],
      handler: (request: any, reply) => {
        const args = {
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new MethodController();

        const promise = controller.oauthSecurity.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/MethodTest/DeprecatedMethod',
    config: {
      handler: (request: any, reply) => {
        const args = {
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new MethodController();

        const promise = controller.deprecatedMethod.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/ParameterTest/Query',
    config: {
      handler: (request: any, reply) => {
        const args = {
          'firstname': { name: 'firstname', typeName: 'string', required: true, in: 'query', },
          'lastname': { name: 'last_name', typeName: 'string', required: true, in: 'query', },
          'age': { name: 'age', typeName: 'number', required: true, in: 'query', },
          'human': { name: 'human', typeName: 'boolean', required: true, in: 'query', },
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new ParameterController();

        const promise = controller.getQuery.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/ParameterTest/Path/{firstname}/{last_name}/{age}/{human}',
    config: {
      handler: (request: any, reply) => {
        const args = {
          'firstname': { name: 'firstname', typeName: 'string', required: true, in: 'path', },
          'lastname': { name: 'last_name', typeName: 'string', required: true, in: 'path', },
          'age': { name: 'age', typeName: 'number', required: true, in: 'path', },
          'human': { name: 'human', typeName: 'boolean', required: true, in: 'path', },
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new ParameterController();

        const promise = controller.getPath.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/ParameterTest/Header',
    config: {
      handler: (request: any, reply) => {
        const args = {
          'firstname': { name: 'firstname', typeName: 'string', required: true, in: 'header', },
          'lastname': { name: 'last_name', typeName: 'string', required: true, in: 'header', },
          'age': { name: 'age', typeName: 'number', required: true, in: 'header', },
          'human': { name: 'human', typeName: 'boolean', required: true, in: 'header', },
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new ParameterController();

        const promise = controller.getHeader.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/ParameterTest/Request',
    config: {
      handler: (request: any, reply) => {
        const args = {
          'request': { name: 'request', typeName: 'object', required: true, in: 'request', },
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new ParameterController();

        const promise = controller.getRequest.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'post',
    path: '/v1/ParameterTest/Body',
    config: {
      handler: (request: any, reply) => {
        const args = {
          'body': { name: 'body', typeName: 'ParameterTestModel', required: true, in: 'body', },
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new ParameterController();

        const promise = controller.getBody.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'post',
    path: '/v1/ParameterTest/BodyProps',
    config: {
      handler: (request: any, reply) => {
        const args = {
          'firstname': { name: 'firstname', typeName: 'string', required: true, in: 'body-prop', },
          'lastname': { name: 'lastname', typeName: 'string', required: true, in: 'body-prop', },
          'human': { name: 'human', typeName: 'boolean', required: true, in: 'body-prop', },
          'age': { name: 'age', typeName: 'number', required: true, in: 'body-prop', },
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new ParameterController();

        const promise = controller.getBodyProps.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/SecurityTest',
    config: {
      pre: [
        {
          method: authenticateMiddleware('api_key'
          )        
}
      ],
      handler: (request: any, reply) => {
        const args = {
          'request': { name: 'request', typeName: 'object', required: true, in: 'request', },
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new SecurityTestController();

        const promise = controller.GetWithApi.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/SecurityTest/Koa',
    config: {
      pre: [
        {
          method: authenticateMiddleware('api_key'
          )
        }
      ],
      handler: (request: any, reply) => {
        const args = {
          'ctx': { name: 'ctx', typeName: 'object', required: true, in: 'request', },
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new SecurityTestController();

        const promise = controller.GetWithApiForKoa.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/SecurityTest/Oauth',
    config: {
      pre: [
        {
          method: authenticateMiddleware('tsoa_auth'
            , [
              'write:pets',
              'read:pets'
            ]
          )
        }
      ],
      handler: (request: any, reply) => {
        const args = {
          'request': { name: 'request', typeName: 'object', required: true, in: 'request', },
        };

        let validatedArgs: any[] = [];
        try {
          validatedArgs = getValidatedArgs(args, request);
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new SecurityTestController();

        const promise = controller.GetWithSecurity.apply(controller, validatedArgs);
        let statusCode = undefined;
        if (controller instanceof Controller) {
          statusCode = (controller as Controller).getStatus();
        }
        return promiseHandler(promise, statusCode, request, reply);
      }
    }
  });

  function authenticateMiddleware(name: string, scopes: string[] = []) {
    return (request: hapi.Request, reply: hapi.IReply) => {
      hapiAuthentication(request, name, scopes).then((user: any) => {
        set(request, 'user', user);
        reply.continue();
      })
        .catch((error: any) => reply(error).code(error.status || 401));
    }
  }

  function promiseHandler(promise: any, statusCode: any, request: hapi.Request, reply: hapi.IReply) {
    return promise
      .then((data: any) => {
        if (data) {
          return reply(data).code(statusCode || 200);
        } else {
          return (reply as any)().code(statusCode || 204);
        }
      })
      .catch((error: any) => reply(error).code(error.status || 500));
  }

  function getValidatedArgs(args: any, request: hapi.Request): any[] {
    return Object.keys(args).map(key => {
      const name = args[key].name;
      switch (args[key].in) {
        case 'request':
          return request;
        case 'query':
          return ValidateParam(args[key], request.query[name], models, name)
        case 'path':
          return ValidateParam(args[key], request.params[name], models, name)
        case 'header':
          return ValidateParam(args[key], request.headers[name], models, name);
        case 'body':
          return ValidateParam(args[key], request.payload, models, name);
        case 'body-prop':
          return ValidateParam(args[key], request.payload[name], models, name);
      }
    });
  }
}
