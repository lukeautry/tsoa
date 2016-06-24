import {Controller} from './controller';
import {Route, Get} from '../routing/routes';
import {Account} from '../models/account';
import {User} from '../models/user';

@Route('Accounts')
export class AccountsController extends Controller {

    /**
     * Get the current user
     */
    @Get('Current')
    public async current(): Promise<Account> {
        return {
            id: 600,
            name: 'test'
        };
    }

    @Get('Users')
    public async getUsers(): Promise<User[]> {
        return [
            {
                email: 'test@test.com',
                id: 1
            },
            {
                email: 'test2@test2.com',
                id: 2
            }
        ];
    }
}
