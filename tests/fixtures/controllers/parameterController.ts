import {
    Request,
    Query,
    Path,
    Header,
    Body,
    BodyProp,
    IsInt,
    IsFloat,
    Get,
    Post,
    Route
} from '../../../src';
import { ParameterTestModel, Gender } from '../testModel';

@Route('ParameterTest')
export class ParameterController {
    /**
     * Get test paramater
     *
     * @param {string} firstname Firstname description
     * @param {string} lastname Lastname description
     * @param {number} age Age description
     * @param {number} weight Weight description
     * @param {boolean} human Human description
     * @param {Gender} gender Gender description
     */
    @Get('Query')
    public async getQuery(
        @Query() firstname: string,
        @Query('last_name') lastname: string,
        @Query() @IsInt() age: number,
        @Query() @IsFloat() weight: number,
        @Query() human: boolean,
        @Query() gender: Gender
        ): Promise<ParameterTestModel> {
        return Promise.resolve<ParameterTestModel>({
            firstname,
            lastname,
            age,
            weight,
            human,
            gender
        });
    }

    /**
     * Path test paramater
     *
     * @param {string} firstname Firstname description
     * @param {string} lastname Lastname description
     * @param {number} age Age description
     * @param {number} weight Weight description
     * @param {boolean} human Human description
     * @param {Gender} gender Gender description
     */
    @Get('Path/{firstname}/{last_name}/{age}/{weight}/{human}/{gender}')
    public async getPath(
        firstname: string,
        @Path('last_name') lastname: string,
        @Path() @IsInt() age: number,
        @Path() @IsFloat() weight: number,
        @Path() human: boolean,
        @Path() gender: Gender
        ): Promise<ParameterTestModel> {
        return Promise.resolve<ParameterTestModel>({
            firstname,
            lastname,
            age,
            weight,
            human,
            gender
        });
    }

    /**
     * Header test paramater
     *
     * @param {string} firstname Firstname description
     * @param {string} lastname Lastname description
     * @param {number} age Age description
     * @param {number} weight Weight description
     * @param {boolean} human Human description
     * @param {Gender} gender Gender description
     */
    @Get('Header')
    public async getHeader(
        @Header() firstname: string,
        @Header('last_name') lastname: string,
        @Header() @IsInt() age: number,
        @Header() @IsFloat() weight: number,
        @Header() human: boolean,
        @Header() gender: Gender
        ): Promise<ParameterTestModel> {
        return Promise.resolve<ParameterTestModel>({
            firstname,
            lastname,
            age,
            weight,
            human,
            gender
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
            gender: request.query.gender === 'MALE' ? Gender.MALE : Gender.FEMALE,
            human: Boolean(request.query.age),
            lastname: request.query.lastname,
            weight: Number(request.query.weight),
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
            gender: body.gender,
            human: body.human,
            lastname: body.lastname,
            weight: body.weight
        });
    }

    /**
     * @param {string} firstname firstname description
     * @param {string} lastname lastname description
     * @param {number} age age description
     * @param {number} weight weight description
     * @param {boolean} human human description
     * @param {Gender} gender Gender description
     */
    @Post('BodyProps')
    public async getBodyProps(
        @BodyProp('firstname') firstname: string,
        @BodyProp('lastname') lastname: string,
        @BodyProp('age') @IsInt() age: number,
        @BodyProp('weight') @IsFloat() weight: number,
        @BodyProp('human') human: boolean,
        @BodyProp('gender') gender: Gender): Promise<ParameterTestModel> {
        return Promise.resolve<ParameterTestModel>({
            age: age,
            firstname: firstname,
            human: human,
            lastname: lastname,
            weight,
            gender
        });
    }
}
