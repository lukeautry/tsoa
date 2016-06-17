import {Controller} from './controller';
import {Route, Get, Post} from '../routing/routes';

@Route('Users')
export class UsersController extends Controller {
    @Get("Current")
    public async Current(): Promise<IUser> {
        return {
            email: 'test',
            id: 666
        };
    }

    @Get(':id')
    public async Get(id: number): Promise<IUser> {
        return {
            email: 'test2',
            id: id
        };
    }

    @Post()
    public async Create(request: IUserCreateRequest): Promise<IUser> {
        return {
            email: request.email,
            id: 666
        };
    }
}

export interface IUser {
    id: number;
    email: string;
}

export interface IUserCreateRequest {
    email: string;
}

