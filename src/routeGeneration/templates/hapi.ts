// TODO: Replace this with HAPI middleware stuff
/* tslint:disable */
{{#if canImportByAlias}}
  import { ValidateParam, FieldErrors, ValidateError } from 'tsoa';
  import { Controller } from 'tsoa';
{{else}}
  import { ValidateParam, FieldErrors, ValidateError } from '../../../src/routeGeneration/templateHelpers';
  import { Controller } from '../../../src/interfaces/controller';
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

const models: any = {
  {{#each models}}
  "{{name}}": {
      {{#if properties}}
      properties: {
          {{#each properties}}
              "{{@key}}": {{{json this}}},
          {{/each}}
      },
      {{/if}}
      {{#if additionalProperties}}
      additionalProperties: {{{json additionalProperties}}},
      {{/if}}
  },
  {{/each}}
};

export function RegisterRoutes(server: any) {
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
                              , {{{json security.scopes}}}
                              {{/if}}
                    )}
                ],
                {{/if}} 
                handler: (request: any, reply) => {
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
                    let statusCode: any;
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
      return (request: any, reply: any) => {
            return hapiAuthentication(request, name, scopes).then((user: any) => {
                request['user'] = user;
                reply.continue();
            })
            .catch((error: any) => reply(error).code(error.status || 401));
      }
    }
    {{/if}}

    function promiseHandler(promise: any, statusCode: any, request: any, reply: any) {
      return Promise.resolve(promise)
        .then((data: any) => {
          if (data) {
            return reply(data).code(statusCode || 200);
          } else {
            return (reply as any)().code(statusCode || 204);
          }
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
