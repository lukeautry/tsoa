export const koaTemplate = `
import * as KoaRouter from 'koa-router';

export function RegisterRoutes(router: KoaRouter) {
    {{#each controllers}}
    {{#each actions}}
        router.{{method}}('{{../../basePath}}/{{../path}}{{path}}', async (context, next) => {
            const params = {
                {{#each parameters}}
                '{{name}}': { typeName: '{{typeName}}', required: {{required}} {{#if arrayType}}, arrayType: '{{arrayType}}' {{/if}} {{#if injected}}, injected: '{{injected}}' {{/if}} },
                {{/each}}
            };

            let validatedParams: any[] = [];
            try {
              validatedParams = getValidatedParams(params, context, '{{bodyParamName}}');
            } catch (error) {
              context.status = error.status || 500;
              context.body = error;
              next();
              return;
            }

            const controller = new {{../name}}();
            promiseHandler(controller.{{name}}.apply(controller, validatedParams), context, next);
        });
    {{/each}}
    {{/each}}

  function promiseHandler(promise: any, context: KoaRouter.IRouterContext, next: () => Promise<any>) {
      return promise
        .then((data: any) => {
          if (data) {
            context.body = data;
          } else {
            context.status = 204;
          }

          next();
        })
        .catch((error: any) => {
          context.status = error.status || 500;
          context.body = error;
          next();  
        });
    }

    function getRequestParams(context: KoaRouter.IRouterContext, bodyParamName?: string) {
        const merged: any = {};
        if (bodyParamName) {
            merged[bodyParamName] = context.request.body;            
        }

        for (let attrname in context.params) { merged[attrname] = context.params[attrname]; }
        for (let attrname in context.request.query) { merged[attrname] = context.request.query[attrname]; }
        return merged;
    }

    function getValidatedParams(params: any, context: KoaRouter.IRouterContext, bodyParamName?: string): any[] {
        const requestParams = getRequestParams(context, bodyParamName);
        
        return Object.keys(params).map(key => {
            if (params[key].injected === 'inject') {
              return undefined;
            } else if (params[key].injected === 'request') {
              return context;
            } else {
              return ValidateParam(params[key], requestParams[key], models, key);
            }
        });
    }
}`;
