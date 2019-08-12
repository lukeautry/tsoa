import {
  Controller,
  CustomAttribute,
  CustomMethodAttribute,
  Get,
  Patch,
  Post,
  Put,
  Route,
} from '../../../src';
import { ModelService } from '../services/modelService';
import { TestModel } from '../testModel';

@Route('CustomMethodAttributeController')
@CustomMethodAttribute('attKey', 'attValue')
@CustomMethodAttribute('attKey1', { test: 'testVal' })
@CustomMethodAttribute('attKey2', ['y0', 'y1'])
@CustomMethodAttribute('attKey3', [{ y0: 'yt0', y1: 'yt1' }, { y2: 'yt2' }])
@CustomMethodAttribute('testPath', '{$PATH}')
@CustomMethodAttribute('testMethod', '{$METHOD}')
export class CustomMethodAttributeController extends Controller {

    @Get('CustomAttribute')
    @CustomAttribute('additionalAttribute', 'value')
    public async customAttributeMethod(): Promise<TestModel> {
        return new ModelService().getModel();
    }

    @Get('Get')
    public async getMethod(): Promise<TestModel> {
        return new ModelService().getModel();
    }

    @Post('Post')
    public async postMethod(): Promise<TestModel> {
        return new ModelService().getModel();
    }

    @Patch('Patch')
    public async patchMethod(): Promise<TestModel> {
        return new ModelService().getModel();
    }

    @Put('Put')
    public async putMethod(): Promise<TestModel> {
        return new ModelService().getModel();
    }
}
