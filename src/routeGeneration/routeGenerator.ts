import { expressTemplate } from './templates/express';
import { Metadata, Type, ArrayType, ReferenceType, Parameter, Property } from '../metadataGeneration/metadataGenerator';
import * as fs from 'fs';
import * as handlebars from 'handlebars';
import * as path from 'path';
import * as tsfmt from 'typescript-formatter';
const appRoot: string = require('app-root-path').path;

export interface Options {
  basePath: string;
  routeDir: string;
}

export class RouteGenerator {
  constructor(private readonly metadata: Metadata, private readonly options: Options) { }

  public GenerateRoutes(middlewareTemplate: string) {
    const fileName = `${this.options.routeDir}/routes.ts`;
    const content = this.buildContent(middlewareTemplate);

    return new Promise<void>((resolve, reject) => {
      tsfmt.processString(fileName, content, {} as any)
        .then(result => fs.writeFile(fileName, result.dest, (err) => resolve()));
    });
  }

  public GenerateExpressRoutes() {
    return this.GenerateRoutes(expressTemplate);
  }

  private buildContent(middlewareTemplate: string) {
    let canImportByAlias: boolean;
    try {
      require('sl-tsoa');
      canImportByAlias = true;
    } catch (err) {
      canImportByAlias = false;
    }

    const routesTemplate = handlebars.compile(`
            /* tslint:disable */
            /**
             * THIS IS GENERATED CODE - DO NOT EDIT
             */
            import {ValidateParam} from '${canImportByAlias ? 'sl-tsoa' : '../../src/routeGeneration/templateHelpers'}';
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
              path: this.getExpressPath(method.path)
            };
          }),
          modulePath: this.getRelativeImportPath(controller.location),
          name: controller.name,
          path: controller.path
        };
      }),
      models: this.getModels()
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
    return `./${path.relative(path.join(appRoot, this.options.routeDir), controllerLocation).replace(/\\/g, '/')}`;
  }

  private getTemplateProperty(source: Parameter | Property) {
    const templateProperty: TemplateProperty = {
      name: source.name,
      required: source.required,
      typeName: this.getStringRepresentationOfType(source.type)
    };

    const arrayType = source.type as ArrayType;
    if (arrayType.elementType) {
      templateProperty.arrayType = this.getStringRepresentationOfType(arrayType.elementType);
    }

    return templateProperty;
  }

  private getExpressPath(path: string) {
    return path.replace(/{/g, ':').replace(/}/g, '');
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
}
