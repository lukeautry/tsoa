import { expressTemplate } from './templates/express';
import { hapiTemplate } from './templates/hapi';
import { koaTemplate } from './templates/koa';
import { Metadata, ArrayType, EnumerateType, Parameter, Property } from '../metadataGeneration/metadataGenerator';
import { RoutesConfig } from './../config';
import * as fs from 'fs';
import * as handlebars from 'handlebars';
import * as path from 'path';
import * as tsfmt from 'typescript-formatter';

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
        verify: true,
        vscode: true
      } as any)
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

    handlebars.registerHelper('json', function (context: any) {
      return JSON.stringify(context);
    });
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
                "{{name}}": {
                    {{#each properties}}
                        "{{@key}}": {{{json this}}},
                    {{/each}}
                },
                {{/each}}
            };
        `.concat(middlewareTemplate), { noEscape: true });

    const authenticationModule = this.options.authenticationModule ? this.getRelativeImportPath(this.options.authenticationModule) : undefined;
    const iocModule = this.options.iocModule ? this.getRelativeImportPath(this.options.iocModule) : undefined;

    return routesTemplate({
      authenticationModule,
      basePath: this.options.basePath === '/' ? '' : this.options.basePath,
      controllers: this.metadata.Controllers.map(controller => {
        return {
          actions: controller.methods.map(method => {
            const parameters: { [name: string]: PropertySchema } = {};
            method.parameters.forEach(parameter => {
              parameters[parameter.parameterName] = this.getParameterSchema(parameter);
            });

            return {
              method: method.method.toLowerCase(),
              name: method.name,
              parameters,
              path: pathTransformer(method.path),
              security: method.security
            };
          }),
          modulePath: this.getRelativeImportPath(controller.location),
          name: controller.name,
          path: controller.path
        };
      }),
      iocModule,
      models: this.getModels(),
      useSecurity: this.metadata.Controllers.some(
        controller => controller.methods.some(methods => methods.security !== undefined)
      )
    });
  }

  private getModels(): TemplateModel[] {
    return Object.keys(this.metadata.ReferenceTypes).map(key => {
      const referenceType = this.metadata.ReferenceTypes[key];

      const properties: { [name: string]: PropertySchema } = {};
      referenceType.properties.map(property => {
        properties[property.name] = this.getPropertySchema(property);
      });

      return {
        name: key,
        properties
      };
    });
  }

  private getRelativeImportPath(fileLocation: string) {
    fileLocation = fileLocation.replace('.ts', '');
    return `./${path.relative(this.options.routesDir, fileLocation).replace(/\\/g, '/')}`;
  }

  private getPropertySchema(source: Property): PropertySchema {
    const templateProperty: PropertySchema = {
      required: source.required,
      typeName: source.type.typeName
    };

    const arrayType = source.type as ArrayType;
    if (arrayType.elementType) {
      const arraySchema: ArraySchema = {
        typeName: arrayType.elementType.typeName
      };
      const arrayEnumType = arrayType.elementType as EnumerateType;
      if (arrayEnumType.enumMembers) {
        arraySchema.enumMembers = arrayEnumType.enumMembers;
      }
      templateProperty.array = arraySchema;
    }

    const enumType = source.type as EnumerateType;
    if (enumType.enumMembers) {
      templateProperty.enumMembers = enumType.enumMembers;
    }

    return templateProperty;
  }

  private getParameterSchema(parameter: Parameter): ParameterSchema {
    const parameterSchema: ParameterSchema = {
      in: parameter.in,
      name: parameter.name,
      required: parameter.required,
      typeName: parameter.type.typeName
    };

    const arrayType = parameter.type as ArrayType;
    if (arrayType.elementType) {
      const tempArrayType: ArraySchema = {
        typeName: arrayType.elementType.typeName
      };
      const arrayEnumType = arrayType.elementType as EnumerateType;
      if (arrayEnumType.enumMembers) {
        tempArrayType.enumMembers = arrayEnumType.enumMembers;
      }
      parameterSchema.array = tempArrayType;
    }

    const enumType = parameter.type as EnumerateType;
    if (enumType.enumMembers) {
      parameterSchema.enumMembers = enumType.enumMembers;
    }

    return parameterSchema;
  }
}

interface TemplateModel {
  name: string;
  properties: { [name: string]: PropertySchema };
}

interface PropertySchema {
  typeName: string;
  required: boolean;
  array?: ArraySchema;
  request?: boolean;
  enumMembers?: string[];
}

export interface ArraySchema {
  typeName: string;
  enumMembers?: string[];
}

export interface ParameterSchema {
  name: string;
  in: string;
  typeName: string;
  required: boolean;
  array?: ArraySchema;
  request?: boolean;
  enumMembers?: string[];
}
