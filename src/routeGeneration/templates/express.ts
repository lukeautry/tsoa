/* tslint:disable */
{{#if canImportByAlias}}
  import { Controller, ValidationService, FieldErrors, ValidateError, TsoaRoute } from 'tsoa';
{{else}}
  import { Controller, ValidationService, FieldErrors, ValidateError, TsoaRoute } from '../../../src';
{{/if}}
{{#if iocModule}}
import { iocContainer } from '{{iocModule}}';
{{/if}}
{{#each controllers}}
import { {{name}} } from '{{modulePath}}';
{{/each}}
{{#if authenticationModule}}
import { expressAuthentication } from '{{authenticationModule}}';
{{/if}}
import * as express from 'express';

const models: TsoaRoute.Models = {
    {{#each models}}
    "{{@key}}": {
        {{#if enums}}
        "enums": {{{json enums}}},
        {{/if}}
        {{#if properties}}
        "properties": {
            {{#each properties}}
            "{{@key}}": {{{json this}}},
            {{/each}}
        },
        {{/if}}
        {{#if additionalProperties}}
        "additionalProperties": {{{json additionalProperties}}},
        {{/if}}
    },
    {{/each}}
};
const validationService = new ValidationService(models);

export function RegisterRoutes(app: express.Express) {
    {{#each controllers}}
    {{#each actions}}
        app.{{method}}('{{fullPath}}',
            {{#if security.length}}
            authenticateMiddleware({{json security}}),
            {{/if}}
            function (request: any, response: any, next: any) {
            const args = {
                {{#each parameters}}
                    {{@key}}: {{{json this}}},
                {{/each}}
            };

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request);
            } catch (err) {
                return next(err);
            }

            {{#if ../../iocModule}}
            const controller = iocContainer.get<{{../name}}>({{../name}});
            if (typeof controller['setStatus'] === 'function') {
                (<any>controller).setStatus(undefined);
            }
            {{else}}
            const controller = new {{../name}}();
            {{/if}}


            const promise = controller.{{name}}.apply(controller, validatedArgs as any);
            promiseHandler(controller, promise, response, next);
        });
    {{/each}}
    {{/each}}

    {{#if useSecurity}}
    function authenticateMiddleware(security: TsoaRoute.Security[] = []) {
        return (request: any, _response: any, next: any) => {
            let responded = 0;
            let success = false;

            const succeed = function(user: any) {
                if (!success) {
                    success = true;
                    responded++;
                    request['user'] = user;
                    next();
                }
            }

            const fail = function(error: any) {
                responded++;
                if (responded == security.length && !success) {
                    error.status = 401;
                    next(error)
                }
            }

            for (const secMethod of security) {
                if (Object.keys(secMethod).length > 1) {
                    let promises: Promise<any>[] = [];

                    for (const name in secMethod) {
                        promises.push(expressAuthentication(request, name, secMethod[name]));
                    }

                    Promise.all(promises)
                        .then((users) => { succeed(users[0]); })
                        .catch(fail);
                } else {
                    for (const name in secMethod) {
                        expressAuthentication(request, name, secMethod[name])
                            .then(succeed)
                            .catch(fail);
                    }
                }
            }
        }
    }
    {{/if}}

    function isController(object: any): object is Controller {
        return 'getHeaders' in object && 'getStatus' in object && 'setStatus' in object;
    }

    function promiseHandler(controllerObj: any, promise: any, response: any, next: any) {
        return Promise.resolve(promise)
            .then((data: any) => {
                let statusCode;
                if (isController(controllerObj)) {
                    const headers = controllerObj.getHeaders();
                    Object.keys(headers).forEach((name: string) => {
                        response.set(name, headers[name]);
                    });

                    statusCode = controllerObj.getStatus();
                }

                if (data || data === false) { // === false allows boolean result
                    response.status(statusCode || 200).json(data);
                } else {
                    response.status(statusCode || 204).end();
                }
            })
            .catch((error: any) => next(error));
    }

    function getValidatedArgs(args: any, request: any): any[] {
        const fieldErrors: FieldErrors  = {};
        const values = Object.keys(args).map((key) => {
            const name = args[key].name;
            switch (args[key].in) {
                case 'request':
                    return request;
                case 'query':
                    return validationService.ValidateParam(args[key], request.query[name], name, fieldErrors);
                case 'path':
                    return validationService.ValidateParam(args[key], request.params[name], name, fieldErrors);
                case 'header':
                    return validationService.ValidateParam(args[key], request.header(name), name, fieldErrors);
                case 'body':
                    return validationService.ValidateParam(args[key], request.body, name, fieldErrors, name + '.');
                case 'body-prop':
                    return validationService.ValidateParam(args[key], request.body[name], name, fieldErrors, 'body.');
            }
        });
        if (Object.keys(fieldErrors).length > 0) {
            throw new ValidateError(fieldErrors, '');
        }
        return values;
    }
}
