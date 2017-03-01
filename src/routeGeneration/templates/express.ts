export const expressTemplate = `
{{#if useSecurity}}
import { set } from 'lodash';
{{/if}}
{{#if authenticationModule}}
import { expressAuthentication } from '{{authenticationModule}}';
{{/if}}

/* tslint:disable:forin */
export function RegisterRoutes(app: any) {
    {{#each controllers}}
    {{#each actions}}
        app.{{method}}('{{../../basePath}}/{{../path}}{{path}}', 
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
            function (request: any, response: any, next: any) {
            const args = {
                {{#each parameters}}
                '{{argumentName}}': { name: '{{name}}', typeName: '{{typeName}}', required: {{required}}, in: '{{in}}', {{#if arrayType}}, arrayType: '{{arrayType}}' {{/if}} },
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
            let statusCode = undefined;
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
            expressAuthentication(request, name, scopes).then((user: any) => {
                set(request, 'user', user);
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
        return promise
            .then((data: any) => {
                if (data) {
                    response.json(data);
                    response.status(statusCode || 200);
                } else {
                    response.status(statusCode || 204);
                    response.end();
                }
            })
            .catch((error: any) => next(error));
    }

    function getValidatedArgs(args: any, request: any): any[] {
        return Object.keys(args).map(key => {
            const name = args[key].name;
            switch (args[key].in) {
            case 'request':
                return request;
            case 'query':
                return ValidateParam(args[key], request.query[name], models, name)
            case 'path':
                return ValidateParam(args[key], request.params[name], models, name)
            case 'header':
                return ValidateParam(args[key], request.header(name), models, name);
            case 'body':
                return ValidateParam(args[key], request.body, models, name);
            case 'body-props':
                return ValidateParam(args[key], request.body[name], models, name);
            }
        });
    }
}`;
