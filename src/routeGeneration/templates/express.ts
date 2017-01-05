export const expressTemplate = `
/* tslint:disable:forin */
export function RegisterRoutes(app: any) {
    {{#each controllers}}
    {{#each actions}}
        app.{{method}}('{{../../basePath}}/{{../path}}{{path}}', function (req: any, res: any, next: any) {
            const params = {
                {{#each parameters}}
                '{{name}}': { typeName: '{{typeName}}', required: {{required}} {{#if arrayType}}, arrayType: '{{arrayType}}' {{/if}} {{#if injected}}, injected: '{{injected}}' {{/if}} },
                {{/each}}
            };

            let validatedParams: any[] = [];
            try {
                validatedParams = getValidatedParams(params, req, '{{bodyParamName}}');
            } catch (err) {
                return next(err);
            }

            const controller = new {{../name}}();
            {{#if ../jwtUserProperty}}
            if (req.{{../jwtUserProperty}}) {
                if (req.{{../jwtUserProperty}}.iss) controller.iss = req.{{../jwtUserProperty}}.iss;
                if (req.{{../jwtUserProperty}}.sub) controller.sub = req.{{../jwtUserProperty}}.sub;
                if (req.{{../jwtUserProperty}}.aud) controller.aud = req.{{../jwtUserProperty}}.aud;
            }
            {{/if}}
            promiseHandler(controller.{{name}}.apply(controller, validatedParams), res, next);
        });
    {{/each}}
    {{/each}}

    function promiseHandler(promise: any, response: any, next: any) {
        return promise
            .then((data: any) => {
                if (data) {
                    response.json(data);
                } else {
                    response.status(204);
                    response.end();
                }
            })
            .catch((error: any) => next(error));
    }

    function getRequestParams(request: any, bodyParamName?: string) {
        const merged: any = {};
        if (bodyParamName) {
            merged[bodyParamName] = request.body;
        }

        for (let attrname in request.params) { merged[attrname] = request.params[attrname]; }
        for (let attrname in request.query) { merged[attrname] = request.query[attrname]; }
        return merged;
    }

    function getValidatedParams(params: any, request: any, bodyParamName?: string): any[] {
        const requestParams = getRequestParams(request, bodyParamName);

        return Object.keys(params).map(key => {
            if (params[key].injected === 'inject') {
              return undefined;
            } else if (params[key].injected === 'request') {
              return request;
            } else {
              return ValidateParam(params[key], requestParams[key], models, key);
            }
        });
    }
}`;
