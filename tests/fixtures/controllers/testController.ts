import {
    Route, Get, TsoaResponse
} from '../../../src';
import { TestModel } from '../../fixtures/testModel';
import { ModelService } from '../services/modelService';

@Route('Controller')
export class TestController {

    @Get('normalStatusCode')
    public async normalStatusCode(): Promise<TsoaResponse<TestModel>> {
        return Promise.resolve({body: new ModelService().getModel()});
    }

    @Get('customNomalStatusCode')
    public async customNomalStatusCode(): Promise<TsoaResponse<TestModel>> {
        const service = new ModelService();
        const promise = service.getModelPromise()
            .then(m => {
                return {body: m, status: 201};
            })

        return new Promise<TsoaResponse<TestModel>>(resolve => {
            resolve(promise);
        });
    }

    @Get('noContentStatusCode')
    public async noContentStatusCode(): Promise<TsoaResponse<void>> {
        return Promise.resolve({});
    }

    @Get('customNoContentStatusCode')
    public async customNoContentStatusCode(): Promise<TsoaResponse<void>> {
        const promise = Promise.resolve({status: 201});

        return new Promise<TsoaResponse<void>>(resolve => {
            resolve(promise);
        });
    }
}
