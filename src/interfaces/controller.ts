
export class Controller {
    private statusCode?: number  = undefined;

    public getStatus() {
        return this.statusCode;
    }

    public setStatus(statusCode: number) {
        this.statusCode = statusCode;
    }
}
