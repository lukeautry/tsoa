export const koaTemplate = `
/* tslint:disable:forin */
import * as KoaRouter from 'koa-router';
{{#if useSecurity}}
import { set } from 'lodash';
{{/if}}
{{#if authenticationModule}}
import { koaAuthentication } from '{{authenticationModule}}';
{{/if}}

export function RegisterRoutes(router: KoaRouter) {
    {{#each controllers}}
    {{#each actions}}
        router.{{method}}('{{../../basePath}}/{{../path}}{{path}}', 
            {{#if security}} 
            authenticateMiddleware('{{security.name}}'
              {{#if security.scopes.length}} 
              , [
                {{#each security.scopes}} 
                    '{{this}}'{{#if @last}} {{else}}, {{/if}}
                {{/each}}
              ]
              {{/if}}
            ), 
            {{/if}} 
            async (context, next) => {
            const args = {
                {{#each parameters}}
                '{{argumentName}}': { name: '{{name}}', typeName: '{{typeName}}', required: {{required}}, in: '{{in}}', {{#if arrayType}}, arrayType: '{{arrayType}}' {{/if}} },
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
            let statusCode = undefined;
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
          koaAuthentication(context.request, name, scopes).then((user: any) => {
              set(context.request, 'user', user);
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

  function promiseHandler(promise: any, statusCode: any, context: KoaRouter.IRouterContext, next: () => Promise<any>) {
      return promise
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

    function getValidatedArgs(args: any, context: KoaRouter.IRouterContext): any[] {
        return Object.keys(args).map(key => {
            const name = args[key].name;
            switch (args[key].in) {
            case 'request':
                return context;
            case 'query':
                return ValidateParam(args[key], context.request.query[name], models, name)
            case 'path':
                return ValidateParam(args[key], context.params[name], models, name)
            case 'header':
                return ValidateParam(args[key], context.request.headers[name], models, name);
            case 'body':
                return ValidateParam(args[key], context.request.body, models, name);
            case 'body-prop':
                return ValidateParam(args[key], context.request.body[name], models, name);
            }
        });
    }
}`;
