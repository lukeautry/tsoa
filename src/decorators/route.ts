import {Controller} from '../routing/controller';

export function Route(name: string) {
    return (target: typeof Controller) => {
        target.prototype.path = name;
    };
}
