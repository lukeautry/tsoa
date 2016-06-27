import {Controller} from '../../../src/routing/controller';
import {Route} from '../../../src/decorators/route';
import {Post} from '../../../src/decorators/methods';
import {TestModel} from '../testModel';

@Route('PostTest')
export class InvalidPostTestController extends Controller {

    @Post('WithMultipleBody')
    public async postWithMultipleBodyParams(firstParam: TestModel, secondParam: TestModel): Promise<TestModel> {
        return null;
    }
}
