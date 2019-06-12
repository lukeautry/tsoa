// TODO: Replace this with HAPI middleware stuff
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
import { hapiAuthentication } from '{{authenticationModule}}';
{{/if}}

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

export function RegisterRoutes(server: any) {
    {{#each controllers}}
    {{#each actions}}
        server.route({
            method: '{{method}}',
            path: '{{fullPath}}',
            options: {
                {{#if security.length}}
                pre: [
                    {
                      method: authenticateMiddleware({{json security}}),
                      assign: "user"
                    }
                ],
                {{/if}}
                handler: (request: any, h: any) => {
                    const args = {
                        {{#each parameters}}
                            {{@key}}: {{{json this}}},
                        {{/each}}
                    };

                    let validatedArgs: any[] = [];
                    try {
                        validatedArgs = getValidatedArgs(args, request);
                    } catch (err) {
                        return h
                            .response(err)
                            .code(err.status || 500);
                    }

                    {{#if ../../iocModule}}
                    const controller = iocContainer.get<{{../name}}>({{../name}});
                    {{else}}
                    const controller = new {{../name}}();
                    {{/if}}

                    const promise = controller.{{name}}.apply(controller, validatedArgs as any);
                    return promiseHandler(controller, promise, request, h);
                }
            }
        });
    {{/each}}
    {{/each}}

    {{#if useSecurity}}
    function authenticateMiddleware(security: TsoaRoute.Security[] = []) {
        return (request: any, h: any) => {
            let responded = 0;
            let success = false;

            const succeed = function(user: any) {
                if (!success) {
                    success = true;
                    responded++;
                    request['user'] = user;
                }
                return user;
            };

            const fail = function(error: any) {
                responded++;
                if (responded == security.length && !success) {
                    h.response(error).code(error.status || 401);
                }
                return error;
            };

            for (const secMethod of security) {
                if (Object.keys(secMethod).length > 1) {
                    let promises: Promise<any>[] = [];

                    for (const name in secMethod) {
                        promises.push(hapiAuthentication(request, name, secMethod[name]));
                    }

                    return Promise.all(promises)
                        .then((users) => { succeed(users[0]); })
                        .catch(fail);
                } else {
                    for (const name in secMethod) {
                        return hapiAuthentication(request, name, secMethod[name])
                            .then(succeed)
                            .catch(fail);
                    }
                }
            }
            return null;
        }
    }
    {{/if}}

    function isController(object: any): object is Controller {
        return 'getHeaders' in object && 'getStatus' in object && 'setStatus' in object;
    }

    function promiseHandler(controllerObj: any, promise: any, request: any, h: any) {
        return Promise.resolve(promise)
            .then((data: any) => {
                const response = (data || data === false)
                    ? h.response(data).code(200)
                    : h.response("").code(204);

                if (isController(controllerObj)) {
                    const headers = controllerObj.getHeaders();
                    Object.keys(headers).forEach((name: string) => {
                        response.header(name, headers[name]);
                    });

                    const statusCode = controllerObj.getStatus();
                    if (statusCode) {
                        response.code(statusCode);
                    }
                }
                return response;
            })
            .catch((error: any) => h.response(error).code(error.status || 500));
    }

    function getValidatedArgs(args: any, request: any): any[] {
        const errorFields: FieldErrors = {};
        const values = Object.keys(args).map(key => {
            const name = args[key].name;
            switch (args[key].in) {
            case 'request':
                return request;
            case 'query':
                return validationService.ValidateParam(args[key], request.query[name], name, errorFields)
            case 'path':
                return validationService.ValidateParam(args[key], request.params[name], name, errorFields)
            case 'header':
                return validationService.ValidateParam(args[key], request.headers[name], name, errorFields);
            case 'body':
                return validationService.ValidateParam(args[key], request.payload, name, errorFields, name + '.');
             case 'body-prop':
                return validationService.ValidateParam(args[key], request.payload[name], name, errorFields, 'body.');
            }
        });
        if (Object.keys(errorFields).length > 0) {
            throw new ValidateError(errorFields, '');
        }
        return values;
    }
}
