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
import { koaAuthentication } from '{{authenticationModule}}';
{{/if}}
import * as KoaRouter from 'koa-router';

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

export function RegisterRoutes(router: KoaRouter) {
    {{#each controllers}}
    {{#each actions}}
        router.{{method}}('{{fullPath}}',
            {{#if security.length}}
            authenticateMiddleware({{json security}}),
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
              context.status = error.status;
              context.throw(error.status, JSON.stringify({ fields: error.fields }));
            }

            {{#if ../../iocModule}}
            const controller = iocContainer.get<{{../name}}>({{../name}});
            {{else}}
            const controller = new {{../name}}();
            {{/if}}

            const promise = controller.{{name}}.apply(controller, validatedArgs as any);
            return promiseHandler(controller, promise, context, next);
        });
    {{/each}}
    {{/each}}

  {{#if useSecurity}}
  function authenticateMiddleware(security: TsoaRoute.Security[] = []) {
      return async (context: any, next: any) => {
          let responded = 0;
          let success = false;

          const succeed = async (user: any) => {
              if (!success) {
                  success = true;
                  responded++;
                  context.request['user'] = user;
                  await next();
              }
          };

          const fail = async (error: any) => {
              responded++;
              if (responded == security.length && !success) {
                  // this is an authentication error
                  context.status = error.status || 401;
                  context.throw(context.status, error.message, error);
              } else if (success) {
                  // the authentication was a success but arriving here means the controller
                  // probably threw an error that we caught as well
                  // so just pass it on
                  throw error;
              }
          };

          for (const secMethod of security) {
              if (Object.keys(secMethod).length > 1) {
                  let promises: Promise<any>[] = [];

                  for (const name in secMethod) {
                      promises.push(koaAuthentication(context.request, name, secMethod[name]));
                  }

                  return Promise.all(promises)
                      .then((users) => succeed(users[0]))
                      .catch(fail);
              } else {
                  for (const name in secMethod) {
                      return koaAuthentication(context.request, name, secMethod[name])
                          .then(succeed)
                          .catch(fail);
                  }
              }
          }
      }
  }
  {{/if}}

  function isController(object: any): object is Controller {
      return 'getHeaders' in object && 'getStatus' in object && 'setStatus' in object;
  }

  function promiseHandler(controllerObj: any, promise: Promise<any>, context: any, next: () => Promise<any>) {
      return Promise.resolve(promise)
        .then((data: any) => {
            if (data || data === false) {
                context.body = data;
                context.status = 200;
            } else {
                context.status = 204;
            }

            if (isController(controllerObj)) {
                const headers = controllerObj.getHeaders();
                Object.keys(headers).forEach((name: string) => {
                    context.set(name, headers[name]);
                });

                const statusCode = controllerObj.getStatus();
                if (statusCode) {
                    context.status = statusCode;
                }
            }
            return next();
        })
        .catch((error: any) => {
            context.status = error.status || 500;
            context.throw(context.status, error.message, error);
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
                return validationService.ValidateParam(args[key], context.request.query[name], name, errorFields);
            case 'path':
                return validationService.ValidateParam(args[key], context.params[name], name, errorFields);
            case 'header':
                return validationService.ValidateParam(args[key], context.request.headers[name], name, errorFields);
            case 'body':
                return validationService.ValidateParam(args[key], context.request.body, name, errorFields, name + '.');
            case 'body-prop':
                return validationService.ValidateParam(args[key], context.request.body[name], name, errorFields, 'body.');
            }
        });
        if (Object.keys(errorFields).length > 0) {
            throw new ValidateError(errorFields, '');
        }
        return values;
    }
}
