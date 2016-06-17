import {IRoute} from '../routing/route';

export class Controller {
    public path: string;
    private routes: IRoute[];

    public addRoute(route: IRoute) {
        this.routes = this.routes || new Array<IRoute>();
        this.routes.push(route);
    }

    public getRoutes() {
        return this.routes.map(r => {
            return {
                execute: r.execute,
                method: r.method,
                path: `/${this.path.toLowerCase()}/${r.path.toLowerCase()}`
            };
        });
    }
}