import { expect } from 'chai';
import 'mocha';
import 'reflect-metadata';
import request from 'supertest';
import { iocContainer } from '../fixtures/inversify/ioc';
import { ManagedService } from '../fixtures/inversify/managedService';
import { app } from '../fixtures/inversify/server';
import { TestModel, TestSubModel } from '../fixtures/testModel';

const basePath = '/v1';

describe('Inversify Express Server', () => {
  it('can handle get request with no path argument', () => {
    return verifyGetRequest(basePath + '/ManagedTest?tsoa=abc123456', (err, res) => {
      const model = res.body as TestModel;
      expect(model.id).to.equal(1);
    });
  });

  it('handles request with managed controller using managed service', () => {
    const managedService = iocContainer.get<ManagedService>(ManagedService);
    const oldGetModel = managedService.getModel.bind(managedService);
    // hook in a new getModel method returning id = 2
    managedService.getModel = () => {
      // Defining as Partial to help writing and allowing to leave out values that should be dropped or made optional in generation
      // (typed either as undefined or union with undefined typed member)
      const testModel: Partial<TestModel> = {
        and: { value1: 'foo', value2: 'bar' },
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
        numberArrayReadonly: [1, 2, 3],
        numberValue: 1,
        objLiteral: {
          name: 'hello',
        },
        object: {
          a: 'a',
        },
        objectArray: [
          {
            a: 'a',
          },
        ],
        optionalString: 'optional string',
        or: { value1: 'Foo' },
        referenceAnd: { value1: 'foo', value2: 'bar' },
        strLiteralArr: ['Foo', 'Bar'],
        strLiteralVal: 'Foo',
        stringArray: ['string one', 'string two'],
        stringValue: 'a string',
      };
      return testModel as TestModel;
    };
    return verifyGetRequest(basePath + '/ManagedTest?tsoa=abc123456', (err, res) => {
      const model = res.body as TestModel;
      // expect controller to use the same service
      expect(model.id).to.equal(2);
      // restore the old method
      managedService.getModel = oldGetModel;
    });
  });

  function verifyGetRequest(path: string, verifyResponse: (err: any, res: request.Response) => any, expectedStatus?: number) {
    return verifyRequest(verifyResponse, request => request.get(path), expectedStatus);
  }

  function verifyRequest(verifyResponse: (err: any, res: request.Response) => any, methodOperation: (request: request.SuperTest<any>) => request.Test, expectedStatus = 200) {
    return new Promise<void>((resolve, reject) => {
      methodOperation(request(app))
        .expect(expectedStatus)
        .end((err: any, res: any) => {
          let parsedError: any;
          try {
            parsedError = JSON.parse(res.error);
          } catch (err) {
            parsedError = res.error;
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
