import * as express from 'express';
import {Controller} from './controller';
import {UsersController} from './usersController';
import {IRoute} from '../routing/route';
import {Method} from '../routing/method';

const controllers: (typeof Controller)[] = [
    UsersController
];

export function RegisterControllers(app: express.Express) {
    controllers.forEach(controllerType => {
        new controllerType().getRoutes().forEach(r => addRoute(app, r));
    });
}

function addRoute(app: express.Express, route: IRoute) {
    const methodMap: { [method: number]: (path: string, handler: (req: express.Request, response: express.Response) => void) => void } = {};
    methodMap[Method.Get] = app.get;
    methodMap[Method.Post] = app.post;
    methodMap[Method.Patch] = app.patch;
    methodMap[Method.Delete] = app.delete;
    methodMap[Method.Put] = app.put;

    const func = methodMap[route.method];
    func.call(app, route.path, (req: express.Request, res: express.Response) => requestHandler(req, res, route));
}

function requestHandler(request: express.Request, response: express.Response, route: IRoute) {
    route.execute(request.params)
        .then(data => {
            response.write(JSON.stringify(data));
            response.end();
        })
        .catch(error => {
            response.status(500);
            response.write(JSON.stringify(error));
            response.end();
        });
}
