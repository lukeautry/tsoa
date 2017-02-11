/* tslint:disable */
import { ValidateParam } from '../../../src/routeGeneration/templateHelpers';
import { PutTestController } from './../controllers/putController';
import { PostTestController } from './../controllers/postController';
import { PatchTestController } from './../controllers/patchController';
import { GetTestController } from './../controllers/getController';
import { DeleteTestController } from './../controllers/deleteController';
import { JwtGetTestController } from './../controllers/jwtEnabledController';
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
  'Result': {
    'value': { typeName: 'object', required: true },
  },
  'ErrorResponse': {
    'code': { typeName: 'string', required: true },
    'msg': { typeName: 'string', required: true },
  },
  'BooleanResponseModel': {
    'success': { typeName: 'boolean', required: true },
  },
  'ErrorResponseModel': {
    'status': { typeName: 'number', required: true },
    'message': { typeName: 'string', required: true },
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
        const params = {
          'model': { typeName: 'TestModel', required: true },
        };

        let validatedParams: any[] = [];
        try {
          validatedParams = getValidatedParams(params, request, 'model');
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new PutTestController();
        return promiseHandler(controller.putModel.apply(controller, validatedParams), request, reply);
      }
    }
  });
  server.route({
    method: 'put',
    path: '/v1/PutTest/Location',
    config: {
      handler: (request: any, reply) => {
        const params = {
        };

        let validatedParams: any[] = [];
        try {
          validatedParams = getValidatedParams(params, request, '');
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new PutTestController();
        return promiseHandler(controller.putModelAtLocation.apply(controller, validatedParams), request, reply);
      }
    }
  });
  server.route({
    method: 'put',
    path: '/v1/PutTest/Multi',
    config: {
      handler: (request: any, reply) => {
        const params = {
        };

        let validatedParams: any[] = [];
        try {
          validatedParams = getValidatedParams(params, request, '');
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new PutTestController();
        return promiseHandler(controller.putWithMultiReturn.apply(controller, validatedParams), request, reply);
      }
    }
  });
  server.route({
    method: 'put',
    path: '/v1/PutTest/WithId/{id}',
    config: {
      handler: (request: any, reply) => {
        const params = {
          'id': { typeName: 'number', required: true },
        };

        let validatedParams: any[] = [];
        try {
          validatedParams = getValidatedParams(params, request, '');
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new PutTestController();
        return promiseHandler(controller.putWithId.apply(controller, validatedParams), request, reply);
      }
    }
  });
  server.route({
    method: 'post',
    path: '/v1/PostTest',
    config: {
      handler: (request: any, reply) => {
        const params = {
          'model': { typeName: 'TestModel', required: true },
        };

        let validatedParams: any[] = [];
        try {
          validatedParams = getValidatedParams(params, request, 'model');
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new PostTestController();
        return promiseHandler(controller.postModel.apply(controller, validatedParams), request, reply);
      }
    }
  });
  server.route({
    method: 'patch',
    path: '/v1/PostTest',
    config: {
      handler: (request: any, reply) => {
        const params = {
          'model': { typeName: 'TestModel', required: true },
        };

        let validatedParams: any[] = [];
        try {
          validatedParams = getValidatedParams(params, request, 'model');
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new PostTestController();
        return promiseHandler(controller.updateModel.apply(controller, validatedParams), request, reply);
      }
    }
  });
  server.route({
    method: 'post',
    path: '/v1/PostTest/WithClassModel',
    config: {
      handler: (request: any, reply) => {
        const params = {
          'model': { typeName: 'TestClassModel', required: true },
        };

        let validatedParams: any[] = [];
        try {
          validatedParams = getValidatedParams(params, request, 'model');
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new PostTestController();
        return promiseHandler(controller.postClassModel.apply(controller, validatedParams), request, reply);
      }
    }
  });
  server.route({
    method: 'post',
    path: '/v1/PostTest/Location',
    config: {
      handler: (request: any, reply) => {
        const params = {
        };

        let validatedParams: any[] = [];
        try {
          validatedParams = getValidatedParams(params, request, '');
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new PostTestController();
        return promiseHandler(controller.postModelAtLocation.apply(controller, validatedParams), request, reply);
      }
    }
  });
  server.route({
    method: 'post',
    path: '/v1/PostTest/Multi',
    config: {
      handler: (request: any, reply) => {
        const params = {
        };

        let validatedParams: any[] = [];
        try {
          validatedParams = getValidatedParams(params, request, '');
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new PostTestController();
        return promiseHandler(controller.postWithMultiReturn.apply(controller, validatedParams), request, reply);
      }
    }
  });
  server.route({
    method: 'post',
    path: '/v1/PostTest/WithId/{id}',
    config: {
      handler: (request: any, reply) => {
        const params = {
          'id': { typeName: 'number', required: true },
        };

        let validatedParams: any[] = [];
        try {
          validatedParams = getValidatedParams(params, request, '');
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new PostTestController();
        return promiseHandler(controller.postWithId.apply(controller, validatedParams), request, reply);
      }
    }
  });
  server.route({
    method: 'post',
    path: '/v1/PostTest/WithBodyAndQueryParams',
    config: {
      handler: (request: any, reply) => {
        const params = {
          'model': { typeName: 'TestModel', required: true },
          'query': { typeName: 'string', required: true },
        };

        let validatedParams: any[] = [];
        try {
          validatedParams = getValidatedParams(params, request, 'model');
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new PostTestController();
        return promiseHandler(controller.postWithBodyAndQueryParams.apply(controller, validatedParams), request, reply);
      }
    }
  });
  server.route({
    method: 'patch',
    path: '/v1/PatchTest',
    config: {
      handler: (request: any, reply) => {
        const params = {
          'model': { typeName: 'TestModel', required: true },
        };

        let validatedParams: any[] = [];
        try {
          validatedParams = getValidatedParams(params, request, 'model');
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new PatchTestController();
        return promiseHandler(controller.patchModel.apply(controller, validatedParams), request, reply);
      }
    }
  });
  server.route({
    method: 'patch',
    path: '/v1/PatchTest/Location',
    config: {
      handler: (request: any, reply) => {
        const params = {
        };

        let validatedParams: any[] = [];
        try {
          validatedParams = getValidatedParams(params, request, '');
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new PatchTestController();
        return promiseHandler(controller.patchModelAtLocation.apply(controller, validatedParams), request, reply);
      }
    }
  });
  server.route({
    method: 'patch',
    path: '/v1/PatchTest/Multi',
    config: {
      handler: (request: any, reply) => {
        const params = {
        };

        let validatedParams: any[] = [];
        try {
          validatedParams = getValidatedParams(params, request, '');
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new PatchTestController();
        return promiseHandler(controller.patchWithMultiReturn.apply(controller, validatedParams), request, reply);
      }
    }
  });
  server.route({
    method: 'patch',
    path: '/v1/PatchTest/WithId/{id}',
    config: {
      handler: (request: any, reply) => {
        const params = {
          'id': { typeName: 'number', required: true },
        };

        let validatedParams: any[] = [];
        try {
          validatedParams = getValidatedParams(params, request, '');
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new PatchTestController();
        return promiseHandler(controller.patchWithId.apply(controller, validatedParams), request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest',
    config: {
      handler: (request: any, reply) => {
        const params = {
        };

        let validatedParams: any[] = [];
        try {
          validatedParams = getValidatedParams(params, request, '');
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new GetTestController();
        return promiseHandler(controller.getModel.apply(controller, validatedParams), request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/Current',
    config: {
      handler: (request: any, reply) => {
        const params = {
        };

        let validatedParams: any[] = [];
        try {
          validatedParams = getValidatedParams(params, request, '');
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new GetTestController();
        return promiseHandler(controller.getCurrentModel.apply(controller, validatedParams), request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/ClassModel',
    config: {
      handler: (request: any, reply) => {
        const params = {
        };

        let validatedParams: any[] = [];
        try {
          validatedParams = getValidatedParams(params, request, '');
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new GetTestController();
        return promiseHandler(controller.getClassModel.apply(controller, validatedParams), request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/Multi',
    config: {
      handler: (request: any, reply) => {
        const params = {
        };

        let validatedParams: any[] = [];
        try {
          validatedParams = getValidatedParams(params, request, '');
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new GetTestController();
        return promiseHandler(controller.getMultipleModels.apply(controller, validatedParams), request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/{numberPathParam}/{booleanPathParam}/{stringPathParam}',
    config: {
      handler: (request: any, reply) => {
        const params = {
          'numberPathParam': { typeName: 'number', required: true },
          'stringPathParam': { typeName: 'string', required: true },
          'booleanPathParam': { typeName: 'boolean', required: true },
          'booleanParam': { typeName: 'boolean', required: true },
          'stringParam': { typeName: 'string', required: true },
          'numberParam': { typeName: 'number', required: true },
          'optionalStringParam': { typeName: 'string', required: false },
        };

        let validatedParams: any[] = [];
        try {
          validatedParams = getValidatedParams(params, request, '');
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new GetTestController();
        return promiseHandler(controller.getModelByParams.apply(controller, validatedParams), request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/ResponseWithUnionTypeProperty',
    config: {
      handler: (request: any, reply) => {
        const params = {
        };

        let validatedParams: any[] = [];
        try {
          validatedParams = getValidatedParams(params, request, '');
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new GetTestController();
        return promiseHandler(controller.getResponseWithUnionTypeProperty.apply(controller, validatedParams), request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/UnionTypeResponse',
    config: {
      handler: (request: any, reply) => {
        const params = {
        };

        let validatedParams: any[] = [];
        try {
          validatedParams = getValidatedParams(params, request, '');
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new GetTestController();
        return promiseHandler(controller.getUnionTypeResponse.apply(controller, validatedParams), request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/InjectedRequest',
    config: {
      handler: (request: any, reply) => {
        const params = {
          'request': { typeName: 'object', required: true, injected: 'request' },
        };

        let validatedParams: any[] = [];
        try {
          validatedParams = getValidatedParams(params, request, '');
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new GetTestController();
        return promiseHandler(controller.getInjectedRequest.apply(controller, validatedParams), request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/InjectedValue',
    config: {
      handler: (request: any, reply) => {
        const params = {
          'someValue': { typeName: 'object', required: true, injected: 'inject' },
        };

        let validatedParams: any[] = [];
        try {
          validatedParams = getValidatedParams(params, request, '');
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new GetTestController();
        return promiseHandler(controller.getInjectedValue.apply(controller, validatedParams), request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/DateParam',
    config: {
      handler: (request: any, reply) => {
        const params = {
          'date': { typeName: 'datetime', required: true },
        };

        let validatedParams: any[] = [];
        try {
          validatedParams = getValidatedParams(params, request, '');
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new GetTestController();
        return promiseHandler(controller.getByDataParam.apply(controller, validatedParams), request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/ThrowsError',
    config: {
      handler: (request: any, reply) => {
        const params = {
        };

        let validatedParams: any[] = [];
        try {
          validatedParams = getValidatedParams(params, request, '');
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new GetTestController();
        return promiseHandler(controller.getThrowsError.apply(controller, validatedParams), request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/GeneratesTags',
    config: {
      handler: (request: any, reply) => {
        const params = {
        };

        let validatedParams: any[] = [];
        try {
          validatedParams = getValidatedParams(params, request, '');
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new GetTestController();
        return promiseHandler(controller.getGeneratesTags.apply(controller, validatedParams), request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/HandleBufferType',
    config: {
      handler: (request: any, reply) => {
        const params = {
          'buffer': { typeName: 'buffer', required: true },
        };

        let validatedParams: any[] = [];
        try {
          validatedParams = getValidatedParams(params, request, '');
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new GetTestController();
        return promiseHandler(controller.getBuffer.apply(controller, validatedParams), request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/DefaultResponse',
    config: {
      handler: (request: any, reply) => {
        const params = {
        };

        let validatedParams: any[] = [];
        try {
          validatedParams = getValidatedParams(params, request, '');
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new GetTestController();
        return promiseHandler(controller.getDefaultResponse.apply(controller, validatedParams), request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/Response',
    config: {
      handler: (request: any, reply) => {
        const params = {
        };

        let validatedParams: any[] = [];
        try {
          validatedParams = getValidatedParams(params, request, '');
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new GetTestController();
        return promiseHandler(controller.getResponse.apply(controller, validatedParams), request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/ApiSecurity',
    config: {
      pre: [
        {
          method: authenticateMiddleware('api_key'
          )
        }
      ],
      handler: (request: any, reply) => {
        const params = {
        };

        let validatedParams: any[] = [];
        try {
          validatedParams = getValidatedParams(params, request, '');
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new GetTestController();
        return promiseHandler(controller.getApiSecurity.apply(controller, validatedParams), request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/GetTest/OauthSecurity',
    config: {
      pre: [
        {
          method: authenticateMiddleware('tsoa_auth'
            , [
              'read:pets'
            ]
          )        
}
      ],
      handler: (request: any, reply) => {
        const params = {
        };

        let validatedParams: any[] = [];
        try {
          validatedParams = getValidatedParams(params, request, '');
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new GetTestController();
        return promiseHandler(controller.getOauthSecurity.apply(controller, validatedParams), request, reply);
      }
    }
  });
  server.route({
    method: 'delete',
    path: '/v1/DeleteTest',
    config: {
      handler: (request: any, reply) => {
        const params = {
        };

        let validatedParams: any[] = [];
        try {
          validatedParams = getValidatedParams(params, request, '');
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new DeleteTestController();
        return promiseHandler(controller.deleteWithReturnValue.apply(controller, validatedParams), request, reply);
      }
    }
  });
  server.route({
    method: 'delete',
    path: '/v1/DeleteTest/Current',
    config: {
      handler: (request: any, reply) => {
        const params = {
        };

        let validatedParams: any[] = [];
        try {
          validatedParams = getValidatedParams(params, request, '');
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new DeleteTestController();
        return promiseHandler(controller.deleteCurrent.apply(controller, validatedParams), request, reply);
      }
    }
  });
  server.route({
    method: 'delete',
    path: '/v1/DeleteTest/{numberPathParam}/{booleanPathParam}/{stringPathParam}',
    config: {
      handler: (request: any, reply) => {
        const params = {
          'numberPathParam': { typeName: 'number', required: true },
          'stringPathParam': { typeName: 'string', required: true },
          'booleanPathParam': { typeName: 'boolean', required: true },
          'booleanParam': { typeName: 'boolean', required: true },
          'stringParam': { typeName: 'string', required: true },
          'numberParam': { typeName: 'number', required: true },
        };

        let validatedParams: any[] = [];
        try {
          validatedParams = getValidatedParams(params, request, '');
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new DeleteTestController();
        return promiseHandler(controller.getModelByParams.apply(controller, validatedParams), request, reply);
      }
    }
  });
  server.route({
    method: 'get',
    path: '/v1/JwtGetTest',
    config: {
      handler: (request: any, reply) => {
        const params = {
        };

        let validatedParams: any[] = [];
        try {
          validatedParams = getValidatedParams(params, request, '');
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new JwtGetTestController();
        return promiseHandler(controller.GetWithJwt.apply(controller, validatedParams), request, reply);
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
        const params = {
          'request': { typeName: 'object', required: true, injected: 'request' },
        };

        let validatedParams: any[] = [];
        try {
          validatedParams = getValidatedParams(params, request, '');
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new SecurityTestController();
        return promiseHandler(controller.GetWithApi.apply(controller, validatedParams), request, reply);
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
        const params = {
          'ctx': { typeName: 'object', required: true, injected: 'request' },
        };

        let validatedParams: any[] = [];
        try {
          validatedParams = getValidatedParams(params, request, '');
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new SecurityTestController();
        return promiseHandler(controller.GetWithApiForKoa.apply(controller, validatedParams), request, reply);
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
        const params = {
          'request': { typeName: 'object', required: true, injected: 'request' },
        };

        let validatedParams: any[] = [];
        try {
          validatedParams = getValidatedParams(params, request, '');
        } catch (err) {
          return reply(err).code(err.status || 500);
        }

        const controller = new SecurityTestController();
        return promiseHandler(controller.GetWithSecurity.apply(controller, validatedParams), request, reply);
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

  function promiseHandler(promise: any, request: hapi.Request, reply: hapi.IReply) {
    return promise
      .then((data: any) => {
        if (data) {
          return reply(data);
        }

        return (reply as any)().code(204);
      })
      .catch((error: any) => reply(error).code(error.status || 500));
  }

  function getRequestParams(request: hapi.Request, bodyParamName?: string) {
    const merged: any = {};
    if (bodyParamName) {
      merged[bodyParamName] = request.payload;
    }

    for (let attrname in request.params) { merged[attrname] = request.params[attrname]; }
    for (let attrname in request.query) { merged[attrname] = request.query[attrname]; }
    return merged;
  }

  function getValidatedParams(params: any, request: hapi.Request, bodyParamName?: string): any[] {
    const requestParams = getRequestParams(request, bodyParamName);

    return Object.keys(params).map(key => {
      switch (params[key].injected) {
        case 'inject':
          return undefined;
        case 'request':
          return request;
        default:
          return ValidateParam(params[key], requestParams[key], models, key);
      }
    });
  }
}
