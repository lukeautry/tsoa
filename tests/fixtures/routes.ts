
import { PutTestController } from './controllers/putController';
import { PostTestController } from './controllers/postController';
import { PatchTestController } from './controllers/patchController';
import { GetTestController } from './controllers/getController';
import { DeleteTestController } from './controllers/deleteController';

const models: any = {
    'TestSubModel': {
        'email': { typeName: 'string', required: true },
        'id': { typeName: 'number', required: true },
    },
    'TestModel': {
        'numberValue': { typeName: 'number', required: true },
        'numberArray': { typeName: 'array', required: true, arrayType: 'number' },
        'stringValue': { typeName: 'string', required: true },
        'stringArray': { typeName: 'array', required: true, arrayType: 'string' },
        'boolValue': { typeName: 'boolean', required: true },
        'boolArray': { typeName: 'array', required: true, arrayType: 'boolean' },
        'modelValue': { typeName: 'TestSubModel', required: true },
        'modelsArray': { typeName: 'array', required: true, arrayType: 'TestSubModel' },
        'optionalString': { typeName: 'string', required: false },
        'id': { typeName: 'number', required: true },
    },
};

export function RegisterRoutes(app: any) {
    app.put('/PutTest', function(req: any, res: any) {
        const params = {
            'model': { typeName: 'TestModel', required: true },
        };

        let validatedParams: any[] = [];
        try {
            validatedParams = getValidatedParams(params, req, 'model');
        } catch (err) {
            res.status(err.status || 500);
            res.json(err);
            return;
        }

        const controller = new PutTestController();
        promiseHandler(controller.putModel.apply(controller, validatedParams), res);
    });
    app.put('/PutTest/Location', function(req: any, res: any) {
        const params = {
        };

        let validatedParams: any[] = [];
        try {
            validatedParams = getValidatedParams(params, req, '');
        } catch (err) {
            res.status(err.status || 500);
            res.json(err);
            return;
        }

        const controller = new PutTestController();
        promiseHandler(controller.putModelAtLocation.apply(controller, validatedParams), res);
    });
    app.put('/PutTest/Multi', function(req: any, res: any) {
        const params = {
        };

        let validatedParams: any[] = [];
        try {
            validatedParams = getValidatedParams(params, req, '');
        } catch (err) {
            res.status(err.status || 500);
            res.json(err);
            return;
        }

        const controller = new PutTestController();
        promiseHandler(controller.putWithMultiReturn.apply(controller, validatedParams), res);
    });
    app.put('/PutTest/WithId/:id', function(req: any, res: any) {
        const params = {
            'id': { typeName: 'number', required: true },
        };

        let validatedParams: any[] = [];
        try {
            validatedParams = getValidatedParams(params, req, '');
        } catch (err) {
            res.status(err.status || 500);
            res.json(err);
            return;
        }

        const controller = new PutTestController();
        promiseHandler(controller.putWithId.apply(controller, validatedParams), res);
    });
    app.post('/PostTest', function(req: any, res: any) {
        const params = {
            'model': { typeName: 'TestModel', required: true },
        };

        let validatedParams: any[] = [];
        try {
            validatedParams = getValidatedParams(params, req, 'model');
        } catch (err) {
            res.status(err.status || 500);
            res.json(err);
            return;
        }

        const controller = new PostTestController();
        promiseHandler(controller.postModel.apply(controller, validatedParams), res);
    });
    app.post('/PostTest/Location', function(req: any, res: any) {
        const params = {
        };

        let validatedParams: any[] = [];
        try {
            validatedParams = getValidatedParams(params, req, '');
        } catch (err) {
            res.status(err.status || 500);
            res.json(err);
            return;
        }

        const controller = new PostTestController();
        promiseHandler(controller.postModelAtLocation.apply(controller, validatedParams), res);
    });
    app.post('/PostTest/Multi', function(req: any, res: any) {
        const params = {
        };

        let validatedParams: any[] = [];
        try {
            validatedParams = getValidatedParams(params, req, '');
        } catch (err) {
            res.status(err.status || 500);
            res.json(err);
            return;
        }

        const controller = new PostTestController();
        promiseHandler(controller.postWithMultiReturn.apply(controller, validatedParams), res);
    });
    app.post('/PostTest/WithId/:id', function(req: any, res: any) {
        const params = {
            'id': { typeName: 'number', required: true },
        };

        let validatedParams: any[] = [];
        try {
            validatedParams = getValidatedParams(params, req, '');
        } catch (err) {
            res.status(err.status || 500);
            res.json(err);
            return;
        }

        const controller = new PostTestController();
        promiseHandler(controller.postWithId.apply(controller, validatedParams), res);
    });
    app.post('/PostTest/WithBodyAndQueryParams', function(req: any, res: any) {
        const params = {
            'model': { typeName: 'TestModel', required: true },
            'query': { typeName: 'string', required: true },
        };

        let validatedParams: any[] = [];
        try {
            validatedParams = getValidatedParams(params, req, 'model');
        } catch (err) {
            res.status(err.status || 500);
            res.json(err);
            return;
        }

        const controller = new PostTestController();
        promiseHandler(controller.postWithBodyAndQueryParams.apply(controller, validatedParams), res);
    });
    app.patch('/PatchTest', function(req: any, res: any) {
        const params = {
            'model': { typeName: 'TestModel', required: true },
        };

        let validatedParams: any[] = [];
        try {
            validatedParams = getValidatedParams(params, req, 'model');
        } catch (err) {
            res.status(err.status || 500);
            res.json(err);
            return;
        }

        const controller = new PatchTestController();
        promiseHandler(controller.patchModel.apply(controller, validatedParams), res);
    });
    app.patch('/PatchTest/Location', function(req: any, res: any) {
        const params = {
        };

        let validatedParams: any[] = [];
        try {
            validatedParams = getValidatedParams(params, req, '');
        } catch (err) {
            res.status(err.status || 500);
            res.json(err);
            return;
        }

        const controller = new PatchTestController();
        promiseHandler(controller.patchModelAtLocation.apply(controller, validatedParams), res);
    });
    app.patch('/PatchTest/Multi', function(req: any, res: any) {
        const params = {
        };

        let validatedParams: any[] = [];
        try {
            validatedParams = getValidatedParams(params, req, '');
        } catch (err) {
            res.status(err.status || 500);
            res.json(err);
            return;
        }

        const controller = new PatchTestController();
        promiseHandler(controller.patchWithMultiReturn.apply(controller, validatedParams), res);
    });
    app.patch('/PatchTest/WithId/:id', function(req: any, res: any) {
        const params = {
            'id': { typeName: 'number', required: true },
        };

        let validatedParams: any[] = [];
        try {
            validatedParams = getValidatedParams(params, req, '');
        } catch (err) {
            res.status(err.status || 500);
            res.json(err);
            return;
        }

        const controller = new PatchTestController();
        promiseHandler(controller.patchWithId.apply(controller, validatedParams), res);
    });
    app.get('/GetTest', function(req: any, res: any) {
        const params = {
        };

        let validatedParams: any[] = [];
        try {
            validatedParams = getValidatedParams(params, req, '');
        } catch (err) {
            res.status(err.status || 500);
            res.json(err);
            return;
        }

        const controller = new GetTestController();
        promiseHandler(controller.getModel.apply(controller, validatedParams), res);
    });
    app.get('/GetTest/Current', function(req: any, res: any) {
        const params = {
        };

        let validatedParams: any[] = [];
        try {
            validatedParams = getValidatedParams(params, req, '');
        } catch (err) {
            res.status(err.status || 500);
            res.json(err);
            return;
        }

        const controller = new GetTestController();
        promiseHandler(controller.getCurrentModel.apply(controller, validatedParams), res);
    });
    app.get('/GetTest/Multi', function(req: any, res: any) {
        const params = {
        };

        let validatedParams: any[] = [];
        try {
            validatedParams = getValidatedParams(params, req, '');
        } catch (err) {
            res.status(err.status || 500);
            res.json(err);
            return;
        }

        const controller = new GetTestController();
        promiseHandler(controller.getMultipleModels.apply(controller, validatedParams), res);
    });
    app.get('/GetTest/:numberPathParam/:booleanPathParam/:stringPathParam', function(req: any, res: any) {
        const params = {
            'numberPathParam': { typeName: 'number', required: true },
            'stringPathParam': { typeName: 'string', required: true },
            'booleanPathParam': { typeName: 'boolean', required: true },
            'booleanParam': { typeName: 'boolean', required: true },
            'stringParam': { typeName: 'string', required: true },
            'numberParam': { typeName: 'number', required: true },
            'optionalStringParam': { typeName: 'string', required: false },
        };

        let validatedParams: any[] = [];
        try {
            validatedParams = getValidatedParams(params, req, '');
        } catch (err) {
            res.status(err.status || 500);
            res.json(err);
            return;
        }

        const controller = new GetTestController();
        promiseHandler(controller.getModelByParams.apply(controller, validatedParams), res);
    });
    app.delete('/DeleteTest', function(req: any, res: any) {
        const params = {
        };

        let validatedParams: any[] = [];
        try {
            validatedParams = getValidatedParams(params, req, '');
        } catch (err) {
            res.status(err.status || 500);
            res.json(err);
            return;
        }

        const controller = new DeleteTestController();
        promiseHandler(controller.deleteWithReturnValue.apply(controller, validatedParams), res);
    });
    app.delete('/DeleteTest/Current', function(req: any, res: any) {
        const params = {
        };

        let validatedParams: any[] = [];
        try {
            validatedParams = getValidatedParams(params, req, '');
        } catch (err) {
            res.status(err.status || 500);
            res.json(err);
            return;
        }

        const controller = new DeleteTestController();
        promiseHandler(controller.deleteCurrent.apply(controller, validatedParams), res);
    });
    app.delete('/DeleteTest/:numberPathParam/:booleanPathParam/:stringPathParam', function(req: any, res: any) {
        const params = {
            'numberPathParam': { typeName: 'number', required: true },
            'stringPathParam': { typeName: 'string', required: true },
            'booleanPathParam': { typeName: 'boolean', required: true },
            'booleanParam': { typeName: 'boolean', required: true },
            'stringParam': { typeName: 'string', required: true },
            'numberParam': { typeName: 'number', required: true },
        };

        let validatedParams: any[] = [];
        try {
            validatedParams = getValidatedParams(params, req, '');
        } catch (err) {
            res.status(err.status || 500);
            res.json(err);
            return;
        }

        const controller = new DeleteTestController();
        promiseHandler(controller.getModelByParams.apply(controller, validatedParams), res);
    });

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
            return validateParam(params[key], requestParams[key], key);
        });
    }
}
function validateParam(typeData: any, value: any, name?: string) {
    if (value === undefined) {
        if (typeData.required) {
            throw new InvalidRequestException(name + ' is a required parameter.');
        } else {
            return undefined;
        }
    }

    switch (typeData.typeName) {
        case 'string':
            return validateString(value);
        case 'boolean':
            return validateBool(value, name);
        case 'number':
            return validateNumber(value, name);
        case 'array':
            return validateArray(value, typeData.arrayType, name);
        default:
            return validateModel(value, typeData.typeName);
    }
}

