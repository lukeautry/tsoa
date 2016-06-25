import {Controller} from '../../../src/routing/controller';
import {Route, Get} from '../../../src/routing/routes';
import {TestModel} from './testModel';

@Route('GetTest')
export class GetTestController extends Controller {
    /**
     * This is a description of the getModel method
     * this is some more text on another line
     */
    @Get()
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

    @Get('{numberPathParam}/{booleanPathParam}/{stringPathParam}')
    public async getModelByParams(
        numberPathParam: number,
        stringPathParam: string,
        booleanPathParam: boolean,
        booleanParam: boolean,
        stringParam: string,
        numberParam: number): Promise<TestModel> {
        return null;
    }
}
