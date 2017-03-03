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
  'Result': {
    'value': { typeName: 'object', required: true },
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

import { set } from 'lodash';
import { expressAuthentication } from './authentication';

/* tslint:disable:forin */
export function RegisterRoutes(app: any) {
  app.put('/v1/PutTest',
    function(request: any, response: any, next: any) {
      const args = {
        'model': { name: 'model', typeName: 'TestModel', required: true, in: 'body', },
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new PutTestController();


      const promise = controller.putModel.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.put('/v1/PutTest/Location',
    function(request: any, response: any, next: any) {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new PutTestController();


      const promise = controller.putModelAtLocation.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.put('/v1/PutTest/Multi',
    function(request: any, response: any, next: any) {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new PutTestController();


      const promise = controller.putWithMultiReturn.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.put('/v1/PutTest/WithId/:id',
    function(request: any, response: any, next: any) {
      const args = {
        'id': { name: 'id', typeName: 'number', required: true, in: 'path', },
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new PutTestController();


      const promise = controller.putWithId.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.post('/v1/PostTest',
    function(request: any, response: any, next: any) {
      const args = {
        'model': { name: 'model', typeName: 'TestModel', required: true, in: 'body', },
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new PostTestController();


      const promise = controller.postModel.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.patch('/v1/PostTest',
    function(request: any, response: any, next: any) {
      const args = {
        'model': { name: 'model', typeName: 'TestModel', required: true, in: 'body', },
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new PostTestController();


      const promise = controller.updateModel.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.post('/v1/PostTest/WithClassModel',
    function(request: any, response: any, next: any) {
      const args = {
        'model': { name: 'model', typeName: 'TestClassModel', required: true, in: 'body', },
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new PostTestController();


      const promise = controller.postClassModel.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.post('/v1/PostTest/Location',
    function(request: any, response: any, next: any) {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new PostTestController();


      const promise = controller.postModelAtLocation.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.post('/v1/PostTest/Multi',
    function(request: any, response: any, next: any) {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new PostTestController();


      const promise = controller.postWithMultiReturn.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.post('/v1/PostTest/WithId/:id',
    function(request: any, response: any, next: any) {
      const args = {
        'id': { name: 'id', typeName: 'number', required: true, in: 'path', },
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new PostTestController();


      const promise = controller.postWithId.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.post('/v1/PostTest/WithBodyAndQueryParams',
    function(request: any, response: any, next: any) {
      const args = {
        'model': { name: 'model', typeName: 'TestModel', required: true, in: 'body', },
        'query': { name: 'query', typeName: 'string', required: true, in: 'query', },
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new PostTestController();


      const promise = controller.postWithBodyAndQueryParams.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.patch('/v1/PatchTest',
    function(request: any, response: any, next: any) {
      const args = {
        'model': { name: 'model', typeName: 'TestModel', required: true, in: 'body', },
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new PatchTestController();


      const promise = controller.patchModel.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.patch('/v1/PatchTest/Location',
    function(request: any, response: any, next: any) {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new PatchTestController();


      const promise = controller.patchModelAtLocation.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.patch('/v1/PatchTest/Multi',
    function(request: any, response: any, next: any) {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new PatchTestController();


      const promise = controller.patchWithMultiReturn.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.patch('/v1/PatchTest/WithId/:id',
    function(request: any, response: any, next: any) {
      const args = {
        'id': { name: 'id', typeName: 'number', required: true, in: 'path', },
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new PatchTestController();


      const promise = controller.patchWithId.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.get('/v1/GetTest',
    function(request: any, response: any, next: any) {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new GetTestController();


      const promise = controller.getModel.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.get('/v1/GetTest/Current',
    function(request: any, response: any, next: any) {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new GetTestController();


      const promise = controller.getCurrentModel.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.get('/v1/GetTest/ClassModel',
    function(request: any, response: any, next: any) {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new GetTestController();


      const promise = controller.getClassModel.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.get('/v1/GetTest/Multi',
    function(request: any, response: any, next: any) {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new GetTestController();


      const promise = controller.getMultipleModels.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.get('/v1/GetTest/:numberPathParam/:booleanPathParam/:stringPathParam',
    function(request: any, response: any, next: any) {
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
        return next(err);
      }

      const controller = new GetTestController();


      const promise = controller.getModelByParams.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.get('/v1/GetTest/ResponseWithUnionTypeProperty',
    function(request: any, response: any, next: any) {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new GetTestController();


      const promise = controller.getResponseWithUnionTypeProperty.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.get('/v1/GetTest/UnionTypeResponse',
    function(request: any, response: any, next: any) {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new GetTestController();


      const promise = controller.getUnionTypeResponse.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.get('/v1/GetTest/Request',
    function(request: any, response: any, next: any) {
      const args = {
        'request': { name: 'request', typeName: 'object', required: true, in: 'request', },
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new GetTestController();


      const promise = controller.getRequest.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.get('/v1/GetTest/DateParam',
    function(request: any, response: any, next: any) {
      const args = {
        'date': { name: 'date', typeName: 'datetime', required: true, in: 'query', },
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new GetTestController();


      const promise = controller.getByDataParam.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.get('/v1/GetTest/ThrowsError',
    function(request: any, response: any, next: any) {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new GetTestController();


      const promise = controller.getThrowsError.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.get('/v1/GetTest/GeneratesTags',
    function(request: any, response: any, next: any) {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new GetTestController();


      const promise = controller.getGeneratesTags.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.get('/v1/GetTest/HandleBufferType',
    function(request: any, response: any, next: any) {
      const args = {
        'buffer': { name: 'buffer', typeName: 'buffer', required: true, in: 'query', },
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new GetTestController();


      const promise = controller.getBuffer.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.delete('/v1/DeleteTest',
    function(request: any, response: any, next: any) {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new DeleteTestController();


      const promise = controller.deleteWithReturnValue.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.delete('/v1/DeleteTest/Current',
    function(request: any, response: any, next: any) {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new DeleteTestController();


      const promise = controller.deleteCurrent.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.delete('/v1/DeleteTest/:numberPathParam/:booleanPathParam/:stringPathParam',
    function(request: any, response: any, next: any) {
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
        return next(err);
      }

      const controller = new DeleteTestController();


      const promise = controller.getModelByParams.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.get('/v1/MethodTest/Get',
    function(request: any, response: any, next: any) {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new MethodController();


      const promise = controller.getMethod.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.post('/v1/MethodTest/Post',
    function(request: any, response: any, next: any) {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new MethodController();


      const promise = controller.postMethod.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.patch('/v1/MethodTest/Patch',
    function(request: any, response: any, next: any) {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new MethodController();


      const promise = controller.patchMethod.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.put('/v1/MethodTest/Put',
    function(request: any, response: any, next: any) {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new MethodController();


      const promise = controller.putMethod.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.delete('/v1/MethodTest/Delete',
    function(request: any, response: any, next: any) {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new MethodController();


      const promise = controller.deleteMethod.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.get('/v1/MethodTest/Description',
    function(request: any, response: any, next: any) {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new MethodController();


      const promise = controller.description.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.get('/v1/MethodTest/Tags',
    function(request: any, response: any, next: any) {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new MethodController();


      const promise = controller.tags.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.get('/v1/MethodTest/MultiResponse',
    function(request: any, response: any, next: any) {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new MethodController();


      const promise = controller.multiResponse.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.get('/v1/MethodTest/SuccessResponse',
    function(request: any, response: any, next: any) {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new MethodController();


      const promise = controller.successResponse.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.get('/v1/MethodTest/ApiSecurity',
    authenticateMiddleware('api_key'
    ),
    function(request: any, response: any, next: any) {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new MethodController();


      const promise = controller.apiSecurity.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.get('/v1/MethodTest/OauthSecurity',
    authenticateMiddleware('tsoa_auth'
      , [
        'write:pets',
        'read:pets'
      ]
    ),
    function(request: any, response: any, next: any) {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new MethodController();


      const promise = controller.oauthSecurity.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.get('/v1/MethodTest/DeprecatedMethod',
    function(request: any, response: any, next: any) {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new MethodController();


      const promise = controller.deprecatedMethod.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.get('/v1/ParameterTest/Query',
    function(request: any, response: any, next: any) {
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
        return next(err);
      }

      const controller = new ParameterController();


      const promise = controller.getQuery.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.get('/v1/ParameterTest/Path/:firstname/:last_name/:age/:human',
    function(request: any, response: any, next: any) {
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
        return next(err);
      }

      const controller = new ParameterController();


      const promise = controller.getPath.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.get('/v1/ParameterTest/Header',
    function(request: any, response: any, next: any) {
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
        return next(err);
      }

      const controller = new ParameterController();


      const promise = controller.getHeader.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.get('/v1/ParameterTest/Request',
    function(request: any, response: any, next: any) {
      const args = {
        'request': { name: 'request', typeName: 'object', required: true, in: 'request', },
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new ParameterController();


      const promise = controller.getRequest.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.post('/v1/ParameterTest/Body',
    function(request: any, response: any, next: any) {
      const args = {
        'body': { name: 'body', typeName: 'ParameterTestModel', required: true, in: 'body', },
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new ParameterController();


      const promise = controller.getBody.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.post('/v1/ParameterTest/BodyProps',
    function(request: any, response: any, next: any) {
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
        return next(err);
      }

      const controller = new ParameterController();


      const promise = controller.getBodyProps.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.get('/v1/SecurityTest',
    authenticateMiddleware('api_key'
    ),
    function(request: any, response: any, next: any) {
      const args = {
        'request': { name: 'request', typeName: 'object', required: true, in: 'request', },
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new SecurityTestController();


      const promise = controller.GetWithApi.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.get('/v1/SecurityTest/Koa',
    authenticateMiddleware('api_key'
    ),
    function(request: any, response: any, next: any) {
      const args = {
        'ctx': { name: 'ctx', typeName: 'object', required: true, in: 'request', },
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new SecurityTestController();


      const promise = controller.GetWithApiForKoa.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });
  app.get('/v1/SecurityTest/Oauth',
    authenticateMiddleware('tsoa_auth'
      , [
        'write:pets',
        'read:pets'
      ]
    ),
    function(request: any, response: any, next: any) {
      const args = {
        'request': { name: 'request', typeName: 'object', required: true, in: 'request', },
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = new SecurityTestController();


      const promise = controller.GetWithSecurity.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });

  function authenticateMiddleware(name: string, scopes: string[] = []) {
    return (request: any, response: any, next: any) => {
      expressAuthentication(request, name, scopes).then((user: any) => {
        set(request, 'user', user);
        next();
      })
        .catch((error: any) => {
          response.status(401);
          next(error)
        });
    }
  }

  function promiseHandler(promise: any, statusCode: any, response: any, next: any) {
    return promise
      .then((data: any) => {
        if (data) {
          response.json(data);
          response.status(statusCode || 200);
        } else {
          response.status(statusCode || 204);
          response.end();
        }
      })
      .catch((error: any) => next(error));
  }

  function getValidatedArgs(args: any, request: any): any[] {
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
          return ValidateParam(args[key], request.header(name), models, name);
        case 'body':
          return ValidateParam(args[key], request.body, models, name);
        case 'body-prop':
          return ValidateParam(args[key], request.body[name], models, name);
      }
    });
  }
}
