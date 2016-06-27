import {TestModel} from '../testModel';

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
            modelsArray: null,
            numberArray: [1, 2, 3],
            numberValue: 1,
            optionalString: 'optional string',
            stringArray: ['string one', 'string two'],
            stringValue: 'a string'
        };
    }
}
