// TODO: Replace this with HAPI middleware stuff
export const hapiTemplate = `
/* tslint:disable:forin */
import * as hapi from 'hapi';

export function RegisterRoutes(server: hapi.Server) {
    {{#each controllers}}
    {{#each actions}}
        server.route({
            method: '{{method}}',
            path: '{{../../basePath}}/{{../path}}{{path}}',
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

                {{#if ../../kernelModule}}
                const controller = kernel.get<{{../name}}>({{../name}});
                {{else}}
                const controller = new {{../name}}();
                {{/if}}
                return promiseHandler(controller.{{name}}.apply(controller, validatedParams), request, reply);
            }
        });
    {{/each}}
    {{/each}}

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
