/* tslint:disable */
import { ValidateParam } from '../../../src/routeGeneration/templateHelpers';
import { iocContainer } from './ioc';
import { ManagedController } from './managedController';

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
};

/* tslint:disable:forin */
export function RegisterRoutes(app: any) {
  app.get('/v1/ManagedTest', function(req: any, res: any, next: any) {
    const params = {
    };

    let validatedParams: any[] = [];
    try {
      validatedParams = getValidatedParams(params, req, '');
    } catch (err) {
      return next(err);
    }

    const controller = iocContainer.get<ManagedController>(ManagedController);
    promiseHandler(controller.getModel.apply(controller, validatedParams), res, next);
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
