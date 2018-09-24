/* tslint:disable */
import { Controller, ValidateParam, FieldErrors, ValidateError, TsoaRoute } from '../../../src';
import { iocContainer } from './ioc';
import { RouteParameterController } from './routeParameterController';
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
};

export function RegisterRoutes(app: any) {
  app.get('/v1/:routeParameter/ManagedTest',
    authenticateMiddleware([{ "MySecurity": [] }]),
    function(request: any, response: any, next: any) {
      const args={
        routeParameter: { "in": "path", "name": "routeParameter", "required": true, "dataType": "string" },
      };

      let validatedArgs: any[]=[];
      try {
        validatedArgs=getValidatedArgs(args, request);
      } catch (err) {
        return next(err);
      }

      const controller=iocContainer.get<RouteParameterController>(RouteParameterController);
      if (typeof controller['setStatus']==='function') {
        (<any>controller).setStatus(undefined);
      }


      const promise=controller.getModel.apply(controller, validatedArgs);
      promiseHandler(controller, promise, response, next);
    });

  function authenticateMiddleware(security: TsoaRoute.Security[]=[]) {
    return (request: any, response: any, next: any) => {
      let responded=0;
      let success=false;

      const succeed=function(user: any) {
        if (!success) {
          success=true;
          responded++;
          request['user']=user;
          next();
        }
      }

      const fail=function(error: any) {
        responded++;
        if (responded==security.length&&!success) {
          error.status=401;
          next(error)
        }
      }

      for (const secMethod of security) {
        if (Object.keys(secMethod).length>1) {
          let promises: Promise<any>[]=[];

          for (const name in secMethod) {
            promises.push(expressAuthentication(request, name, secMethod[name]));
          }

          Promise.all(promises)
            .then((users) => { succeed(users[0]); })
            .catch(fail);
        } else {
          for (const name in secMethod) {
            expressAuthentication(request, name, secMethod[name])
              .then(succeed)
              .catch(fail);
          }
        }
      }
    }
  }

  function isController(object: any): object is Controller {
    return 'getHeaders' in object&&'getStatus' in object&&'setStatus' in object;
  }

  function promiseHandler(controllerObj: any, promise: any, response: any, next: any) {
    return Promise.resolve(promise)
      .then((data: any) => {
        let statusCode;
        if (isController(controllerObj)) {
          const headers=controllerObj.getHeaders();
          Object.keys(headers).forEach((name: string) => {
            response.set(name, headers[name]);
          });

          statusCode=controllerObj.getStatus();
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