function validateNumber(numberValue: string, name: string): number {
    const parsedNumber = parseInt(numberValue, 10);
    if (isNaN(parsedNumber)) {
        throw new InvalidRequestException(name + 'should be a valid number.');
    }

    return parsedNumber;
}

function validateString(stringValue: string) {
    return stringValue.toString();
}

function validateBool(boolValue: any, name: string): boolean {
    if (boolValue === true || boolValue === false) { return boolValue; }
    if (boolValue.toLowerCase() === 'true') { return true; }
    if (boolValue.toLowerCase() === 'false') { return false; }

    throw new InvalidRequestException(name + 'should be valid boolean value.');
}

function validateModel(modelValue: any, typeName: string): any {
    const modelDefinition = models[typeName];

    Object.keys(modelDefinition).forEach((key: string) => {
        const property = modelDefinition[key];
        modelValue[key] = validateParam(property, modelValue[key], key);
    });

    return modelValue;
}

function validateArray(array: any[], arrayType: string, arrayName: string): any[] {
    return array.map(element => validateParam({
        required: true,
        typeName: arrayType,
    }, element));
}

interface Exception extends Error {
    status: number;
}

class InvalidRequestException implements Exception {
    public status = 400;
    public name = 'Invalid Request';

    constructor(public message: string) { }
}
