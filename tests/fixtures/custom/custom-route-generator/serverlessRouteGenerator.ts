/* eslint-disable @typescript-eslint/restrict-template-expressions */
import * as fs from 'fs';
import * as handlebars from 'handlebars';
import { ExtendedRoutesConfig } from '@tsoa/cli/src/cli';
import { Tsoa, TsoaRoute, assertNever } from '@tsoa/runtime';
import { fsReadFile, fsWriteFile, fsExists, fsMkDir } from '@tsoa/cli/src/utils/fs';
import { AbstractRouteGenerator } from '@tsoa/cli/src/routeGeneration/routeGenerator';
import path = require('path');

export interface ServerlessRoutesConfig extends ExtendedRoutesConfig {
  modelsTemplate?: string;
  modelsFileName?: string;
  handlerTemplate?: string;
  stackTemplate: string;
}

export default class ServerlessRouteGenerator extends AbstractRouteGenerator<ServerlessRoutesConfig> {
  constructor(metadata: Tsoa.Metadata, options: ServerlessRoutesConfig) {
    super(metadata, options);
    this.registerTemplateHelpers();
  }

  protected pathTransformer(path: string): string {
    return path;
  }

  registerTemplateHelpers() {
    handlebars.registerHelper('json', (context: any) => {
      return JSON.stringify(context);
    });

    const additionalPropsHelper = (additionalProperties: TsoaRoute.RefObjectModelSchema['additionalProperties']) => {
      if (additionalProperties) {
        // Then the model for this type explicitly allows additional properties and thus we should assign that
        return JSON.stringify(additionalProperties);
      } else if (this.options.noImplicitAdditionalProperties === 'silently-remove-extras') {
        return JSON.stringify(false);
      } else if (this.options.noImplicitAdditionalProperties === 'throw-on-extras') {
        return JSON.stringify(false);
      } else if (this.options.noImplicitAdditionalProperties === 'ignore') {
        return JSON.stringify(true);
      } else {
        return assertNever(this.options.noImplicitAdditionalProperties);
      }
    };
    handlebars.registerHelper('additionalPropsHelper', additionalPropsHelper);
  }

  public async GenerateCustomRoutes() {
    if (!fs.lstatSync(this.options.routesDir).isDirectory()) {
      throw new Error(`routesDir should be a directory`);
    }
    await this.generateModels();
    await this.generateRoutes();
    await this.generateStack();
  }

  async generateFileFromTemplate(templateName: string, templateContext: object, outputFileName: string) {
    const data = await fsReadFile(path.join(templateName));
    const file = data.toString();

    const template = handlebars.compile(file, { noEscape: true });

    const content = template(templateContext);

    if (await this.shouldWriteFile(outputFileName, content)) {
      return await fsWriteFile(outputFileName, content);
    }
    return Promise.resolve();
  }

  /**
   * Generate the CDK infrastructure stack that ties API Gateway to generated Handlers
   * @returns 
   */
  async generateStack(): Promise<void> {
    // This would need to generate a CDK "Stack" that takes the tsoa metadata as input and generates a valid serverless CDK infrastructure stack from template
    const templateFileName = this.options.stackTemplate;
    const fileName = `${this.options.routesDir}/stack.ts`;
    const context = this.buildContext() as unknown as any;
    context.controllers = context.controllers.map((controller) => {
      controller.actions = controller.actions.map((action) => {
        return {
          ...action,
          handlerFolderName:`${this.options.routesDir}/${controller.name}`
        }
      });
      return controller;
    });
    await this.generateFileFromTemplate(templateFileName, context, fileName);
  }

  async generateModels(): Promise<void> {
    const templateFileName = this.options.modelsTemplate || 'models.hbs';
    const fileName = `${this.options.routesDir}/${this.options.modelsFileName || 'models.ts'}`;
    const context = {
      models: this.buildModels(),
      minimalSwaggerConfig: { noImplicitAdditionalProperties: this.options.noImplicitAdditionalProperties },
    };
    await this.generateFileFromTemplate(templateFileName, context, fileName);
  }

  public async generateRoutes() {
    const context = this.buildContext();
    await Promise.all(
      context.controllers.map(async controller => {
        const templateFileName = this.options.handlerTemplate || 'handler.hbs';
        await fsMkDir(`${this.options.routesDir}/${controller.name}`, { recursive: true });
        return Promise.all(
          controller.actions.map(action => {
            const fileName = `${this.options.routesDir}/${controller.name}/${action.name}${this.options.esm ? '.js' : '.ts'}`;
            return this.generateFileFromTemplate(
              templateFileName,
              {
                ...context,
                modelsFileName: this.getRelativeImportPath(`${this.options.routesDir}/${this.options.modelsFileName || 'models.ts'}`),
                controller,
                action,
              },
              fileName,
            );
          }),
        );
      }),
    );
  }
}
