import {
    Controller, Get, Route,
} from '../../../src';
import { TestModel } from '../../fixtures/testModel';
import { NonFactoryDecorator } from '../custom/non-factory-decorator';
import { ModelService } from '../services/modelService';

@Route('Controller')
export class TestController extends Controller {

    @NonFactoryDecorator
    @Get('normalStatusCode')
    public async normalStatusCode(): Promise<TestModel> {
        return Promise.resolve(new ModelService().getModel());
    }

    @Get('noContentStatusCode')
    public async noContentStatusCode(): Promise<void> {
        return;
    }

    @Get('falseStatusCode')
    public async falseStatusCode(): Promise<boolean> {
        return false;
    }

    @Get('customStatusCode')
    public async customNomalStatusCode(): Promise<TestModel> {
        const service = new ModelService();

        return new Promise<TestModel>(resolve => {
            setTimeout(() => {
                this.setStatus(205);
                resolve(service.getModel());
            }, 1000);
        });
    }

    @Get('customHeader')
    public async customHeader(): Promise<void> {
        return new Promise<void>(resolve => {
            setTimeout(() => {
                this.setHeader('hero', 'IronMan');
                this.setHeader('name', 'Tony Stark');
                resolve();
            }, 1000);
        });
    }
}
