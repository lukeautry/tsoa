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

function getParamNames(func: Function): string[] {
    const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
    const ARGUMENT_NAMES = /([^\s,]+)/g;
    const fnStr = func.toString().replace(STRIP_COMMENTS, '');
    const result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);

    return result || [];
}
