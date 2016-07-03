export const expressTemplate = `
    export function RegisterRoutes(app: any) {
    {{#each controllers}}
    {{#each actions}}
        app.{{method}}('/{{../path}}{{path}}', function (req: any, res: any) {
            const params = {
                {{#each parameters}}
                '{{name}}': { typeName: '{{typeName}}', required: {{required}} {{#if arrayType}}, arrayType: '{{arrayType}}' {{/if}} },
                {{/each}}
            };

            let validatedParams: any[] = [];
            try {
                validatedParams = getValidatedParams(params, req);
            } catch (err) {
                res.status(err.status || 500);
                res.json(err);
                return;
            }

            const controller = new {{../name}}();
            promiseHandler(controller.{{name}}.apply(controller, validatedParams), res);
        });
    {{/each}}
    {{/each}}

    function promiseHandler(promise: any, response: any) {
        return promise
            .then((data: any) => {
                if (data) {
                    response.json(data);
                } else {
                    response.status(204);
                    response.end();
                }
            })
            .catch((error: any) => {
                response.status(error.status || 500);
                response.json(error);
            });
    }

    function getRequestParams(request: any) {
        const merged: any = {};
        for (let attrname in request.body) { merged[attrname] = request.body[attrname]; }
        for (let attrname in request.params) { merged[attrname] = request.params[attrname]; }
        for (let attrname in request.query) { merged[attrname] = request.query[attrname]; }
        return merged;
    }

    function getValidatedParams(params: any, request: any): any[] {
        const requestParams = getRequestParams(request);

        return Object.keys(params).map(key => {
            return validateParam(params[key], requestParams[key], key);
        });
    }
}`;
