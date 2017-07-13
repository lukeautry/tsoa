import {
    Controller, Get, Route,
} from '../../../src';
import { TestModel } from '../../fixtures/testModel';
import { ModelService } from '../services/modelService';

@Route('Controller')
export class TestController extends Controller {

    @Get('normalStatusCode')
    public async normalStatusCode(): Promise<TestModel> {
        return Promise.resolve(new ModelService().getModel());
    }

    @Get('customNomalStatusCode')
    public async customNomalStatusCode(): Promise<TestModel> {
        const that = this;
        const service = new ModelService();
        const promise = service.getModelPromise();

        return new Promise<TestModel>(resolve => {
            that.statusCode = 201;
            resolve(promise);
        });
    }

    @Get('noContentStatusCode')
    public async noContentStatusCode(): Promise<void> {
        return Promise.resolve();
    }

    @Get('customNoContentStatusCode')
    public async customNoContentStatusCode(): Promise<void> {
        const that = this;
        const promise = Promise.resolve();

        return new Promise<void>(resolve => {
            that.statusCode = 201;
            resolve(promise);
        });
    }
}
