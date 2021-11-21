import { injectable } from 'inversify';
import { TestModel, TestSubModel } from '../testModel';

@injectable()
export class AsyncService {
  public getModel(): TestModel {
    // Defining as Partial to help writing and allowing to leave out values that should be dropped or made optional in generation
    // (typed either as undefined or union with undefined typed member)
    const testModel: Partial<TestModel> = {
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
      or: { value1: 'foo', value2: 'bar' },
      referenceAnd: { value1: 'foo', value2: 'bar' },
      strLiteralArr: ['Foo', 'Bar'],
      strLiteralVal: 'Foo',
      stringArray: ['string one', 'string two'],
      stringValue: 'a string',
    };
    return testModel as TestModel;
  }
}
