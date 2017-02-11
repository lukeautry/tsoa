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
                    const params = {
                        {{#each parameters}}
                        '{{name}}': { typeName: '{{typeName}}', required: {{required}} {{#if arrayType}}, arrayType: '{{arrayType}}' {{/if}} {{#if injected}}, injected: '{{injected}}' {{/if}} },
                        {{/each}}
                    };

                    let validatedParams: any[] = [];
                    try {
                        validatedParams = getValidatedParams(params, request, '{{bodyParamName}}');
                    } catch (err) {
                        return reply(err).code(err.status || 500);
                    }

                    {{#if ../../iocModule}}
                    const controller = iocContainer.get<{{../name}}>({{../name}});
                    {{else}}
                    const controller = new {{../name}}();
                    {{/if}}
                    return promiseHandler(controller.{{name}}.apply(controller, validatedParams), request, reply);
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

    function promiseHandler(promise: any, request: hapi.Request, reply: hapi.IReply) {
      return promise
        .then((data: any) => {
          if (data) {
            return reply(data);
          }

          return (reply as any)().code(204);
        })
        .catch((error: any) => reply(error).code(error.status || 500));
    }

    function getRequestParams(request: hapi.Request, bodyParamName?: string) {
      const merged: any = {};
      if (bodyParamName) {
        merged[bodyParamName] = request.payload;
      }

      for (let attrname in request.params) { merged[attrname] = request.params[attrname]; }
      for (let attrname in request.query) { merged[attrname] = request.query[attrname]; }
      return merged;
    }

    function getValidatedParams(params: any, request: hapi.Request, bodyParamName?: string): any[] {
      const requestParams = getRequestParams(request, bodyParamName);

      return Object.keys(params).map(key => {
        switch (params[key].injected) {
          case 'inject':
            return undefined;
          case 'request':
            return request;
          default:
            return ValidateParam(params[key], requestParams[key], models, key);
        }
      });
    }
}`;
