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
import { koaAuthentication } from '{{authenticationModule}}';
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

export function RegisterRoutes(router: any) {
    {{#each controllers}}
    {{#each actions}}
        router.{{method}}('{{fullPath}}',
            {{#if security.length}}
            authenticateMiddleware({{json security}}),
            {{/if}}
            async (context: any, next: any) => {
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
              return next();
            }

            {{#if ../../iocModule}}
            const controller = iocContainer.get<{{../name}}>({{../name}});
            {{else}}
            const controller = new {{../name}}();
            {{/if}}

            const promise = controller.{{name}}.apply(controller, validatedArgs);
            return promiseHandler(controller, promise, context, next);
        });
    {{/each}}
    {{/each}}

  {{#if useSecurity}}
  function authenticateMiddleware(security: TsoaRoute.Security[] = []) {
      return (context: any, next: any) => {
          let responded = 0;
          let success = false;

          const succeed = function(user: any) {
              if (!success) {
                  success = true;
                  responded++;
                  context.request['user'] = user;
                  next();
              }
          }

          const fail = function(error: any) {
              responded++;
              if (responded == security.length && !success) {
                  context.status = error.status || 401;
                  context.throw(context.status, error.message, error);
                  next();
              }
          }

          for (const secMethod of security) {
              if (Object.keys(secMethod).length > 1) {
                  let promises: Promise<any>[] = [];

                  for (const name in secMethod) {
                      promises.push(koaAuthentication(context.request, name, secMethod[name]));
                  }

                  Promise.all(promises)
                      .then((users) => { succeed(users[0]); })
                      .catch(fail);
              } else {
                  for (const name in secMethod) {
                      koaAuthentication(context.request, name, secMethod[name])
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
            next();
        })
        .catch((error: any) => {
            context.status = error.status;
            context.throw(error.status, error.message, error);
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
