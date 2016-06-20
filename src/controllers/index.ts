import {Controller} from './controller';
import {AccountsController} from './accountsController';
import {UsersController} from './usersController';

export const controllers: (typeof Controller)[] = [
    AccountsController,
    UsersController
];
