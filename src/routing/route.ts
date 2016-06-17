import {Method} from './method';

export interface IRoute {
    method: Method;
    path: string;
    execute: (params: any) => Promise<any>;
}
