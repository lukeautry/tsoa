import {Route} from './route';

export class Controller {
    public path: string;
    private routes: Route[];

    public addRoute(route: Route) {
        this.routes = this.routes || new Array<Route>();
        this.routes.push(route);
    }

    public getRoutes(): Route[] {
        return this.routes.map(r => {
            return {
                execute: r.execute,
                method: r.method,
                path: `/${this.path}/${r.path}`
            };
        });
    }
}
