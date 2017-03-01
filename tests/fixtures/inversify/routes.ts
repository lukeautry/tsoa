/* tslint:disable */
import { ValidateParam } from '../../../src/routeGeneration/templateHelpers';
import { Controller } from '../../../src/interfaces/controller';
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
  app.get('/v1/ManagedTest',
    function(request: any, response: any, next: any) {
      const args = {
      };

      let validatedArgs: any[] = [];
      try {
        validatedArgs = getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller = iocContainer.get<ManagedController>(ManagedController);


      const promise = controller.getModel.apply(controller, validatedArgs);
      let statusCode = undefined;
      if (controller instanceof Controller) {
        statusCode = (controller as Controller).getStatus();
      }
      promiseHandler(promise, statusCode, response, next);
    });


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
        case 'body-props':
          return ValidateParam(args[key], request.body[name], models, name);
      }
    });
  }
}
