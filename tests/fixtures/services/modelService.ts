import { TestClassModel, TestModel, TestSubModel } from '../testModel';

export class ModelService {
  public getModel(): TestModel {
    return {
      exPick3: "exPick3",
      pickModel: {
        item1: "item1",
        item4: "item4"
      },
      omitModel: {
        item1: 'item1',
        item2: false,
      },
      optionalModel: {
        item1: 'item1',
        item2: false,
        item3: 'item3',
      },
      and: { value1: 'foo', value2: 'bar' },
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
      or: { value2: 'bar' },
      referenceAnd: { value1: 'foo', value2: 'bar' },
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
    const testClassModel = new TestClassModel('constructor var', 'private constructor var', '_default constructor var', 'readonlyConstructorvar', 'optional constructor var');
    testClassModel.id = 1;
    testClassModel.publicStringProperty = 'public string property';

    return testClassModel;
  }
}
