import { Metadata, ArrayType, EnumerateType, Parameter, Property } from '../metadataGeneration/metadataGenerator';
import { RoutesConfig } from './../config';
import * as fs from 'fs';
import * as handlebars from 'handlebars';
import * as path from 'path';
import * as tsfmt from 'typescript-formatter';
import * as handlebarsHelpers from 'handlebars-helpers';

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

  public GenerateCustomRoutes(template: string, pathTransformer: (path: string) => string) {
    let file: string;
    fs.readFile(path.join(template), (err, data) => {
      if (err) {
        throw err;
      }
      file = data.toString();
      return this.GenerateRoutes(file, pathTransformer);
    });
  }

  private buildContent(middlewareTemplate: string, pathTransformer: (path: string) => string) {
    handlebars.registerHelper('json', function (context: any) {
      return JSON.stringify(context);
    });

    handlebarsHelpers.comparison({
      handlebars: handlebars
    });

    const routesTemplate = handlebars.compile(middlewareTemplate, { noEscape: true });
    const authenticationModule = this.options.authenticationModule ? this.getRelativeImportPath(this.options.authenticationModule) : undefined;
    const iocModule = this.options.iocModule ? this.getRelativeImportPath(this.options.iocModule) : undefined;

    // If we're working locally then tsoa won't exist as an importable module.
    // So, when in testing mode we reference the module by path instead.
    const env = process.env.NODE_ENV;
    let canImportByAlias = true;
    if (env === 'test') {
      canImportByAlias = false;
    }

    return routesTemplate({
      authenticationModule,
      basePath: this.options.basePath === '/' ? '' : this.options.basePath,
      canImportByAlias: canImportByAlias,
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
      environment: process.env,
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

      const templateModel: TemplateModel = {
        name: key,
        properties
      };
      if (referenceType.additionalProperties && referenceType.additionalProperties.length) {
        templateModel.additionalProperties = referenceType.additionalProperties.map(property => this.getTemplateAdditionalProperty(property));
      }
      return templateModel;
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

  private getTemplateAdditionalProperty(source: Property): TemplateAdditionalProperty {
    const templateAdditionalProperty: TemplateAdditionalProperty = {
      typeName: source.type.typeName
    };

    return templateAdditionalProperty;
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
  additionalProperties?: TemplateAdditionalProperty[];
}

interface PropertySchema {
  typeName: string;
  required: boolean;
  array?: ArraySchema;
  request?: boolean;
  enumMembers?: string[];
}

interface TemplateAdditionalProperty {
  typeName: string;
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
