import {Controller} from '../controllers/controller';
import {Method} from './method';

export function Route(name: string) {
    return (target: typeof Controller) => {
        target.prototype.path = name;
    };
}

export function Get(value: string) {
    return (target: Controller, propertyKey: string, description: PropertyDescriptor) => {
        const func: Function = (target as any)[propertyKey];
        const args = getParamNames(func); // ["id"]

        target.addRoute({
            execute: params => {
                // e.g. map { id: number; } to myFunction(id)
                return func.apply(target, args.map(p => params[p]));
            },
            method: Method.Get,
            path: value
        });
    };
}

export function Post(value?: string) {
    return (target: Controller, propertyKey: string, description: PropertyDescriptor) => {
        const func: Function = (target as any)[propertyKey];
        const args = getParamNames(func); // ["request"]

        target.addRoute({
            execute: params => {
                return func.apply(target, args.map(p => params[p]));
            },
            method: Method.Post,
            path: value || ""
        });
    };
}

function getParamNames(func: Function) {
    const pattern = /[A-Z][a-z]+[(]{1}(.+?)[)]{1}/g;
    const match = pattern.exec(func.toString());

    return match && match[1] ? match[1].split(', ') : [];
}
