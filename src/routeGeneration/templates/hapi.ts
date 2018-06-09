// TODO: Replace this with HAPI middleware stuff
/* tslint:disable */
{{#if canImportByAlias}}
  import { Controller, ValidateParam, FieldErrors, ValidateError, TsoaRoute } from 'tsoa';
{{else}}
  import { Controller, ValidateParam, FieldErrors, ValidateError, TsoaRoute } from '../../../src';
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

export function RegisterRoutes(server: any) {
    {{#each controllers}}
    {{#each actions}}
        server.route({
            method: '{{method}}',
            path: '{{fullPath}}',
            config: {
                {{#if security.length}}
                pre: [
                    {
                      method: authenticateMiddleware({{json security}})
                    }
                ],
                {{/if}}
                handler: (request: any, reply: any) => {
                    const args = {
                        {{#each parameters}}
                            {{@key}}: {{{json this}}},
                        {{/each}}
                    };

                    let validatedArgs: any[] = [];
                    try {
                        validatedArgs = getValidatedArgs(args, request);
                    } catch (err) {
                        return reply(err).code(err.status || 500);
                    }

                    {{#if ../../iocModule}}
                    const controller = iocContainer.get<{{../name}}>({{../name}});
                    {{else}}
                    const controller = new {{../name}}();
                    {{/if}}

                    const promise = controller.{{name}}.apply(controller, validatedArgs);
                    return promiseHandler(controller, promise, request, reply);
                }
            }
        });
    {{/each}}
    {{/each}}

    {{#if useSecurity}}
    function authenticateMiddleware(security: TsoaRoute.Security[] = []) {
        return (request: any, reply: any) => {
            let responded = 0;
            let success = false;
            for (const secMethod of security) {
                hapiAuthentication(request, secMethod.name, secMethod.scopes).then((user: any) => {
                    // only need to respond once
                    if (!success) {
                        success = true;
                        responded++;
                        request['user'] = user;
                        reply.continue();
                    }
                })
                .catch((error: any) => {
                    responded++;
                    if (responded == security.length && !success) {
                        reply(error).code(error.status || 401);
                    }
                })
            }
        }
    }
    {{/if}}

    function promiseHandler(controllerObj: any, promise: any, request: any, reply: any) {
        return Promise.resolve(promise)
            .then((data: any) => {
                const response = (data || data === false) ? reply(data).code(200) : reply("").code(204);

                if (controllerObj instanceof Controller) {
                    const controller = controllerObj as Controller
                    const headers = controller.getHeaders();
                    Object.keys(headers).forEach((name: string) => {
                        response.header(name, headers[name]);
                    });

                    const statusCode = controller.getStatus();
                    if (statusCode) {
                        response.code(statusCode);
                    }
                }
                return response;
            })
            .catch((error: any) => reply(error).code(error.status || 500));
    }

    function getValidatedArgs(args: any, request: any): any[] {
        const errorFields: FieldErrors = {};
        const values = Object.keys(args).map(key => {
            const name = args[key].name;
            switch (args[key].in) {
            case 'request':
                return request;
            case 'query':
                return ValidateParam(args[key], request.query[name], models, name, errorFields)
            case 'path':
                return ValidateParam(args[key], request.params[name], models, name, errorFields)
            case 'header':
                return ValidateParam(args[key], request.headers[name], models, name, errorFields);
            case 'body':
                return ValidateParam(args[key], request.payload, models, name, errorFields, name + '.');
             case 'body-prop':
                return ValidateParam(args[key], request.payload[name], models, name, errorFields, 'body.');
            }
        });
        if (Object.keys(errorFields).length > 0) {
            throw new ValidateError(errorFields, '');
        }
        return values;
    }
}
