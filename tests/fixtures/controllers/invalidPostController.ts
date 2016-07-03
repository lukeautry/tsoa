import {Route} from '../../../src/decorators/route';
import {Post} from '../../../src/decorators/methods';
import {TestModel} from '../testModel';

@Route('PostTest')
export class InvalidPostTestController {

    @Post('WithMultipleBody')
    public async postWithMultipleBodyParams(firstParam: TestModel, secondParam: TestModel): Promise<TestModel> {
        return null;
    }
}
