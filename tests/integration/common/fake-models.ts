import { TestClassModel, TestModel } from '../../fixtures/testModel';

export function getFakeModel(): TestModel {
  const testModel: Partial<TestModel> = {
    and: { value1: 'foo', value2: 'bar' },
    boolArray: [true, false],
    boolValue: false,
    id: 1,
    modelValue: { email: 'test@test.com', id: 2 },
    modelsArray: [{ email: 'test@test.com', id: 1 }],
    numberArray: [1, 2],
    numberArrayReadonly: [1, 2],
    numberValue: 5,
    objLiteral: {
      name: 'hello',
    },
    object: { foo: 'bar' },
    objectArray: [{ foo1: 'bar1' }, { foo2: 'bar2' }],
    optionalString: 'test1234',
    or: { value1: 'Foo' },
    referenceAnd: { value1: 'foo', value2: 'bar' },
    strLiteralArr: ['Foo', 'Bar'],
    strLiteralVal: 'Foo',
    stringArray: ['test', 'testtwo'],
    stringValue: 'test1234',
  };
  return testModel as TestModel;
}

export function getFakeClassModel() {
  const model = new TestClassModel('test', 'test', 'test', 'test', 'test');
  model.id = 100;
  model.publicStringProperty = 'test';
  model.stringProperty = 'test';
  model.account = { id: 1234 };
  model.enumKeys = 'KO';

  return model;
}
