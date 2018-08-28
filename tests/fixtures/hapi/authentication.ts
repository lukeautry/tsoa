export function hapiAuthentication(request: any, name: string, scopes?: string[]): Promise<any> {
    if (name === 'api_key') {
        let token;
        if (request.query && request.query.access_token) {
            token = request.query.access_token;
        } else {
            return Promise.reject({});
        }

        if (token === 'abc123456') {
            return Promise.resolve({
                id: 1,
                name: 'Ironman',
            });
        } else if (token === 'xyz123456') {
            return Promise.resolve({
                id: 2,
                name: 'Thor',
            });
        } else {
            return Promise.reject({});
        }
    } else {
        if (request.query && request.query.tsoa && request.query.tsoa === 'abc123456') {
            return Promise.resolve({});
        } else {
            return Promise.reject({});
        }
    }
}
