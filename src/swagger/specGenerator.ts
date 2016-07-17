import { Metadata, Type, ArrayType, ReferenceType, PrimitiveType, Property, Method, Parameter } from '../metadataGeneration/metadataGenerator';
import { Swagger } from './swagger';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';

export interface Options {
    host: string;
    name: string;
    version: string;
    description: string;
    basePath: string;
    license: string;
}

export class SpecGenerator {
    constructor(private readonly metadata: Metadata, private readonly options: Options) { }

    public GenerateJson(swaggerDir: string) {
        mkdirp(swaggerDir, dirErr => {
            if (dirErr) {
                throw dirErr;
            }

            fs.writeFile(`${swaggerDir}/swagger.json`, JSON.stringify(this.GetSpec(), null, '\t'), err => {
                if (err) {
                    throw new Error(err.toString());
                };
            });
        });
    }

    public GetSpec(): Swagger.Spec {
        return {
            basePath: this.options.basePath,
            consumes: ['application/json'],
            definitions: this.buildDefinitions(),
            host: this.options.host,
            info: {
                description: this.options.description,
                license: {
                    name: this.options.license
                },
                title: this.options.name,
                version: this.options.version
            },
            paths: this.buildPaths(),
            produces: ['application/json'],
            swagger: '2.0'
        };
    }

    private buildDefinitions() {
        const definitions: { [definitionsName: string]: Swagger.Schema } = {};

        Object.keys(this.metadata.ReferenceTypes).map(typeName => {
            const referenceType = this.metadata.ReferenceTypes[typeName];

            definitions[referenceType.name] = {
                description: referenceType.description,
                properties: this.buildProperties(referenceType.properties),
                required: referenceType.properties.filter(p => p.required).map(p => p.name),
                type: 'object'
            };
        });

        return definitions;
    }

    private buildPaths() {
        const paths: { [pathName: string]: Swagger.Path } = {};

        this.metadata.Controllers.forEach(controller => {
            controller.methods.forEach(method => {
                const path = `/${controller.path}${method.path}`;
                paths[path] = paths[path] || {};
                this.buildPathMethod(method, paths[path]);
            });
        });

        return paths;
    }

    private buildPathMethod(method: Method, pathObject: any) {
        const swaggerType = this.getSwaggerType(method.type);
        const pathMethod: any = pathObject[method.method] = swaggerType
            ? this.get200Operation(swaggerType, method.example)
            : this.get204Operation();

        pathMethod.description = method.description;
        pathMethod.parameters = method.parameters.map(p => this.buildParameter(p));
        if (pathMethod.parameters.filter((p: Swagger.BaseParameter) => p.in === 'body').length > 1) {
            throw new Error('Only one body parameter allowed per controller method.');
        }
    }

    private buildParameter(parameter: Parameter) {
        const swaggerParameter: any = {
            description: parameter.description,
            in: parameter.in,
            name: parameter.name,
            required: parameter.required
        };

        const parameterType = this.getSwaggerType(parameter.type);
        if (parameterType.$ref) {
            swaggerParameter.schema = parameterType;
        } else {
            swaggerParameter.type = parameterType.type;
        }

        return swaggerParameter;
    }

    private buildProperties(properties: Property[]) {
        const swaggerProperties: { [propertyName: string]: Swagger.Schema } = {};

        properties.forEach(property => {
            const swaggerType = this.getSwaggerType(property.type);
            swaggerType.description = property.description;
            swaggerProperties[property.name] = swaggerType;
        });

        return swaggerProperties;
    }

    private getSwaggerType(type: Type) {
        if (typeof type === 'string' || type instanceof String) {
            return this.getSwaggerTypeForPrimitiveType(type as PrimitiveType);
        }

        const arrayType = type as ArrayType;
        if (arrayType.elementType) {
            return this.getSwaggerTypeForArrayType(arrayType);
        }

        return this.getSwaggerTypeForReferenceType(type as ReferenceType);
    }

    private getSwaggerTypeForPrimitiveType(primitiveTypeName: PrimitiveType) {
        const typeMap: { [name: string]: Swagger.Schema } = {};
        typeMap['number'] = { format: 'int64', type: 'integer' };
        typeMap['string'] = { type: 'string' };
        typeMap['boolean'] = { type: 'boolean' };
        typeMap['datetime'] = { format: 'date-time', type: 'string' };
        typeMap['void'] = null;

        return typeMap[primitiveTypeName];
    }

    private getSwaggerTypeForArrayType(arrayType: ArrayType): Swagger.Schema {
        const elementType = arrayType.elementType;

        return { items: this.getSwaggerType(elementType), type: 'array' };
    }

    private getSwaggerTypeForReferenceType(referenceType: ReferenceType): Swagger.Schema {
        return { $ref: `#/definitions/${referenceType.name}` };
    }

    private get200Operation(swaggerType: Swagger.Schema, example: any) {
        return {
            produces: ['application/json'],
            responses: {
                '200': { description: '', examples: { 'application/json': example }, schema: swaggerType }
            }
        };
    }

    private get204Operation() {
        return { responses: { '204': { description: 'No content' } } };
    }
}
