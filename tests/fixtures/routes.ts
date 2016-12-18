
/**
 * THIS IS GENERATED CODE - DO NOT EDIT
 */
/* tslint:disable */
import { ValidateParam } from '../../src/routeGeneration/templateHelpers';
import { PutTestController } from './controllers/putController';
import { PostTestController } from './controllers/postController';
import { PatchTestController } from './controllers/patchController';
import { GetTestController } from './controllers/getController';
import { DeleteTestController } from './controllers/deleteController';
import { JwtGetTestController } from './controllers/jwtEnabledController';

const models: any = {
  'TestSubModel': {
    'email': { typeName: 'string', required: true },
    'circular': { typeName: 'TestModel', required: false },
    'id': { typeName: 'number', required: true },
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

export function RegisterRoutes(app: any) {
  app.put('/v1/PutTest', function(req: any, res: any, next: any) {
    const params = {
      'model': { typeName: 'TestModel', required: true },
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, req, 'model');
    } catch (err) {
      return next(err);
    }

    const controller = new PutTestController();
    promiseHandler(controller.putModel.apply(controller, validatedParams), res, next);
  });
  app.put('/v1/PutTest/Location', function(req: any, res: any, next: any) {
    const params = {
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, req, '');
    } catch (err) {
      return next(err);
    }

    const controller = new PutTestController();
    promiseHandler(controller.putModelAtLocation.apply(controller, validatedParams), res, next);
  });
  app.put('/v1/PutTest/Multi', function(req: any, res: any, next: any) {
    const params = {
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, req, '');
    } catch (err) {
      return next(err);
    }

    const controller = new PutTestController();
    promiseHandler(controller.putWithMultiReturn.apply(controller, validatedParams), res, next);
  });
  app.put('/v1/PutTest/WithId/:id', function(req: any, res: any, next: any) {
    const params = {
      'id': { typeName: 'number', required: true },
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, req, '');
    } catch (err) {
      return next(err);
    }

    const controller = new PutTestController();
    promiseHandler(controller.putWithId.apply(controller, validatedParams), res, next);
  });
  app.post('/v1/PostTest', function(req: any, res: any, next: any) {
    const params = {
      'model': { typeName: 'TestModel', required: true },
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, req, 'model');
    } catch (err) {
      return next(err);
    }

    const controller = new PostTestController();
    promiseHandler(controller.postModel.apply(controller, validatedParams), res, next);
  });
  app.patch('/v1/PostTest', function(req: any, res: any, next: any) {
    const params = {
      'model': { typeName: 'TestModel', required: true },
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, req, 'model');
    } catch (err) {
      return next(err);
    }

    const controller = new PostTestController();
    promiseHandler(controller.updateModel.apply(controller, validatedParams), res, next);
  });
  app.post('/v1/PostTest/WithClassModel', function(req: any, res: any, next: any) {
    const params = {
      'model': { typeName: 'TestClassModel', required: true },
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, req, 'model');
    } catch (err) {
      return next(err);
    }

    const controller = new PostTestController();
    promiseHandler(controller.postClassModel.apply(controller, validatedParams), res, next);
  });
  app.post('/v1/PostTest/Location', function(req: any, res: any, next: any) {
    const params = {
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, req, '');
    } catch (err) {
      return next(err);
    }

    const controller = new PostTestController();
    promiseHandler(controller.postModelAtLocation.apply(controller, validatedParams), res, next);
  });
  app.post('/v1/PostTest/Multi', function(req: any, res: any, next: any) {
    const params = {
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, req, '');
    } catch (err) {
      return next(err);
    }

    const controller = new PostTestController();
    promiseHandler(controller.postWithMultiReturn.apply(controller, validatedParams), res, next);
  });
  app.post('/v1/PostTest/WithId/:id', function(req: any, res: any, next: any) {
    const params = {
      'id': { typeName: 'number', required: true },
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, req, '');
    } catch (err) {
      return next(err);
    }

    const controller = new PostTestController();
    promiseHandler(controller.postWithId.apply(controller, validatedParams), res, next);
  });
  app.post('/v1/PostTest/WithBodyAndQueryParams', function(req: any, res: any, next: any) {
    const params = {
      'model': { typeName: 'TestModel', required: true },
      'query': { typeName: 'string', required: true },
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, req, 'model');
    } catch (err) {
      return next(err);
    }

    const controller = new PostTestController();
    promiseHandler(controller.postWithBodyAndQueryParams.apply(controller, validatedParams), res, next);
  });
  app.patch('/v1/PatchTest', function(req: any, res: any, next: any) {
    const params = {
      'model': { typeName: 'TestModel', required: true },
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, req, 'model');
    } catch (err) {
      return next(err);
    }

    const controller = new PatchTestController();
    promiseHandler(controller.patchModel.apply(controller, validatedParams), res, next);
  });
  app.patch('/v1/PatchTest/Location', function(req: any, res: any, next: any) {
    const params = {
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, req, '');
    } catch (err) {
      return next(err);
    }

    const controller = new PatchTestController();
    promiseHandler(controller.patchModelAtLocation.apply(controller, validatedParams), res, next);
  });
  app.patch('/v1/PatchTest/Multi', function(req: any, res: any, next: any) {
    const params = {
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, req, '');
    } catch (err) {
      return next(err);
    }

    const controller = new PatchTestController();
    promiseHandler(controller.patchWithMultiReturn.apply(controller, validatedParams), res, next);
  });
  app.patch('/v1/PatchTest/WithId/:id', function(req: any, res: any, next: any) {
    const params = {
      'id': { typeName: 'number', required: true },
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, req, '');
    } catch (err) {
      return next(err);
    }

    const controller = new PatchTestController();
    promiseHandler(controller.patchWithId.apply(controller, validatedParams), res, next);
  });
  app.get('/v1/GetTest', function(req: any, res: any, next: any) {
    const params = {
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, req, '');
    } catch (err) {
      return next(err);
    }

    const controller = new GetTestController();
    promiseHandler(controller.getModel.apply(controller, validatedParams), res, next);
  });
  app.get('/v1/GetTest/Current', function(req: any, res: any, next: any) {
    const params = {
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, req, '');
    } catch (err) {
      return next(err);
    }

    const controller = new GetTestController();
    promiseHandler(controller.getCurrentModel.apply(controller, validatedParams), res, next);
  });
  app.get('/v1/GetTest/ClassModel', function(req: any, res: any, next: any) {
    const params = {
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, req, '');
    } catch (err) {
      return next(err);
    }

    const controller = new GetTestController();
    promiseHandler(controller.getClassModel.apply(controller, validatedParams), res, next);
  });
  app.get('/v1/GetTest/Multi', function(req: any, res: any, next: any) {
    const params = {
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, req, '');
    } catch (err) {
      return next(err);
    }

    const controller = new GetTestController();
    promiseHandler(controller.getMultipleModels.apply(controller, validatedParams), res, next);
  });
  app.get('/v1/GetTest/:numberPathParam/:booleanPathParam/:stringPathParam', function(req: any, res: any, next: any) {
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
      validatedParams = getValidatedParams(params, req, '');
    } catch (err) {
      return next(err);
    }

    const controller = new GetTestController();
    promiseHandler(controller.getModelByParams.apply(controller, validatedParams), res, next);
  });
  app.get('/v1/GetTest/ResponseWithUnionTypeProperty', function(req: any, res: any, next: any) {
    const params = {
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, req, '');
    } catch (err) {
      return next(err);
    }

    const controller = new GetTestController();
    promiseHandler(controller.getResponseWithUnionTypeProperty.apply(controller, validatedParams), res, next);
  });
  app.get('/v1/GetTest/UnionTypeResponse', function(req: any, res: any, next: any) {
    const params = {
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, req, '');
    } catch (err) {
      return next(err);
    }

    const controller = new GetTestController();
    promiseHandler(controller.getUnionTypeResponse.apply(controller, validatedParams), res, next);
  });
  app.get('/v1/GetTest/InjectedRequest', function(req: any, res: any, next: any) {
    const params = {
      'request': { typeName: 'object', required: true, injected: 'request' },
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, req, '');
    } catch (err) {
      return next(err);
    }

    const controller = new GetTestController();
    promiseHandler(controller.getInjectedRequest.apply(controller, validatedParams), res, next);
  });
  app.get('/v1/GetTest/InjectedValue', function(req: any, res: any, next: any) {
    const params = {
      'someValue': { typeName: 'object', required: true, injected: 'inject' },
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, req, '');
    } catch (err) {
      return next(err);
    }

    const controller = new GetTestController();
    promiseHandler(controller.getInjectedValue.apply(controller, validatedParams), res, next);
  });
  app.get('/v1/GetTest/DateParam', function(req: any, res: any, next: any) {
    const params = {
      'date': { typeName: 'datetime', required: true },
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, req, '');
    } catch (err) {
      return next(err);
    }

    const controller = new GetTestController();
    promiseHandler(controller.getByDataParam.apply(controller, validatedParams), res, next);
  });
  app.get('/v1/GetTest/ThrowsError', function(req: any, res: any, next: any) {
    const params = {
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, req, '');
    } catch (err) {
      return next(err);
    }

    const controller = new GetTestController();
    promiseHandler(controller.getThrowsError.apply(controller, validatedParams), res, next);
  });
  app.delete('/v1/DeleteTest', function(req: any, res: any, next: any) {
    const params = {
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, req, '');
    } catch (err) {
      return next(err);
    }

    const controller = new DeleteTestController();
    promiseHandler(controller.deleteWithReturnValue.apply(controller, validatedParams), res, next);
  });
  app.delete('/v1/DeleteTest/Current', function(req: any, res: any, next: any) {
    const params = {
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, req, '');
    } catch (err) {
      return next(err);
    }

    const controller = new DeleteTestController();
    promiseHandler(controller.deleteCurrent.apply(controller, validatedParams), res, next);
  });
  app.delete('/v1/DeleteTest/:numberPathParam/:booleanPathParam/:stringPathParam', function(req: any, res: any, next: any) {
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
      validatedParams = getValidatedParams(params, req, '');
    } catch (err) {
      return next(err);
    }

    const controller = new DeleteTestController();
    promiseHandler(controller.getModelByParams.apply(controller, validatedParams), res, next);
  });
  app.get('/v1/JwtGetTest', function(req: any, res: any, next: any) {
    const params = {
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, req, '');
    } catch (err) {
      return next(err);
    }

    const controller = new JwtGetTestController();
    if (req.user_jwt_data) {
      if (req.user_jwt_data.iss) controller.iss = req.user_jwt_data.iss;
      if (req.user_jwt_data.sub) controller.sub = req.user_jwt_data.sub;
      if (req.user_jwt_data.aud) controller.aud = req.user_jwt_data.aud;
    }
    promiseHandler(controller.GetWithJwt.apply(controller, validatedParams), res, next);
  });

  function promiseHandler(promise: any, response: any, next: any) {
    return promise
      .then((data: any) => {
        if (data) {
          response.json(data);
        } else {
          response.status(204);
          response.end();
        }
      })
      .catch((error: any) => next(error));
  }

  function getRequestParams(request: any, bodyParamName?: string) {
    const merged: any = {};
    if (bodyParamName) {
      merged[bodyParamName] = request.body;
    }

    for (let attrname in request.params) { merged[attrname] = request.params[attrname]; }
    for (let attrname in request.query) { merged[attrname] = request.query[attrname]; }
    return merged;
  }

  function getValidatedParams(params: any, request: any, bodyParamName?: string): any[] {
    const requestParams = getRequestParams(request, bodyParamName);

    return Object.keys(params).map(key => {
      if (params[key].injected === 'inject') {
        return undefined;
      } else if (params[key].injected === 'request') {
        return request;
      } else {
        return ValidateParam(params[key], requestParams[key], models, key);
      }
    });
  }
}
