import { expect } from 'chai';
import 'mocha';
import 'reflect-metadata';
import * as request from 'supertest';
import { iocContainer } from '../fixtures/routeParameter/ioc';
import { RouteParameterService } from '../fixtures/routeParameter/routeParameterService';
import { app } from '../fixtures/routeParameter/server';
import { TestModel, TestSubModel } from '../fixtures/testModel';

const basePath = '/v1';

describe('RouteParameter Express Server', () => {
  it('can handle get request with no path argument', () => {
    const routeParameter = 'routeParameter';
    return verifyGetRequest(basePath + `/${routeParameter}/ManagedTest?tsoa=abc123456`, (err, res) => {
      const model = res.body as TestModel;
      expect(err).to.be.false;
      expect(model.id).to.equal(1);
      expect(model.optionalString).to.equal(routeParameter);
    });
  });

  it('handles request with controller using service', () => {
    const managedService = iocContainer.get<RouteParameterService>(RouteParameterService);
    const oldGetModel = managedService.getModel;
    // hook in a new getModel method returning id = 2
    const routeParameter = 'routeParameterTest';

    managedService.getModel = () => {
      return {
        boolArray: [true, false],
        boolValue: true,
        id: 2,
        modelValue: {
          email: 'test@test.com',
          id: 100,
        },
        modelsArray: new Array<TestSubModel>(),
        modelsObjectIndirect: {
          key: {
            email: 'test@test.com',
            id: 1,
            testSubModel2: false,
          },
        },
        numberArray: [1, 2, 3],
        numberValue: 1,
        optionalString: routeParameter,
        strLiteralArr: ['Foo', 'Bar'],
        strLiteralVal: 'Foo',
        stringArray: ['string one', 'string two'],
        stringValue: 'a string',
      };
    };
    return verifyGetRequest(basePath + `/${routeParameter}/ManagedTest?tsoa=abc123456`, (err, res) => {
      const model = res.body as TestModel;
      // expect controller to use the same service
      expect(err).to.be.false;
      expect(model.id).to.equal(2);
      expect(model.optionalString).to.equal(routeParameter);
      // restore the old method
      managedService.getModel = oldGetModel;
    });
  });

  function verifyGetRequest(path: string, verifyResponse: (err: any, res: request.Response) => any, expectedStatus?: number) {
    return verifyRequest(verifyResponse, (request) => request.get(path), expectedStatus);
  }

  function verifyRequest(
    verifyResponse: (err: any, res: request.Response) => any,
    methodOperation: (request: request.SuperTest<any>) => request.Test,
    expectedStatus = 200,
  ) {
    return new Promise((resolve, reject) => {
      methodOperation(request(app))
        .expect(expectedStatus)
        .end((err: any, res: any) => {
          let parsedError: any;
          try {
            parsedError = JSON.parse((res.error as any));
          } catch (err) {
            parsedError = (res.error as any);
          }

          if (err) {
            reject({
              error: err,
              response: parsedError,
            });
            return;
          }

          verifyResponse(parsedError, res);
          resolve();
        });
    });
  }
});
