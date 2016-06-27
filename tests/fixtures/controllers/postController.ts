import {Controller} from '../../../src/routing/controller';
import {Route} from '../../../src/decorators/route';
import {Post} from '../../../src/decorators/methods';
import {TestModel} from '../testModel';

@Route('PostTest')
export class PostTestController extends Controller {
    @Post()
    public async postModel(model: TestModel): Promise<TestModel> {
        return null;
    }

    @Post('Location')
    public async postModelAtLocation(): Promise<TestModel> {
        return null;
    }

    @Post('Multi')
    public async postWithMultiReturn(): Promise<TestModel[]> {
        return null;
    }

    @Post('WithId/{id}')
    public async postWithId(id: number): Promise<TestModel> {
        return null;
    }

    @Post('WithBodyAndQueryParams')
    public async postWithBodyAndQueryParams(model: TestModel, query: string): Promise<TestModel> {
        return null;
    }
}
