import { expressTemplate } from './templates/express';
import { hapiTemplate } from './templates/hapi';
import { koaTemplate } from './templates/koa';
import { Metadata, Type, ArrayType, ReferenceType, Parameter, Property } from '../metadataGeneration/metadataGenerator';
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
            import { Controller } from '${canImportByAlias ? 'tsoa' : '../../../src/interfaces/controller'}';
            {{#if iocModule}}
            import { iocContainer } from '{{iocModule}}';
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
      authenticationModule: this.options.authenticationModule,
      basePath: this.options.basePath === '/' ? '' : this.options.basePath,
      controllers: this.metadata.Controllers.map(controller => {
        return {
          actions: controller.methods.map(method => {
            return {
              method: method.method.toLowerCase(),
              name: method.name,
              parameters: method.parameters.map(parameter => this.getTemplateParameter(parameter)),
              path: pathTransformer(method.path),
              security: method.security
            };
          }),
          jwtUserProperty: controller.jwtUserProperty,
          modulePath: this.getRelativeImportPath(controller.location),
          name: controller.name,
          path: controller.path
        };
      }),
      iocModule: this.options.iocModule,
      models: this.getModels(),
      useSecurity: this.metadata.Controllers.some(
        controller => controller.methods.some(methods => methods.security !== undefined)
      )
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

  private getTemplateProperty(source: Property): TemplateProperty {
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

  private getTemplateParameter(parameter: Parameter): TemplateParameter {
    const templateParameter: TemplateParameter = {
      argumentName: parameter.argumentName,
      in: parameter.in,
      name: parameter.name,
      required: parameter.required,
      typeName: this.getStringRepresentationOfType(parameter.type)
    };

    const arrayType = parameter.type as ArrayType;
    if (arrayType.elementType) {
      templateParameter.arrayType = this.getStringRepresentationOfType(arrayType.elementType);
    }

    return templateParameter;
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
  request?: boolean;
}

interface TemplateParameter {
  name: String;
  argumentName: string;
  in: string;
  typeName: string;
  required: boolean;
  arrayType?: string;
  request?: boolean;
}
