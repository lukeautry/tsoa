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
import { koaAuthentication } from '{{authenticationModule}}';
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

export function RegisterRoutes(router: any) {
    {{#each controllers}}
    {{#each actions}}
        router.{{method}}('{{../../basePath}}/{{../path}}{{path}}', 
            {{#if security}} 
            authenticateMiddleware('{{security.name}}'
              {{#if security.scopes.length}} 
              , {{{json security.scopes}}}
              {{/if}}
            ), 
            {{/if}} 
            async (context, next) => {
            const args = {
                {{#each parameters}}
                    {{@key}}: {{{json this}}},
                {{/each}}
            };

            let validatedArgs: any[] = [];
            try {
              validatedArgs = getValidatedArgs(args, context);
            } catch (error) {
              context.status = error.status || 500;
              context.body = error;
              return next();
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

            return promiseHandler(promise, statusCode, context, next);
        });
    {{/each}}
    {{/each}}
  
  {{#if useSecurity}}
  function authenticateMiddleware(name: string, scopes: string[] = []) {
      return async (context: any, next: any) => {
          return koaAuthentication(context.request, name, scopes).then((user: any) => {
              context.request['user'] = user;
              next();
          })
          .catch((error: any) => {
              context.status = error.status || 401;
              context.body = error;
              next();
        });
     }
  }
  {{/if}}

  function promiseHandler(promise: any, statusCode: any, context: any, next: () => Promise<any>) {
      return Promise.resolve(promise)
        .then((data: any) => {
          if (data) {
            context.body = data;
            context.status = (statusCode || 200)
          } else {
            context.status = (statusCode || 204)
          }

          next();
        })
        .catch((error: any) => {
          context.status = error.status || 500;
          context.body = error;
          next();
        });
    }

    function getValidatedArgs(args: any, context: any): any[] {
        const errorFields: FieldErrors = {};
        const values = Object.keys(args).map(key => {
            const name = args[key].name;
            switch (args[key].in) {
            case 'request':
                return context.request;
            case 'query':
                return ValidateParam(args[key], context.request.query[name], models, name, errorFields)
            case 'path':
                return ValidateParam(args[key], context.params[name], models, name, errorFields)
            case 'header':
                return ValidateParam(args[key], context.request.headers[name], models, name, errorFields);
            case 'body':
                return ValidateParam(args[key], context.request.body, models, name, errorFields, name + '.');
            case 'body-prop':
                return ValidateParam(args[key], context.request.body[name], models, name, errorFields, 'body.');
            }
        });
        if (Object.keys(errorFields).length > 0) {
            throw new ValidateError(errorFields, '');
        }
        return values;
    }
}
