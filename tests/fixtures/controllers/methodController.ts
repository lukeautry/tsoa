import {
    Get,
    Post,
    Patch,
    Put,
    Delete,
    Route,
    Response,
    SuccessResponse,
    TsoaResponse,
    Tags,
    Security
} from '../../../src';
import { ModelService } from '../services/modelService';
import { TestModel, ErrorResponseModel } from '../testModel';

@Route('MethodTest')
export class MethodController {

    @Get('Get')
    public async getMethod(): Promise<TsoaResponse<TestModel>> {
        return {body: new ModelService().getModel()};
    }

    @Post('Post')
    public async postMethod(): Promise<TsoaResponse<TestModel>> {
        return {body: new ModelService().getModel()};
    }

    @Patch('Patch')
    public async patchMethod(): Promise<TsoaResponse<TestModel>> {
        return {body: new ModelService().getModel()};
    }

    @Put('Put')
    public async putMethod(): Promise<TsoaResponse<TestModel>> {
        return {body: new ModelService().getModel()};
    }

    @Delete('Delete')
    public async deleteMethod(): Promise<TsoaResponse<TestModel>> {
        return {body: new ModelService().getModel()};
    }

    /**
     * method description
     */
    @Get('Description')
    public async description(): Promise<TsoaResponse<TestModel>> {
        return {body: new ModelService().getModel()};
    }

    @Tags('Tag1', 'Tag2', 'Tag3')
    @Get('Tags')
    public async tags(): Promise<TsoaResponse<TestModel>> {
        return {body: new ModelService().getModel()};
    }

    @Response<ErrorResponseModel>('400', 'Bad Request')
    @Response<ErrorResponseModel>('401', 'Unauthorized')
    @Response<ErrorResponseModel>('default', 'Unexpected error')
    @Get('MultiResponse')
    public async multiResponse(): Promise<TsoaResponse<TestModel>> {
        return {body: new ModelService().getModel()};
    }

    @SuccessResponse('201', 'Created')
    @Get('SuccessResponse')
    public async successResponse(): Promise<TsoaResponse<void>> {
        return Promise.resolve({status: 201});
    }

    @Security('api_key')
    @Get('ApiSecurity')
    public async apiSecurity(): Promise<TsoaResponse<TestModel>> {
        return {body: new ModelService().getModel()};
    }

    @Security('tsoa_auth', ['write:pets', 'read:pets'])
    @Get('OauthSecurity')
    public async oauthSecurity(): Promise<TsoaResponse<TestModel>> {
        return {body: new ModelService().getModel()};
    }

    /**
     * @deprecated
     */
    @Get('DeprecatedMethod')
    public async deprecatedMethod(): Promise<TsoaResponse<TestModel>> {
        return {body: new ModelService().getModel()};
    }

    /**
     * @summary simple summary
     */
    @Get('SummaryMethod')
    public async summaryMethod(): Promise<TsoaResponse<TestModel>> {
        return {body: new ModelService().getModel()};
    }
}
