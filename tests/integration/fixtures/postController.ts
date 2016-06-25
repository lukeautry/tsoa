import {Controller} from '../../../src/routing/controller';
import {Route, Post} from '../../../src/routing/routes';
import {TestModel} from './testModel';

@Route('PostTest')
export class GetPostController extends Controller {
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
}
