import { expect } from 'chai';
import 'mocha';
import 'reflect-metadata';
import { iocContainer } from '../fixtures/inversify/ioc';
import { ManagedService } from '../fixtures/inversify/managedService';
import { app } from '../fixtures/inversify/server';
import { TestModel, TestSubModel } from '../fixtures/testModel';
import { verifyGetRequest } from './utils';

const basePath = '/v1';

describe('Inversify Express Server', () => {
  it('can handle get request with no path argument', () => {
    return verifyGetRequest(app, basePath + '/ManagedTest?tsoa=abc123456', (err, res) => {
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
    return verifyGetRequest(app, basePath + '/ManagedTest?tsoa=abc123456', (err, res) => {
      const model = res.body as TestModel;
      // expect controller to use the same service
      expect(model.id).to.equal(2);
      // restore the old method
      managedService.getModel = oldGetModel;
    });
  });
});
