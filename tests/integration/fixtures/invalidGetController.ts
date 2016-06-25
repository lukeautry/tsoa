import {Controller} from '../../../src/routing/controller';
import {Route, Get} from '../../../src/routing/routes';
import {TestModel} from './testModel';

@Route('GetTest')
export class InvalidGetTestController extends Controller {
    @Get('Complex')
    public async getModelWithComplex(myModel: TestModel): Promise<TestModel> {
        return null;
    }
}
