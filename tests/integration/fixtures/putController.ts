import {Controller} from '../../../src/routing/controller';
import {Route, Put} from '../../../src/routing/routes';
import {TestModel} from './testModel';

@Route('PutTest')
export class GetPutController extends Controller {
    @Put()
    public async putModel(model: TestModel): Promise<TestModel> {
        return null;
    }

    @Put('Location')
    public async putModelAtLocation(): Promise<TestModel> {
        return null;
    }

    @Put('Multi')
    public async putWithMultiReturn(): Promise<TestModel[]> {
        return null;
    }

    @Put('WithId/{id}')
    public async putWithId(id: number): Promise<TestModel> {
        return null;
    }
}
