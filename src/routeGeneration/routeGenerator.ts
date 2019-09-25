import * as fs from 'fs';
import * as handlebars from 'handlebars';
import * as path from 'path';
import * as tsfmt from 'typescript-formatter';
import { Tsoa } from '../metadataGeneration/tsoa';
import { assertNever } from '../utils/assertNever';
import { warnAdditionalPropertiesDeprecation } from '../utils/deprecations';
import { fsReadFile, fsWriteFile } from '../utils/fs';
import { isRefType } from '../utils/internalTypeGuards';
import { RoutesConfig, SwaggerConfig } from './../config';
import { normalisePath } from './../utils/pathUtils';
import { TsoaRoute } from './tsoa-route';

export interface SwaggerConfigRelatedToRoutes {
  noImplicitAdditionalProperties?: SwaggerConfig['noImplicitAdditionalProperties'];
  controllerPathGlobs?: SwaggerConfig['controllerPathGlobs'];
  specVersion?: SwaggerConfig['specVersion'];
}

export class RouteGenerator {
  private tsfmtConfig = {
    editorconfig: true,
    replace: true,
    tsconfig: {
      newLine: 'LF',
    },
    tsfmt: true,
    tslint: false,
    verify: true,
    vscode: true,
  };

  constructor(private readonly metadata: Tsoa.Metadata, private readonly options: RoutesConfig, private readonly minimalSwaggerConfig: SwaggerConfigRelatedToRoutes) {}

  public async GenerateRoutes(middlewareTemplate: string, pathTransformer: (path: string) => string) {
    if (!fs.lstatSync(this.options.routesDir).isDirectory()) {
      throw new Error(`routesDir should be a directory`);
    } else if (this.options.routesFileName !== undefined && !this.options.routesFileName.endsWith('.ts')) {
      throw new Error(`routesFileName should have a '.ts' extension`);
    }

    const fileName = `${this.options.routesDir}/${this.options.routesFileName || 'routes.ts'}`;
    const content = this.buildContent(middlewareTemplate, pathTransformer);

    const formatted = await tsfmt.processString(fileName, content, this.tsfmtConfig as any);
    await fsWriteFile(fileName, formatted.dest);
  }

  public async GenerateCustomRoutes(template: string, pathTransformer: (path: string) => string) {
    const data = await fsReadFile(path.join(template));
    const file = data.toString();
    return await this.GenerateRoutes(file, pathTransformer);
  }

  private buildContent(middlewareTemplate: string, pathTransformer: (path: string) => string) {
    handlebars.registerHelper('json', (context: any) => {
      return JSON.stringify(context);
    });
    const additionalPropsHelper = (additionalProperties: TsoaRoute.RefObjectModelSchema['additionalProperties']) => {
      if (additionalProperties) {
        // Then the model for this type explicitly allows additional properties and thus we should assign that
        return JSON.stringify(additionalProperties);
      } else if (this.minimalSwaggerConfig.noImplicitAdditionalProperties === 'silently-remove-extras') {
        return JSON.stringify(false);
      } else if (this.minimalSwaggerConfig.noImplicitAdditionalProperties === 'throw-on-extras') {
        return JSON.stringify(false);
      } else if (this.minimalSwaggerConfig.noImplicitAdditionalProperties === undefined) {
        // Since Swagger defaults to allowing additional properties, then that will be our default
        return JSON.stringify(true);
      } else if (this.minimalSwaggerConfig.noImplicitAdditionalProperties === true) {
        warnAdditionalPropertiesDeprecation(this.minimalSwaggerConfig.noImplicitAdditionalProperties);
        return JSON.stringify(false);
      } else if (this.minimalSwaggerConfig.noImplicitAdditionalProperties === false) {
        warnAdditionalPropertiesDeprecation(this.minimalSwaggerConfig.noImplicitAdditionalProperties);
        return JSON.stringify(true);
      } else {
        return assertNever(this.minimalSwaggerConfig.noImplicitAdditionalProperties);
      }
    };
    handlebars.registerHelper('additionalPropsHelper', additionalPropsHelper);

    const routesTemplate = handlebars.compile(middlewareTemplate, { noEscape: true });
    const authenticationModule = this.options.authenticationModule ? this.getRelativeImportPath(this.options.authenticationModule) : undefined;
    const iocModule = this.options.iocModule ? this.getRelativeImportPath(this.options.iocModule) : undefined;

    // If we're working locally then tsoa won't exist as an importable module.
    // So, when in testing mode we reference the module by path instead.
    const env = process.env.NODE_ENV;
    let canImportByAlias = true;
    if (env === 'tsoa_test') {
      canImportByAlias = false;
    }

    const normalisedBasePath = normalisePath(this.options.basePath as string, '/');

    return routesTemplate({
      authenticationModule,
      basePath: normalisedBasePath,
      canImportByAlias,
      controllers: this.metadata.controllers.map(controller => {
        const normalisedControllerPath = normalisePath(controller.path, '/');

        return {
          actions: controller.methods.map(method => {
            const parameterObjs: { [name: string]: TsoaRoute.ParameterSchema } = {};
            method.parameters.forEach(parameter => {
              parameterObjs[parameter.parameterName] = this.buildParameterSchema(parameter);
            });
            const normalisedMethodPath = pathTransformer(normalisePath(method.path, '/'));

            const normalisedFullPath = normalisePath(`${normalisedBasePath}${normalisedControllerPath}${normalisedMethodPath}`, '/', '', false);

            return {
              fullPath: normalisedFullPath,
              method: method.method.toLowerCase(),
              name: method.name,
              parameters: parameterObjs,
              path: normalisedMethodPath,
              security: method.security,
            };
          }),
          modulePath: this.getRelativeImportPath(controller.location),
          name: controller.name,
          path: normalisedControllerPath,
        };
      }),
      environment: process.env,
      iocModule,
      minimalSwaggerConfig: this.minimalSwaggerConfig,
      models: this.buildModels(),
      useSecurity: this.metadata.controllers.some(controller => controller.methods.some(method => !!method.security.length)),
    });
  }

