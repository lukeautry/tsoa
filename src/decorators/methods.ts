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
        const args = getParams(func);

        target.addRoute({
            execute: params => {
                try {
                    validateParameters(args.filter(a => a.required).map(a => a.name), params);
                } catch (err) {
                    return Promise.reject(err);
                }

                const argNames = args.map(a => a.name);
                return func.apply(target, argNames.map(p => params[p]));
            },
            method: method,
            path: path || ''
        });
    };
}

function getParams(func: Function): ProcessedParameter[] {
    const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
    const ARGUMENT_NAMES = /([^\s,]+)/g;
    const fnStr = func.toString().replace(STRIP_COMMENTS, '');

    const params = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
    if (!params) { return []; }

    const processedParams = new Array<ProcessedParameter>();
    params.forEach(param => {
        switch (param) {
            case 'undefined':
                break;
            case '=':
                processedParams[processedParams.length - 1].required = false;
                break;
            default:
                processedParams.push({
                    name: param,
                    required: true
                });
        }
    });

    return processedParams;
}

interface ProcessedParameter {
    name: string;
    required: boolean;
}
