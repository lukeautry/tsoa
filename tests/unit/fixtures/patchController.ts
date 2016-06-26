import {Controller} from '../../../src/routing/controller';
import {Route} from '../../../src/decorators/route';
import {Patch} from '../../../src/decorators/methods';
import {TestModel} from './testModel';

@Route('PatchTest')
export class PatchTestController extends Controller {
    @Patch()
    public async patchModel(model: TestModel): Promise<TestModel> {
        return null;
    }

    @Patch('Location')
    public async patchModelAtLocation(): Promise<TestModel> {
        return null;
    }

    @Patch('Multi')
    public async patchWithMultiReturn(): Promise<TestModel[]> {
        return null;
    }

    @Patch('WithId/{id}')
    public async patchWithId(id: number): Promise<TestModel> {
        return null;
    }
}
