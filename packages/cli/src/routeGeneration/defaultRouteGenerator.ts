import * as fs from 'fs';
import * as handlebars from 'handlebars';
import * as path from 'path';
import { ExtendedRoutesConfig } from '../cli';
import { Tsoa, TsoaRoute, assertNever } from '@tsoa/runtime';
import { fsReadFile, fsWriteFile } from '../utils/fs';
import { convertBracesPathParams } from '../utils/pathUtils';
import { AbstractRouteGenerator } from './routeGenerator';

export class DefaultRouteGenerator extends AbstractRouteGenerator<ExtendedRoutesConfig> {
  pathTransformerFn: (path: string) => string;
  template: string;
  constructor(metadata: Tsoa.Metadata, options: ExtendedRoutesConfig) {
    super(metadata, options);
    this.pathTransformerFn = convertBracesPathParams;

    switch (options.middleware) {
      case 'express':
        this.template = path.join(__dirname, '..', 'routeGeneration/templates/express.hbs');
        break;
      case 'hapi':
        this.template = path.join(__dirname, '..', 'routeGeneration/templates/hapi.hbs');
        this.pathTransformerFn = (path: string) => path;
        break;
      case 'koa':
        this.template = path.join(__dirname, '..', 'routeGeneration/templates/koa.hbs');
        break;
      default:
        this.template = path.join(__dirname, '..', 'routeGeneration/templates/express.hbs');
    }

    if (options.middlewareTemplate) {
      this.template = options.middlewareTemplate;
    }
  }

  public async GenerateCustomRoutes() {
    const data = await fsReadFile(path.join(this.template));
    const file = data.toString();
    return await this.GenerateRoutes(file);
  }

  public async GenerateRoutes(middlewareTemplate: string) {
    if (!fs.lstatSync(this.options.routesDir).isDirectory()) {
      throw new Error(`routesDir should be a directory`);
    } else if (this.options.routesFileName !== undefined && !this.options.routesFileName.endsWith('.ts')) {
      throw new Error(`routesFileName should have a '.ts' extension`);
    }

    const fileName = `${this.options.routesDir}/${this.options.routesFileName || 'routes.ts'}`;
    const content = this.buildContent(middlewareTemplate);

    if(await this.shouldWriteFile(fileName, content)){
      await fsWriteFile(fileName, content);
    }
  }

  protected pathTransformer(path: string): string {
    return this.pathTransformerFn(path);
  }

  public buildContent(middlewareTemplate: string) {
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

    const routesTemplate = handlebars.compile(middlewareTemplate, { noEscape: true });

    return routesTemplate(this.buildContext());
  }
}
