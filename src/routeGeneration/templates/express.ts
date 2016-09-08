export const expressTemplate = `
export function RegisterRoutes(app: any) {
    {{#each controllers}}
    {{#each actions}}
        app.{{method}}('{{../../basePath}}/{{../path}}{{path}}', function (req: any, res: any, next: any) {
            const params = {
                {{#each parameters}}
                '{{name}}': { typeName: '{{typeName}}', required: {{required}} {{#if arrayType}}, arrayType: '{{arrayType}}' {{/if}} },
                {{/each}}
            };

            let validatedParams: any[] = [];
            try {
                validatedParams = getValidatedParams(params, req, '{{bodyParamName}}');
            } catch (err) {
                return next(err);
            }

            const controller = new {{../name}}();
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
            return ValidateParam(params[key], requestParams[key], models, key);
        });
    }
}`;
