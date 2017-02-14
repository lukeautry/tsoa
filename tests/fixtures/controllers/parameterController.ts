import { Request, Query, Path, Header, Body } from '../../../src/decorators/parameter';
import { Get, Post } from '../../../src/decorators/methods';
import { Route } from '../../../src/decorators/route';
import { ParameterTestModel } from '../testModel';


@Route('ParameterTest')
export class ParameterController {
    /**
     * Get test paramater
     *
     * @param {string} firstname Firstname description
     * @param {string} lastname Lastname description
     * @param {number} age Age description
     * @param {boolean} human Human description
     */
    @Get('Query')
    public async getQuery(
        @Query() firstname: string,
        @Query('last_name') lastname: string,
        @Query() age: number,
        @Query() human: boolean): Promise<ParameterTestModel> {
        return Promise.resolve<ParameterTestModel>({
            firstname,
            lastname,
            age,
            human
        });
    }

    /**
     * Path test paramater
     *
     * @param {string} firstname Firstname description
     * @param {string} lastname Lastname description
     * @param {number} age Age description
     * @param {boolean} human Human description
     */
    @Get('Path/{firstname}/{last_name}/{age}/{human}')
    public async getPath(
        firstname: string,
        @Path('last_name') lastname: string,
        @Path() age: number,
        @Path() human: boolean): Promise<ParameterTestModel> {
        return Promise.resolve<ParameterTestModel>({
            firstname,
            lastname,
            age,
            human
        });
    }

    /**
     * Header test paramater
     *
     * @param {string} firstname Firstname description
     * @param {string} lastname Lastname description
     * @param {number} age Age description
     * @param {boolean} human Human description
     */
    @Get('Header')
    public async getHeader(
        @Header() firstname: string,
        @Header('last_name') lastname: string,
        @Header() age: number,
        @Header() human: boolean): Promise<ParameterTestModel> {
        return Promise.resolve<ParameterTestModel>({
            firstname,
            lastname,
            age,
            human
        });
    }

    /**
     * Request test paramater
     *
     * @param {object} request Request description
     */
    @Get('Request')
    public async getRequest( @Request() request: any): Promise<ParameterTestModel> {
        return Promise.resolve<ParameterTestModel>({
            age: Number(request.query.age),
            firstname: request.query.firstname,
            human: Boolean(request.query.age),
            lastname: request.query.lastname
        });
    }

    /**
     * Body test paramater
     *
     * @param {object} body Body description
     */
    @Post('Body')
    public async getBody( @Body() body: ParameterTestModel): Promise<ParameterTestModel> {
        return Promise.resolve<ParameterTestModel>({
            age: body.age,
            firstname: body.firstname,
            human: body.human,
            lastname: body.lastname
        });
    }
}
