import { expressTemplate } from './templates/express';
import { hapiTemplate } from './templates/hapi';
import { koaTemplate } from './templates/koa';
import { InjectType, Metadata, Type, ArrayType, ReferenceType, Parameter, Property } from '../metadataGeneration/metadataGenerator';
import { RoutesConfig } from './../config';
import * as fs from 'fs';
import * as handlebars from 'handlebars';
import * as path from 'path';
import * as tsfmt from 'typescript-formatter';

const appRoot: string = require('app-root-path').path;

export class RouteGenerator {
  constructor(private readonly metadata: Metadata, private readonly options: RoutesConfig) { }

  public GenerateRoutes(middlewareTemplate: string, pathTransformer: (path: string) => string) {
    const fileName = `${this.options.routesDir}/routes.ts`;
    const content = this.buildContent(middlewareTemplate, pathTransformer);

    return new Promise<void>((resolve, reject) => {
      tsfmt.processString(fileName, content, {
        editorconfig: true,
        replace: true,
        tsconfig: true,
        tsfmt: true,
        tslint: true,
        verify: true
      })
        .then(result => {
          fs.writeFile(fileName, result.dest, (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        }
        );
    });
  }

  public GenerateExpressRoutes() {
    return this.GenerateRoutes(expressTemplate, path => path.replace(/{/g, ':').replace(/}/g, ''));
  }

  public GenerateHapiRoutes() {
    return this.GenerateRoutes(hapiTemplate, path => path);
  }

  public GenerateKoaRoutes() {
    return this.GenerateRoutes(koaTemplate, path => path.replace(/{/g, ':').replace(/}/g, ''));
  }

  private buildContent(middlewareTemplate: string, pathTransformer: (path: string) => string) {
    let canImportByAlias: boolean;
    try {
      require('tsoa');
      canImportByAlias = true;
    } catch (err) {
      canImportByAlias = false;
    }

    const routesTemplate = handlebars.compile(`/* tslint:disable */
            import {ValidateParam} from '${canImportByAlias ? 'tsoa' : '../../../src/routeGeneration/templateHelpers'}';
            {{#if kernelModule}}
            import { kernel } from '{{kernelModule}}';
            {{/if}}
            {{#each controllers}}
            import { {{name}} } from '{{modulePath}}';
            {{/each}}

            const models: any = {
                {{#each models}}
                '{{name}}': {
                    {{#each properties}}
                        '{{name}}': { typeName: '{{typeName}}', required: {{required}} {{#if arrayType}}, arrayType: '{{arrayType}}' {{/if}} },
                    {{/each}}
                },
                {{/each}}
            };
        `.concat(middlewareTemplate));

    return routesTemplate({
      basePath: this.options.basePath === '/' ? '' : this.options.basePath,
      controllers: this.metadata.Controllers.map(controller => {
        return {
          actions: controller.methods.map(method => {
            const bodyParameter = method.parameters.find(parameter => parameter.in === 'body');
            return {
              bodyParamName: bodyParameter ? bodyParameter.name : undefined,
              method: method.method.toLowerCase(),
              name: method.name,
              parameters: method.parameters.map(parameter => this.getTemplateProperty(parameter)),
              path: pathTransformer(method.path)
            };
          }),
          jwtUserProperty: controller.jwtUserProperty,
          modulePath: this.getRelativeImportPath(controller.location),
          name: controller.name,
          path: controller.path
        };
      }),
      models: this.getModels(),
      kernelModule: this.options.kernelModule
    });
  }

  private getModels(): TemplateModel[] {
    return Object.keys(this.metadata.ReferenceTypes).map(key => {
      const referenceType = this.metadata.ReferenceTypes[key];

      return {
        name: key,
        properties: referenceType.properties.map(property => this.getTemplateProperty(property))
      };
    });
  }

  private getStringRepresentationOfType(type: Type): string {
    if (typeof type === 'string' || type instanceof String) {
      return type as string;
    }

    const arrayType = type as ArrayType;
    if (arrayType.elementType) {
      return 'array';
    }

    return (type as ReferenceType).name;
  }

  private getRelativeImportPath(controllerLocation: string) {
    controllerLocation = controllerLocation.replace('.ts', '');
    return `./${path.relative(path.join(appRoot, this.options.routesDir), controllerLocation).replace(/\\/g, '/')}`;
  }

  private getTemplateProperty(source: Parameter | Property) {
    const templateProperty: TemplateProperty = {
      name: source.name,
      required: source.required,
      typeName: this.getStringRepresentationOfType(source.type)
    };
    const parameter = source as Parameter;
    if (parameter.injected) {
      templateProperty.injected = parameter.injected;
    }

    const arrayType = source.type as ArrayType;
    if (arrayType.elementType) {
      templateProperty.arrayType = this.getStringRepresentationOfType(arrayType.elementType);
    }

    return templateProperty;
  }
}

interface TemplateModel {
  name: string;
  properties: TemplateProperty[];
}

interface TemplateProperty {
  name: String;
  typeName: string;
  required: boolean;
  arrayType?: string;
  injected?: InjectType;
}
