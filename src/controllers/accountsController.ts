import {Controller} from './controller';
import {Route, Get} from '../routing/routes';
import {Account} from '../models/account';

@Route('Accounts')
export class AccountsController extends Controller {

    @Get('Current')
    public async current(): Promise<Account> {
        return {
            id: 600,
            name: 'test'
        };
    }
}
