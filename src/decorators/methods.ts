import {Controller} from '../routing/controller';
import {Method} from '../routing/method';
import {validateParameters} from '../routing/validation';

export function Get(value?: string) {
    return routeGenerator(Method.Get, value);
}

export function Post(value?: string) {
    return routeGenerator(Method.Post, value);
}

export function Patch(value?: string) {
    return routeGenerator(Method.Patch, value);
}

export function Put(value?: string) {
    return routeGenerator(Method.Put, value);
}

export function Delete(value?: string) {
    return routeGenerator(Method.Delete, value);
}

function routeGenerator(method: Method, path?: string) {
    return (target: Controller, propertyKey: string, description: PropertyDescriptor) => {
        const func: Function = (target as any)[propertyKey];
        const args = getParamNames(func);

        target.addRoute({
            execute: params => {
                try {
                    validateParameters(args, params);
                } catch (err) {
                    return Promise.reject(err);
                }

                return func.apply(target, args.map(p => params[p]));
            },
            method: method,
            path: path || ''
        });
    };
}

function getParamNames(func: Function) {
    const pattern = /[A-Z][a-z]+[(]{1}(.+?)[)]{1}/g;
    const match = pattern.exec(func.toString());

    return match && match[1] ? match[1].split(', ') : [];
}
