export interface TestModel {
    numberValue: number;
    numberArray: number[];
    stringValue: string;
    stringArray: string[];
    boolValue: boolean;
    boolArray: boolean[];
    modelValue: TestSubModel;
    modelsArray: TestSubModel[];
}

export interface TestSubModel {
    id: number;
    email: string;
}