  public buildModels(): TsoaRoute.Models {
    const models = {} as TsoaRoute.Models;

    Object.keys(this.metadata.referenceTypeMap).forEach(name => {
      const referenceType = this.metadata.referenceTypeMap[name];

      let model: TsoaRoute.ModelSchema;
      if (referenceType.dataType === 'refEnum') {
        const refEnumModel: TsoaRoute.RefEnumModelSchema = {
          dataType: 'refEnum',
          enums: referenceType.enums,
        };
        model = refEnumModel;
      } else if (referenceType.dataType === 'refObject') {
        const propertySchemaDictionary: TsoaRoute.RefObjectModelSchema['properties'] = {};
        referenceType.properties.forEach(property => {
          propertySchemaDictionary[property.name] = this.buildPropertySchema(property);
        });

        const refObjModel: TsoaRoute.RefObjectModelSchema = {
          dataType: 'refObject',
          properties: propertySchemaDictionary,
        };
        if (referenceType.additionalProperties) {
          refObjModel.additionalProperties = this.buildProperty(referenceType.additionalProperties);
        } else if (this.minimalSwaggerConfig.noImplicitAdditionalProperties) {
          refObjModel.additionalProperties = false;
        } else {
          // Since Swagger allows "excess properties" (to use a TypeScript term) by default
          refObjModel.additionalProperties = true;
        }
        model = refObjModel;
      } else if (referenceType.dataType === 'refAlias') {
        const refType: TsoaRoute.RefTypeAliasModelSchema = {
          dataType: 'refAlias',
          type: this.buildProperty(referenceType.type),
        };
        model = refType;
      } else {
        model = assertNever(referenceType);
      }

      models[name] = model;
    });
    return models;
  }

  private getRelativeImportPath(fileLocation: string) {
    fileLocation = fileLocation.replace('.ts', ''); // no ts extension in import
    return `./${path.relative(this.options.routesDir, fileLocation).replace(/\\/g, '/')}`;
  }

  private buildPropertySchema(source: Tsoa.Property): TsoaRoute.PropertySchema {
    const propertySchema = this.buildProperty(source.type);
    propertySchema.default = source.default;
    propertySchema.required = source.required ? true : undefined;

    if (Object.keys(source.validators).length > 0) {
      propertySchema.validators = source.validators;
    }
    return propertySchema;
  }

  private buildParameterSchema(source: Tsoa.Parameter): TsoaRoute.ParameterSchema {
    const property = this.buildProperty(source.type);
    const parameter = {
      default: source.default,
      in: source.in,
      name: source.name,
      required: source.required ? true : undefined,
    } as TsoaRoute.ParameterSchema;
    const parameterSchema = Object.assign(parameter, property);

    if (Object.keys(source.validators).length > 0) {
      parameterSchema.validators = source.validators;
    }

    return parameterSchema;
  }

  private buildProperty(type: Tsoa.Type): TsoaRoute.PropertySchema {
    const schema: TsoaRoute.PropertySchema = {
      dataType: type.dataType,
    };

    if (isRefType(type)) {
      schema.dataType = undefined;
      schema.ref = type.refName;
    }

    if (type.dataType === 'array') {
      const arrayType = type;

      if (isRefType(arrayType.elementType)) {
        switch (arrayType.elementType.dataType) {
          case 'refObject': {
            schema.array = {
              ref: arrayType.elementType.refName,
            };
            break;
          }
          case 'refEnum': {
            schema.array = {
              dataType: arrayType.elementType.dataType,
              enums: arrayType.elementType.enums,
            };
            break;
          }
          case 'refAlias': {
            schema.array = {
              dataType: arrayType.elementType.dataType,
              type: arrayType.elementType.type,
            };
            break;
          }
          default:
            assertNever(arrayType.elementType);
        }
      } else {
        schema.array = this.buildProperty(arrayType.elementType);
      }
    }

    if (type.dataType === 'enum') {
      schema.enums = type.enums;
    }

    if (type.dataType === 'union' || type.dataType === 'intersection') {
      schema.subSchemas = type.types.map(type => this.buildProperty(type));
    }

    if (type.dataType === 'nestedObjectLiteral') {
      const objLiteral = type;

      schema.nestedProperties = objLiteral.properties.reduce((acc, prop) => {
        return { ...acc, [prop.name]: this.buildPropertySchema(prop) };
      }, {});

      schema.additionalProperties = objLiteral.additionalProperties && this.buildProperty(objLiteral.additionalProperties);
    }

    return schema;
  }
}
