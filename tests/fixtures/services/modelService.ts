import { TestClassModel, TestModel, TestSubModel } from '../testModel';

export class ModelService {
  public getModel(): TestModel {
    return {
      boolArray: [true, false],
      boolValue: true,
      id: 1,
      modelValue: {
        email: 'test@test.com',
        id: 100,
      },
      modelsArray: new Array<TestSubModel>(),
      numberArray: [1, 2, 3],
      numberValue: 1,
      object: new Object(),
      objectArray: [new Object()],
      optionalString: 'optional string',
      strLiteralArr: ['Foo', 'Bar'],
      strLiteralVal: 'Foo',
      stringArray: ['string one', 'string two'],
      stringValue: 'a string',
    };
  }

  public getModelPromise(): Promise<TestModel> {
    return Promise.resolve(this.getModel());
  }

  public getClassModel(): TestClassModel {
    const testClassModel = new TestClassModel('constructor var', 'private constructor var');
    testClassModel.id = 1;
    testClassModel.publicStringProperty = 'public string property';

    return testClassModel;
  }
}
