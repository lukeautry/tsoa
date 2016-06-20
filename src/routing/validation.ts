import {InvalidRequestException} from './exceptions';

export function validateParameters(routeArgs: string[], requestParams: any) {
    const missingParams = routeArgs.filter(a => !requestParams[a]);
    if (missingParams.length) {
        throw new InvalidRequestException(`Required parameters missing: ${missingParams.join(', ')}`);
    }
}
