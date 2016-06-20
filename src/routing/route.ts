import {Method} from './method';

export interface Route {
    method: Method;
    path: string;
    execute: (params: any) => Promise<any>;
}
