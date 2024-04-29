import * as path from 'path';
import { ExtendedRoutesConfig } from '../cli';
import { Tsoa, TsoaRoute, assertNever } from '@tsoa/runtime';
import { isRefType } from '../utils/internalTypeGuards';
import { convertBracesPathParams, normalisePath } from '../utils/pathUtils';
import { fsExists, fsReadFile } from '../utils/fs';

export abstract class AbstractRouteGenerator<Config extends ExtendedRoutesConfig> {
  constructor(
    protected readonly metadata: Tsoa.Metadata,
    protected readonly options: Config,
  ) {}

  /**
   * This is the entrypoint for a generator to create a custom set of routes
   */
  public abstract GenerateCustomRoutes(): Promise<void>;

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
        } else if (this.options.noImplicitAdditionalProperties !== 'ignore') {
          refObjModel.additionalProperties = false;
        } else {
          // Since Swagger allows "excess properties" (to use a TypeScript term) by default
          refObjModel.additionalProperties = true;
        }
        model = refObjModel;
      } else if (referenceType.dataType === 'refAlias') {
        const refType: TsoaRoute.RefTypeAliasModelSchema = {
          dataType: 'refAlias',
          type: {
            ...this.buildProperty(referenceType.type),
            validators: referenceType.validators,
            default: referenceType.default,
          },
        };
        model = refType;
      } else {
        model = assertNever(referenceType);
      }

      models[name] = model;
    });
    return models;
  }

  protected pathTransformer(path: string): string {
    return convertBracesPathParams(path);
  }

  protected buildContext() {
    const authenticationModule = this.options.authenticationModule ? this.getRelativeImportPath(this.options.authenticationModule) : undefined;
    const iocModule = this.options.iocModule ? this.getRelativeImportPath(this.options.iocModule) : undefined;

    // Left in for backwards compatibility, previously if we're working locally then tsoa runtime code wasn't an importable module but now it is.
    const canImportByAlias = true;

    const normalisedBasePath = normalisePath(this.options.basePath as string, '/');

    return {
      authenticationModule,
      basePath: normalisedBasePath,
      canImportByAlias,
      controllers: this.metadata.controllers.map(controller => {
        const normalisedControllerPath = this.pathTransformer(normalisePath(controller.path, '/'));

        return {
          actions: controller.methods.map(method => {
            const parameterObjs: { [name: string]: TsoaRoute.ParameterSchema } = {};
            method.parameters.forEach(parameter => {
              parameterObjs[parameter.parameterName] = this.buildParameterSchema(parameter);
            });
            const normalisedMethodPath = this.pathTransformer(normalisePath(method.path, '/'));

            const normalisedFullPath = normalisePath(`${normalisedBasePath}${normalisedControllerPath}${normalisedMethodPath}`, '/', '', false);

            const uploadFilesWithDifferentFieldParameter = method.parameters.filter(
              parameter => parameter.type.dataType === 'file' || (parameter.type.dataType === 'array' && parameter.type.elementType.dataType === 'file'),
            );
            return {
              fullPath: normalisedFullPath,
              method: method.method.toLowerCase(),
              name: method.name,
              parameters: parameterObjs,
              path: normalisedMethodPath,
              uploadFile: uploadFilesWithDifferentFieldParameter.length > 0,
              uploadFileName: uploadFilesWithDifferentFieldParameter.map(parameter => ({
                name: parameter.name,
                maxCount: parameter.type.dataType === 'file' ? 1 : undefined,
                multiple: parameter.type.dataType === 'array' && parameter.type.elementType.dataType === 'file',
              })),
              security: method.security,
              successStatus: method.successStatus ? method.successStatus : 'undefined',
            };
          }),
          modulePath: this.getRelativeImportPath(controller.location),
          name: controller.name,
          path: normalisedControllerPath,
        };
      }),
      environment: process.env,
      iocModule,
      minimalSwaggerConfig: { noImplicitAdditionalProperties: this.options.noImplicitAdditionalProperties, bodyCoercion: this.options.bodyCoercion },
      models: this.buildModels(),
      useFileUploads: this.metadata.controllers.some(controller =>
        controller.methods.some(
          method =>
            !!method.parameters.find(parameter => {
              if (parameter.type.dataType === 'file') {
                return true;
              } else if (parameter.type.dataType === 'array' && parameter.type.elementType.dataType === 'file') {
                return true;
              }
              return false;
            }),
        ),
      ),
      multerOpts: {
        limits: {
          fileSize: 8388608, // 8mb
        },
        ...this.options.multerOpts,
      },
      useSecurity: this.metadata.controllers.some(controller => controller.methods.some(method => !!method.security.length)),
      esm: this.options.esm,
    };
  }

  protected getRelativeImportPath(fileLocation: string) {
    const currentExt = path.extname(fileLocation);
    let newExtension = '';

    if (this.options.esm) {
      switch (currentExt) {
        case '.ts':
        default:
          newExtension = '.js';
          break;
        case '.mts':
          newExtension = '.mjs';
          break;
        case '.cts':
          newExtension = '.cjs';
          break;
      }
    }

    fileLocation = fileLocation.replace(/\.(ts|mts|cts)$/, ''); // no ts extension in import
    return `./${path.relative(this.options.routesDir, fileLocation).replace(/\\/g, '/')}${newExtension}`;
  }

  protected buildPropertySchema(source: Tsoa.Property): TsoaRoute.PropertySchema {
    const propertySchema = this.buildProperty(source.type);
    propertySchema.default = source.default;
    propertySchema.required = source.required ? true : undefined;

    if (Object.keys(source.validators).length > 0) {
      propertySchema.validators = source.validators;
    }
    return propertySchema;
  }

  protected buildParameterSchema(source: Tsoa.Parameter): TsoaRoute.ParameterSchema {
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

  protected buildProperty(type: Tsoa.Type): TsoaRoute.PropertySchema {
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
        schema.array = {
          dataType: arrayType.elementType.dataType,
          ref: arrayType.elementType.refName,
        };
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

  protected async shouldWriteFile(fileName: string, content: string) {
    if (this.options.noWriteIfUnchanged) {
      if (await fsExists(fileName)) {
        const existingContent = (await fsReadFile(fileName)).toString();
        return content !== existingContent;
      }
    }
    return true;
  }
}
