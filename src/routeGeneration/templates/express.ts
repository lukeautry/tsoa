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
import { expressAuthentication } from '{{authenticationModule}}';
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

export function RegisterRoutes(app: any) {
    {{#each controllers}}
    {{#each actions}}
        app.{{method}}('{{../../basePath}}/{{../path}}{{path}}', 
            {{#if security}} 
            authenticateMiddleware('{{security.name}}'
                {{#if security.scopes.length}} 
                ,{{{json security.scopes}}}
                {{/if}}), 
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
            {{else}}
            const controller = new {{../name}}();
            {{/if}}


            const promise = controller.{{name}}.apply(controller, validatedArgs);
            let statusCode: any;
            if (controller instanceof Controller) {
                statusCode = (controller as Controller).getStatus();
            }
            promiseHandler(promise, statusCode, response, next);
        });
    {{/each}}
    {{/each}}

    {{#if useSecurity}}
    function authenticateMiddleware(name: string, scopes: string[] = []) {
        return (request: any, response: any, next: any) => {
            return expressAuthentication(request, name, scopes).then((user: any) => {
                request['user'] = user;
                next();
            })
            .catch((error: any) => {
                response.status(401);
                next(error)
            });
        }
    }
    {{/if}}

    function promiseHandler(promise: any, statusCode: any, response: any, next: any) {
        return Promise.resolve(promise)
            .then((data: any) => {
                if (data) {
                    response.status(statusCode || 200).json(data);;
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
                    return ValidateParam(args[key], request.query[name], models, name, fieldErrors);
                case 'path':
                    return ValidateParam(args[key], request.params[name], models, name, fieldErrors);
                case 'header':
                    return ValidateParam(args[key], request.header(name), models, name, fieldErrors);
                case 'body':
                    return ValidateParam(args[key], request.body, models, name, fieldErrors, name + '.');
                case 'body-prop':
                    return ValidateParam(args[key], request.body[name], models, name, fieldErrors, 'body.');
            }
        });
        if (Object.keys(fieldErrors).length > 0) {
            throw new ValidateError(fieldErrors, '');
        }
        return values;
    }
}
