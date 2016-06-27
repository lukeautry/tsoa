import {Controller} from '../../../src/routing/controller';
import {Route} from '../../../src/decorators/route';
import {Get} from '../../../src/decorators/methods';
import {Example} from '../../../src/decorators/example';
import {TestModel} from '../testModel';

@Route('GetTest')
export class GetTestController extends Controller {
    /**
     * This is a description of the getModel method
     * this is some more text on another line
     */
    @Get()
    @Example<TestModel>({
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
    })
    public async getModel(): Promise<TestModel> {
        return null;
    }

    @Get('Current')
    public async getCurrentModel(): Promise<TestModel> {
        return null;
    }

    @Get('Multi')
    public async getMultipleModels(): Promise<TestModel[]> {
        return null;
    }

    /**
     * @param numberPathParam This is a description for numberPathParam
     * @param numberParam This is a description for numberParam
     */
    @Get('{numberPathParam}/{booleanPathParam}/{stringPathParam}')
    public async getModelByParams(
        numberPathParam: number,
        stringPathParam: string,
        booleanPathParam: boolean,
        booleanParam: boolean,
        stringParam: string,
        numberParam: number,
        optionalStringParam?: string): Promise<TestModel> {
        return null;
    }
}
