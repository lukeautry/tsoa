import { Tsoa } from '../metadataGeneration/tsoa';
import { RoutesConfig } from './../config';
import * as fs from 'fs';
import * as handlebars from 'handlebars';
import * as path from 'path';
import * as tsfmt from 'typescript-formatter';
import * as handlebarsHelpers from 'handlebars-helpers';

export class RouteGenerator {
  constructor(private readonly metadata: Tsoa.Metadata, private readonly options: RoutesConfig) { }

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
        vscode: true,
      } as any)
        .then(result => {
          fs.writeFile(fileName, result.dest, (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        },
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
      handlebars: handlebars,
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
            const parameterObjs: { [name: string]: ParameterSchema } = {};
            method.parameters.forEach(parameter => {
              parameterObjs[parameter.parameterName] = this.getParameterSchema(parameter);
            });

            return {
              method: method.method.toLowerCase(),
              name: method.name,
              parameters: parameterObjs,
              path: pathTransformer(method.path),
              security: method.security,
            };
          }),
          modulePath: this.getRelativeImportPath(controller.location),
          name: controller.name,
          path: controller.path,
        };
      }),
      environment: process.env,
      iocModule,
      models: this.getModels(),
      useSecurity: this.metadata.Controllers.some(
        controller => controller.methods.some(methods => methods.security !== undefined),
      ),
    });
  }

  private getModels(): ModelSchema[] {
    return Object.keys(this.metadata.ReferenceTypes).map(key => {
      const referenceType = this.metadata.ReferenceTypes[key];

      const properties: { [name: string]: PropertySchema } = {};
      referenceType.properties.map(property => {
        properties[property.name] = this.getPropertySchema(property);
      });

      const templateModel: ModelSchema = {
        name: key,
        properties,
      };
      if (referenceType.additionalProperties) {
        templateModel.additionalProperties = this.getTemplateAdditionalProperty(referenceType.additionalProperties);
      }
      return templateModel;
    });
  }

  private getRelativeImportPath(fileLocation: string) {
    fileLocation = fileLocation.replace('.ts', '');
    return `./${path.relative(this.options.routesDir, fileLocation).replace(/\\/g, '/')}`;
  }

  private getPropertySchema(source: Tsoa.Property): PropertySchema {
    const propertySchema: PropertySchema = {
      required: source.required,
      typeName: source.type.typeName,
    };

    if (Object.keys(source.validators).length > 0) {
      propertySchema.validators = source.validators;
    }

    const arrayType = source.type as Tsoa.ArrayType;
    if (arrayType.elementType) {
      const arraySchema: ArraySchema = {
        typeName: arrayType.elementType.typeName,
      };
      const arrayEnumType = arrayType.elementType as Tsoa.EnumerateType;
      if (arrayEnumType.members) {
        arraySchema.enumMembers = arrayEnumType.members;
      }
      propertySchema.array = arraySchema;
    }

    const enumType = source.type as Tsoa.EnumerateType;
    if (enumType.members) {
      propertySchema.enumMembers = enumType.members;
    }

    return propertySchema;
  }

  private getTemplateAdditionalProperty(type: Tsoa.Type): AdditionalPropertiesSchema {
    const templateAdditionalProperty: AdditionalPropertiesSchema = {
      typeName: type.typeName,
    };

    const arrayType = type as Tsoa.ArrayType;
    if (arrayType.elementType) {
      const arraySchema = {
        typeName: arrayType.elementType.typeName,
      } as ArraySchema;

      const arrayEnumType = arrayType.elementType as Tsoa.EnumerateType;
      if (arrayEnumType.members) {
        arraySchema.enumMembers = arrayEnumType.members;
      }
      templateAdditionalProperty.array = arraySchema;
    }

    const enumType = type as Tsoa.EnumerateType;
    if (enumType.members) {
      templateAdditionalProperty.enumMembers = enumType.members;
    }

    return templateAdditionalProperty;
  }

  private getParameterSchema(source: Tsoa.Parameter): ParameterSchema {
    const parameterSchema: ParameterSchema = {
      in: source.in,
      name: source.name,
      required: source.required ? true : undefined,
      typeName: source.type.typeName,
    };

    if (Object.keys(source.validators).length > 0) {
      parameterSchema.validators = source.validators;
    }

    const arrayType = source.type as Tsoa.ArrayType;
    if (arrayType.elementType) {
      const tempArrayType: ArraySchema = {
        typeName: arrayType.elementType.typeName,
      };
      const arrayEnumType = arrayType.elementType as Tsoa.EnumerateType;
      if (arrayEnumType.members) {
        tempArrayType.enumMembers = arrayEnumType.members;
      }
      parameterSchema.array = tempArrayType;
    }

    const enumType = source.type as Tsoa.EnumerateType;
    if (enumType.members) {
      parameterSchema.enumMembers = enumType.members;
    }

    return parameterSchema;
  }
}

interface ModelSchema {
  name: string;
  properties: { [name: string]: PropertySchema };
  additionalProperties?: AdditionalPropertiesSchema;
}

type ValidatorSchema = Tsoa.Validators;

interface PropertySchema {
  typeName: string;
  required: boolean;
  request?: boolean;
  array?: ArraySchema;
  enumMembers?: string[];
  validators?: ValidatorSchema;
}

interface ArraySchema {
  typeName: string;
  enumMembers?: string[];
}

interface AdditionalPropertiesSchema {
  typeName: string;
  array?: ArraySchema;
  enumMembers?: string[];
}

interface ParameterSchema {
  name: string;
  in: string;
  typeName: string;
  required?: boolean;
  array?: ArraySchema;
  request?: boolean;
  enumMembers?: string[];
  validators?: ValidatorSchema;
}
