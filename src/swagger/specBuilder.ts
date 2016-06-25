import {Swagger} from './swagger';

export class SpecBuilder {
    private definitions: { [definitionsName: string]: Swagger.Schema } = {};
    private paths: { [pathName: string]: Swagger.Path } = {};

    public addDefinition(name: string, schema: Swagger.Schema) {
        this.definitions[name] = schema;
    }

    public addPath(name: string, path: Swagger.Path) {
        const existingPathObject = this.paths[name];
        if (existingPathObject) {
            path = Object.assign(path, existingPathObject);
        }

        this.paths[name] = path;
    }

    public generate() {
        return {
            basePath: '/',
            consumes: [
                'application/json'
            ],
            definitions: this.definitions,
            host: 'localhost:3000',
            info: {
                title: 'Lucid Web API',
                version: '0.0.1'
            },
            paths: this.paths,
            produces: [
                'application/json'
            ],
            swagger: '2.0'
        };
    }
}

