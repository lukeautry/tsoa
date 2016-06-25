import * as express from 'express';
import {Controller} from '../routing/controller';
import {Route} from '../routing/route';
import {Method} from '../routing/method';
import {Exception} from '../routing/exceptions';

export function RegisterExpressRoutes(app: express.Express, controllerTypes: (typeof Controller)[]) {
    controllerTypes.forEach(controllerType => {
        new controllerType().getRoutes().forEach(r => addRoute(app, r));
    });
}

function addRoute(app: express.Express, route: Route) {
    const methodMap: { [method: number]: (path: string, handler: (req: express.Request, response: express.Response) => void) => void } = {};
    methodMap[Method.Get] = app.get;
    methodMap[Method.Post] = app.post;
    methodMap[Method.Patch] = app.patch;
    methodMap[Method.Delete] = app.delete;
    methodMap[Method.Put] = app.put;

    const func = methodMap[route.method];
    func.call(app, getExpressPath(route.path), (req: express.Request, res: express.Response) => requestHandler(req, res, route));
}

function getExpressPath(path: string) {
    return path.replace('{', ':').replace('}', '');
}

function requestHandler(request: express.Request, response: express.Response, route: Route) {
    response.contentType('applicaton/json');

    route.execute(getParams(request))
        .then(data => {
            if (data) {
                response.status(200);
                response.write(JSON.stringify(data));
            } else {
                response.status(204);
            }

            response.end();
        })
        .catch((error: Exception) => {
            response.status(error.status);
            response.write(JSON.stringify(error));
            response.end();
        });
}

function getParams(request: express.Request) {
    const merged: any = {};
    for (let attrname in request.body) { merged[attrname] = request.body[attrname]; }
    for (let attrname in request.params) { merged[attrname] = request.params[attrname]; }
    for (let attrname in request.query) { merged[attrname] = request.query[attrname]; }
    return merged;
}
