export interface Exception extends Error {
    status: number;
}

export class InvalidRequestException implements Exception {
    public status = 400;
    public name = 'Invalid Request';

    constructor(public message: string) { }
}
