import {TsoaResponse} from '../../src/interfaces/response';

interface User {
    name: string;
    code: number;
}

let userResponse: Promise<TsoaResponse<User>>;
