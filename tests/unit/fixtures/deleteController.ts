import {Controller} from '../../../src/routing/controller';
import {Route} from '../../../src/decorators/route';
import {Delete} from '../../../src/decorators/methods';
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
