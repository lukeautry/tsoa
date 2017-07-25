export interface TsoaResponse<T> {
    /**
     * The HTTP status code
     */
    status?: number;
    body?: T;
}
