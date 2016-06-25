import {Controller} from '../../../src/routing/controller';
import {Route, Patch} from '../../../src/routing/routes';
import {TestModel} from './testModel';

@Route('PatchTest')
export class GetPatchController extends Controller {
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
