// TODO: Replace this with HAPI middleware stuff
export const hapiTemplate = `
/* tslint:disable:forin */
import * as hapi from 'hapi';
{{#if useSecurity}}
import { set } from 'lodash';
{{/if}}
{{#if authenticationModule}}
import { hapiAuthentication } from '{{authenticationModule}}';
{{/if}}

export function RegisterRoutes(server: hapi.Server) {
    {{#each controllers}}
    {{#each actions}}
        server.route({
            method: '{{method}}',
            path: '{{../../basePath}}/{{../path}}{{path}}',
            config: { 
                {{#if security}} 
                pre: [
                    { 
                      method: authenticateMiddleware('{{security.name}}'
                              {{#if security.scopes.length}} 
                              , [
                                  {{#each security.scopes}} 
                                    '{{this}}'{{#if @last}} {{else}}, {{/if}}
                                  {{/each}}
                              ]
                              {{/if}}
                    )}
                ],
                {{/if}} 
                handler: (request: any, reply) => {
                    const args = {
                        {{#each parameters}}
                        '{{argumentName}}': { name: '{{name}}', typeName: '{{typeName}}', required: {{required}}, in: '{{in}}', {{#if arrayType}}, arrayType: '{{arrayType}}' {{/if}} },
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
                    let statusCode = undefined;
                    if (controller instanceof Controller) {
                        statusCode = (controller as Controller).getStatus();
                    }
                    return promiseHandler(promise, statusCode, request, reply);
                }
            }
        });
    {{/each}}
    {{/each}}

    {{#if useSecurity}}
    function authenticateMiddleware(name: string, scopes: string[] = []) {
      return (request: hapi.Request, reply: hapi.IReply) => {
            hapiAuthentication(request, name, scopes).then((user: any) => {
                set(request, 'user', user);
                reply.continue();
            })
            .catch((error: any) => reply(error).code(error.status || 401));
      }
    }
    {{/if}}

    function promiseHandler(promise: any, statusCode: any, request: hapi.Request, reply: hapi.IReply) {
      return promise
        .then((data: any) => {
          if (data) {
            return reply(data).code(statusCode || 200);
          } else {
            return (reply as any)().code(statusCode || 204);
          }
        })
        .catch((error: any) => reply(error).code(error.status || 500));
    }

    function getValidatedArgs(args: any, request: hapi.Request): any[] {
        return Object.keys(args).map(key => {
            const name = args[key].name;
            switch (args[key].in) {
            case 'request':
                return request;
            case 'query':
                return ValidateParam(args[key], request.query[name], models, key)
            case 'path':
                return ValidateParam(args[key], request.params[name], models, key)
            case 'header':
                return ValidateParam(args[key], request.headers[name], models, key);
            case 'body':
                return ValidateParam(args[key], request.payload, models, key);
            }
        });
    }
}`;
