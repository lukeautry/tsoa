/* tslint:disable */
import { ValidateParam } from '../../../src/routeGeneration/templateHelpers';
import { Controller } from '../../../src/interfaces/controller';
import { iocContainer } from './ioc';
import { ManagedController } from './managedController';

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
      "modelsArrayIndirect": { "required": false, "typeName": "TestSubArrayModelContainer" },
      "modelsEnumIndirect": { "required": false, "typeName": "TestSubEnumModelContainer" },
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
    additionalProperties: { "typeName": "TestSubModel2" },
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
    additionalProperties: { "typeName": "TestSubModelNamespace.TestSubModelNS" },
  },
  "TestSubModelContainerNamespace.InnerNamespace.TestSubModelContainer2": {
    properties: {
    },
    additionalProperties: { "typeName": "TestSubModelNamespace.TestSubModelNS" },
  },
  "TestSubModelContainerNamespace_TestSubModelContainer": {
    properties: {
    },
  },
  "TestSubModelContainerNamespace_InnerNamespace_TestSubModelContainer2": {
    properties: {
    },
  },
  "TestSubArrayModelContainer": {
    properties: {
    },
    additionalProperties: { "typeName": "array", "array": { "typeName": "TestSubModel2" } },
  },
  "TestSubEnumModelContainer": {
    properties: {
    },
    additionalProperties: { "typeName": "enum", "enumMembers": ["VALUE_1", "VALUE_2"] },
  },
};

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
        case 'body-prop':
          return ValidateParam(args[key], request.body[name], models, name);
      }
    });
  }
}
