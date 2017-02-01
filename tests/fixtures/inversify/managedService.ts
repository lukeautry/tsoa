import { injectable } from 'inversify';
import { TestModel, TestSubModel } from '../testModel';

@injectable()
export class ManagedService {
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
      optionalString: 'optional string',
      strLiteralArr: ['Foo', 'Bar'],
      strLiteralVal: 'Foo',
      stringArray: ['string one', 'string two'],
      stringValue: 'a string'
    };
  }
}
