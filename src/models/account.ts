import {User} from './user';

export interface Account {
    id: number;
    address?: string;
    name: string;
    users?: User[];
    fields?: string[];
}
