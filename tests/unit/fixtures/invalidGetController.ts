import {Controller} from '../../../src/routing/controller';
import {Route} from '../../../src/decorators/route';
import {Get} from '../../../src/decorators/methods';
import {TestModel} from './testModel';

@Route('GetTest')
export class InvalidGetTestController extends Controller {
    @Get('Complex')
    public async getModelWithComplex(myModel: TestModel): Promise<TestModel> {
        return null;
    }
}
