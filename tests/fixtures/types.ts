import {TsoaResponse} from '../../src/interfaces/response';

interface User {
    name: string;
    code: number;
}

const userResponse: Promise<TsoaResponse<User>> = null;
