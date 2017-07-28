export declare class Controller {
    private statusCode?;
    private headers;
    setStatus(statusCode: number): void;
    getStatus(): number | undefined;
    setHeader(name: string, value?: string): void;
    getHeader(name: string): string | undefined;
    getHeaders(): {
        [name: string]: string | undefined;
    };
}
