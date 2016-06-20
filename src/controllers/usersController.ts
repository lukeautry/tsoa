import {Controller} from './controller';
import {Route, Get, Post, Patch, Delete} from '../routing/routes';
import {User, UserCreateRequest, UserUpdateRequest} from '../models/user';

@Route('Users')
export class UsersController extends Controller {
    @Get('Current')
    public async Current(): Promise<User> {
        return {
            email: 'test',
            id: 666
        };
    }

    @Get(':id')
    public async Get(id: number): Promise<User> {
        return {
            email: 'test2',
            id: id
        };
    }

    @Post()
    public async Create(request: UserCreateRequest): Promise<User> {
        return {
            email: request.email,
            id: 666
        };
    }

    @Delete(':id')
    public async Delete(id: number): Promise<void> {
        return Promise.resolve();
    }

    @Patch()
    public async Update(request: UserUpdateRequest): Promise<User> {
        return {
            email: request.email,
            id: 1337
        };
    }
}
