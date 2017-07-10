import { Metadata, ArrayType, EnumerateType, Parameter, Property, Validators, Type } from '../metadataGeneration/types';
import { RoutesConfig } from './../config';
import * as fs from 'fs';
import * as handlebars from 'handlebars';
import * as path from 'path';
// import * as tsfmt from 'typescript-formatter';
import * as handlebarsHelpers from 'handlebars-helpers';

export class RouteGenerator {
  constructor(private readonly metadata: Metadata, private readonly options: RoutesConfig) { }

  public GenerateRoutes(middlewareTemplate: string, pathTransformer: (path: string) => string) {
    const fileName = `${this.options.routesDir}/routes.ts`;
    const content = this.buildContent(middlewareTemplate, pathTransformer);

    return new Promise<any>((resolve, reject) => {
      fs.writeFile(fileName, content, (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
      // tsfmt.processString(fileName, content, {
      //   editorconfig: true,
      //   replace: true,
      //   tsconfig: true,
      //   tsfmt: true,
      //   tslint: true,
      //   verify: true,
      //   vscode: true
      // } as any)
      //   .then(result => {
      //     fs.writeFile(fileName, result.dest, (err) => {
      //       if (err) {
      //         reject(err);
      //       } else {
      //         resolve();
      //       }
      //     });
      //   }
      //   ).catch(err => console.log(err));
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
            const parameterObjs: { [name: string]: ParameterSchema } = {};
            method.parameters.forEach(parameter => {
              parameterObjs[parameter.parameterName] = this.getParameterSchema(parameter);
            });

            return {
              method: method.method.toLowerCase(),
              name: method.name,
              parameters: parameterObjs,
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

  private getModels(): ModelSchema[] {
    return Object.keys(this.metadata.ReferenceTypes).map(key => {
      const referenceType = this.metadata.ReferenceTypes[key];

      const properties: { [name: string]: PropertySchema } = {};
      referenceType.properties.map(property => {
        properties[property.name] = this.getPropertySchema(property);
      });

      const templateModel: ModelSchema = {
        name: key,
        properties
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

  private getPropertySchema(source: Property): PropertySchema {
    const propertySchema: PropertySchema = {
      required: source.required,
      typeName: source.type.typeName
    };

    if (Object.keys(source.validators).length > 0) {
      propertySchema.validators = source.validators;
    }

    const arrayType = source.type as ArrayType;
    if (arrayType.elementType) {
      const arraySchema: ArraySchema = {
        typeName: arrayType.elementType.typeName
      };
      const arrayEnumType = arrayType.elementType as EnumerateType;
      if (arrayEnumType.enumMembers) {
        arraySchema.enumMembers = arrayEnumType.enumMembers;
      }
      propertySchema.array = arraySchema;
    }

    const enumType = source.type as EnumerateType;
    if (enumType.enumMembers) {
      propertySchema.enumMembers = enumType.enumMembers;
    }

    return propertySchema;
  }

  private getTemplateAdditionalProperty(type: Type): AdditionalPropertiesSchema {
    const templateAdditionalProperty: AdditionalPropertiesSchema = {
      typeName: type.typeName
    };

    const arrayType = type as ArrayType;
    if (arrayType.elementType) {
      const arraySchema: ArraySchema = {
        typeName: arrayType.elementType.typeName
      };
      const arrayEnumType = arrayType.elementType as EnumerateType;
      if (arrayEnumType.enumMembers) {
        arraySchema.enumMembers = arrayEnumType.enumMembers;
      }
      templateAdditionalProperty.array = arraySchema;
    }

    const enumType = type as EnumerateType;
    if (enumType.enumMembers) {
      templateAdditionalProperty.enumMembers = enumType.enumMembers;
    }

    return templateAdditionalProperty;
  }

  private getParameterSchema(source: Parameter): ParameterSchema {
    const parameterSchema: ParameterSchema = {
      in: source.in,
      name: source.name,
      required: source.required ? true : undefined,
      typeName: source.type.typeName
    };

    if (Object.keys(source.validators).length > 0) {
      parameterSchema.validators = source.validators;
    }

    const arrayType = source.type as ArrayType;
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

    const enumType = source.type as EnumerateType;
    if (enumType.enumMembers) {
      parameterSchema.enumMembers = enumType.enumMembers;
    }

    return parameterSchema;
  }
}

interface ModelSchema {
  name: string;
  properties: { [name: string]: PropertySchema };
  additionalProperties?: AdditionalPropertiesSchema;
}

interface PropertySchema {
  typeName: string;
  required: boolean;
  request?: boolean;
  array?: ArraySchema;
  enumMembers?: string[];
  validators?: Validators;
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
  validators?: Validators;
}
