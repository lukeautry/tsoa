import {Controller} from '../../../src/routing/controller';
import {Route, Delete} from '../../../src/routing/routes';
import {TestModel} from './testModel';

@Route('DeleteTest')
export class DeleteTestController extends Controller {
    @Delete()
    public async deleteWithReturnValue(): Promise<TestModel> {
        return null;
    }

    @Delete('Current')
    public async deleteCurrent(): Promise<void> {
        return null;
    }

    @Delete('{numberPathParam}/{booleanPathParam}/{stringPathParam}')
    public async getModelByParams(
        numberPathParam: number,
        stringPathParam: string,
        booleanPathParam: boolean,
        booleanParam: boolean,
        stringParam: string,
        numberParam: number): Promise<void> {
        return null;
    }
}
