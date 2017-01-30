/* tslint:disable */
import { ValidateParam } from '../../../src/routeGeneration/templateHelpers';
import { PutTestController } from './../controllers/putController';
import { PostTestController } from './../controllers/postController';
import { PatchTestController } from './../controllers/patchController';
import { GetTestController } from './../controllers/getController';
import { DeleteTestController } from './../controllers/deleteController';
import { JwtGetTestController } from './../controllers/jwtEnabledController';

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
  'BooleanResponseModel': {
    'success': { typeName: 'boolean', required: true },
  },
};

/* tslint:disable:forin */
import * as KoaRouter from 'koa-router';

export function RegisterRoutes(router: KoaRouter) {
  router.put('/v1/PutTest', async (context, next) => {
    const params = {
      'model': { typeName: 'TestModel', required: true },
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, context, 'model');
    } catch (error) {
      context.status = error.status || 500;
      context.body = error;
      next();
      return;
    }

    const controller = new PutTestController();
    promiseHandler(controller.putModel.apply(controller, validatedParams), context, next);
  });
  router.put('/v1/PutTest/Location', async (context, next) => {
    const params = {
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, context, '');
    } catch (error) {
      context.status = error.status || 500;
      context.body = error;
      next();
      return;
    }

    const controller = new PutTestController();
    promiseHandler(controller.putModelAtLocation.apply(controller, validatedParams), context, next);
  });
  router.put('/v1/PutTest/Multi', async (context, next) => {
    const params = {
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, context, '');
    } catch (error) {
      context.status = error.status || 500;
      context.body = error;
      next();
      return;
    }

    const controller = new PutTestController();
    promiseHandler(controller.putWithMultiReturn.apply(controller, validatedParams), context, next);
  });
  router.put('/v1/PutTest/WithId/:id', async (context, next) => {
    const params = {
      'id': { typeName: 'number', required: true },
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, context, '');
    } catch (error) {
      context.status = error.status || 500;
      context.body = error;
      next();
      return;
    }

    const controller = new PutTestController();
    promiseHandler(controller.putWithId.apply(controller, validatedParams), context, next);
  });
  router.post('/v1/PostTest', async (context, next) => {
    const params = {
      'model': { typeName: 'TestModel', required: true },
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, context, 'model');
    } catch (error) {
      context.status = error.status || 500;
      context.body = error;
      next();
      return;
    }

    const controller = new PostTestController();
    promiseHandler(controller.postModel.apply(controller, validatedParams), context, next);
  });
  router.patch('/v1/PostTest', async (context, next) => {
    const params = {
      'model': { typeName: 'TestModel', required: true },
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, context, 'model');
    } catch (error) {
      context.status = error.status || 500;
      context.body = error;
      next();
      return;
    }

    const controller = new PostTestController();
    promiseHandler(controller.updateModel.apply(controller, validatedParams), context, next);
  });
  router.post('/v1/PostTest/WithClassModel', async (context, next) => {
    const params = {
      'model': { typeName: 'TestClassModel', required: true },
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, context, 'model');
    } catch (error) {
      context.status = error.status || 500;
      context.body = error;
      next();
      return;
    }

    const controller = new PostTestController();
    promiseHandler(controller.postClassModel.apply(controller, validatedParams), context, next);
  });
  router.post('/v1/PostTest/Location', async (context, next) => {
    const params = {
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, context, '');
    } catch (error) {
      context.status = error.status || 500;
      context.body = error;
      next();
      return;
    }

    const controller = new PostTestController();
    promiseHandler(controller.postModelAtLocation.apply(controller, validatedParams), context, next);
  });
  router.post('/v1/PostTest/Multi', async (context, next) => {
    const params = {
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, context, '');
    } catch (error) {
      context.status = error.status || 500;
      context.body = error;
      next();
      return;
    }

    const controller = new PostTestController();
    promiseHandler(controller.postWithMultiReturn.apply(controller, validatedParams), context, next);
  });
  router.post('/v1/PostTest/WithId/:id', async (context, next) => {
    const params = {
      'id': { typeName: 'number', required: true },
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, context, '');
    } catch (error) {
      context.status = error.status || 500;
      context.body = error;
      next();
      return;
    }

    const controller = new PostTestController();
    promiseHandler(controller.postWithId.apply(controller, validatedParams), context, next);
  });
  router.post('/v1/PostTest/WithBodyAndQueryParams', async (context, next) => {
    const params = {
      'model': { typeName: 'TestModel', required: true },
      'query': { typeName: 'string', required: true },
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, context, 'model');
    } catch (error) {
      context.status = error.status || 500;
      context.body = error;
      next();
      return;
    }

    const controller = new PostTestController();
    promiseHandler(controller.postWithBodyAndQueryParams.apply(controller, validatedParams), context, next);
  });
  router.patch('/v1/PatchTest', async (context, next) => {
    const params = {
      'model': { typeName: 'TestModel', required: true },
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, context, 'model');
    } catch (error) {
      context.status = error.status || 500;
      context.body = error;
      next();
      return;
    }

    const controller = new PatchTestController();
    promiseHandler(controller.patchModel.apply(controller, validatedParams), context, next);
  });
  router.patch('/v1/PatchTest/Location', async (context, next) => {
    const params = {
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, context, '');
    } catch (error) {
      context.status = error.status || 500;
      context.body = error;
      next();
      return;
    }

    const controller = new PatchTestController();
    promiseHandler(controller.patchModelAtLocation.apply(controller, validatedParams), context, next);
  });
  router.patch('/v1/PatchTest/Multi', async (context, next) => {
    const params = {
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, context, '');
    } catch (error) {
      context.status = error.status || 500;
      context.body = error;
      next();
      return;
    }

    const controller = new PatchTestController();
    promiseHandler(controller.patchWithMultiReturn.apply(controller, validatedParams), context, next);
  });
  router.patch('/v1/PatchTest/WithId/:id', async (context, next) => {
    const params = {
      'id': { typeName: 'number', required: true },
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, context, '');
    } catch (error) {
      context.status = error.status || 500;
      context.body = error;
      next();
      return;
    }

    const controller = new PatchTestController();
    promiseHandler(controller.patchWithId.apply(controller, validatedParams), context, next);
  });
  router.get('/v1/GetTest', async (context, next) => {
    const params = {
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, context, '');
    } catch (error) {
      context.status = error.status || 500;
      context.body = error;
      next();
      return;
    }

    const controller = new GetTestController();
    promiseHandler(controller.getModel.apply(controller, validatedParams), context, next);
  });
  router.get('/v1/GetTest/Current', async (context, next) => {
    const params = {
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, context, '');
    } catch (error) {
      context.status = error.status || 500;
      context.body = error;
      next();
      return;
    }

    const controller = new GetTestController();
    promiseHandler(controller.getCurrentModel.apply(controller, validatedParams), context, next);
  });
  router.get('/v1/GetTest/ClassModel', async (context, next) => {
    const params = {
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, context, '');
    } catch (error) {
      context.status = error.status || 500;
      context.body = error;
      next();
      return;
    }

    const controller = new GetTestController();
    promiseHandler(controller.getClassModel.apply(controller, validatedParams), context, next);
  });
  router.get('/v1/GetTest/Multi', async (context, next) => {
    const params = {
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, context, '');
    } catch (error) {
      context.status = error.status || 500;
      context.body = error;
      next();
      return;
    }

    const controller = new GetTestController();
    promiseHandler(controller.getMultipleModels.apply(controller, validatedParams), context, next);
  });
  router.get('/v1/GetTest/:numberPathParam/:booleanPathParam/:stringPathParam', async (context, next) => {
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
      validatedParams = getValidatedParams(params, context, '');
    } catch (error) {
      context.status = error.status || 500;
      context.body = error;
      next();
      return;
    }

    const controller = new GetTestController();
    promiseHandler(controller.getModelByParams.apply(controller, validatedParams), context, next);
  });
  router.get('/v1/GetTest/ResponseWithUnionTypeProperty', async (context, next) => {
    const params = {
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, context, '');
    } catch (error) {
      context.status = error.status || 500;
      context.body = error;
      next();
      return;
    }

    const controller = new GetTestController();
    promiseHandler(controller.getResponseWithUnionTypeProperty.apply(controller, validatedParams), context, next);
  });
  router.get('/v1/GetTest/UnionTypeResponse', async (context, next) => {
    const params = {
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, context, '');
    } catch (error) {
      context.status = error.status || 500;
      context.body = error;
      next();
      return;
    }

    const controller = new GetTestController();
    promiseHandler(controller.getUnionTypeResponse.apply(controller, validatedParams), context, next);
  });
  router.get('/v1/GetTest/InjectedRequest', async (context, next) => {
    const params = {
      'request': { typeName: 'object', required: true, injected: 'request' },
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, context, '');
    } catch (error) {
      context.status = error.status || 500;
      context.body = error;
      next();
      return;
    }

    const controller = new GetTestController();
    promiseHandler(controller.getInjectedRequest.apply(controller, validatedParams), context, next);
  });
  router.get('/v1/GetTest/InjectedValue', async (context, next) => {
    const params = {
      'someValue': { typeName: 'object', required: true, injected: 'inject' },
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, context, '');
    } catch (error) {
      context.status = error.status || 500;
      context.body = error;
      next();
      return;
    }

    const controller = new GetTestController();
    promiseHandler(controller.getInjectedValue.apply(controller, validatedParams), context, next);
  });
  router.get('/v1/GetTest/DateParam', async (context, next) => {
    const params = {
      'date': { typeName: 'datetime', required: true },
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, context, '');
    } catch (error) {
      context.status = error.status || 500;
      context.body = error;
      next();
      return;
    }

    const controller = new GetTestController();
    promiseHandler(controller.getByDataParam.apply(controller, validatedParams), context, next);
  });
  router.get('/v1/GetTest/ThrowsError', async (context, next) => {
    const params = {
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, context, '');
    } catch (error) {
      context.status = error.status || 500;
      context.body = error;
      next();
      return;
    }

    const controller = new GetTestController();
    promiseHandler(controller.getThrowsError.apply(controller, validatedParams), context, next);
  });
  router.get('/v1/GetTest/GeneratesTags', async (context, next) => {
    const params = {
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, context, '');
    } catch (error) {
      context.status = error.status || 500;
      context.body = error;
      next();
      return;
    }

    const controller = new GetTestController();
    promiseHandler(controller.getGeneratesTags.apply(controller, validatedParams), context, next);
  });
  router.get('/v1/GetTest/HandleBufferType', async (context, next) => {
    const params = {
      'buffer': { typeName: 'buffer', required: true },
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, context, '');
    } catch (error) {
      context.status = error.status || 500;
      context.body = error;
      next();
      return;
    }

    const controller = new GetTestController();
    promiseHandler(controller.getBuffer.apply(controller, validatedParams), context, next);
  });
  router.delete('/v1/DeleteTest', async (context, next) => {
    const params = {
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, context, '');
    } catch (error) {
      context.status = error.status || 500;
      context.body = error;
      next();
      return;
    }

    const controller = new DeleteTestController();
    promiseHandler(controller.deleteWithReturnValue.apply(controller, validatedParams), context, next);
  });
  router.delete('/v1/DeleteTest/Current', async (context, next) => {
    const params = {
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, context, '');
    } catch (error) {
      context.status = error.status || 500;
      context.body = error;
      next();
      return;
    }

    const controller = new DeleteTestController();
    promiseHandler(controller.deleteCurrent.apply(controller, validatedParams), context, next);
  });
  router.delete('/v1/DeleteTest/:numberPathParam/:booleanPathParam/:stringPathParam', async (context, next) => {
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
      validatedParams = getValidatedParams(params, context, '');
    } catch (error) {
      context.status = error.status || 500;
      context.body = error;
      next();
      return;
    }

    const controller = new DeleteTestController();
    promiseHandler(controller.getModelByParams.apply(controller, validatedParams), context, next);
  });
  router.get('/v1/JwtGetTest', async (context, next) => {
    const params = {
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, context, '');
    } catch (error) {
      context.status = error.status || 500;
      context.body = error;
      next();
      return;
    }

    const controller = new JwtGetTestController();
    promiseHandler(controller.GetWithJwt.apply(controller, validatedParams), context, next);
  });

  function promiseHandler(promise: any, context: KoaRouter.IRouterContext, next: () => Promise<any>) {
    return promise
      .then((data: any) => {
        if (data) {
          context.body = data;
        } else {
          context.status = 204;
        }

        next();
      })
      .catch((error: any) => {
        context.status = error.status || 500;
        context.body = error;
        next();
      });
  }

  function getRequestParams(context: KoaRouter.IRouterContext, bodyParamName?: string) {
    const merged: any = {};
    if (bodyParamName) {
      merged[bodyParamName] = context.request.body;
    }

    for (let attrname in context.params) { merged[attrname] = context.params[attrname]; }
    for (let attrname in context.request.query) { merged[attrname] = context.request.query[attrname]; }
    return merged;
  }

  function getValidatedParams(params: any, context: KoaRouter.IRouterContext, bodyParamName?: string): any[] {
    const requestParams = getRequestParams(context, bodyParamName);

    return Object.keys(params).map(key => {
      if (params[key].injected === 'inject') {
        return undefined;
      } else if (params[key].injected === 'request') {
        return context;
      } else {
        return ValidateParam(params[key], requestParams[key], models, key);
      }
    });
  }
}
