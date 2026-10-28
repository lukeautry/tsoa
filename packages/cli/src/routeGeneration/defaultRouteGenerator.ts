import * as fs from 'fs';
import * as handlebars from 'handlebars';
import * as path from 'path';
import { ExtendedRoutesConfig } from '../cli';
import { Tsoa, TsoaRoute, assertNever } from '@tsoa/runtime';
import { fsReadFile, fsWriteFile } from '../utils/fs';
import { convertBracesPathParams } from '../utils/pathUtils';
import { AbstractRouteGenerator } from './routeGenerator';

/**
 * Resolves the path of a built-in Handlebars route template.
 *
 * The templates are normally located relative to the CLI package itself, so
 * they are looked up via `__dirname` first. When @tsoa/cli is consumed
 * programmatically from a bundled application (esbuild, webpack, ts-node
 * `--swc`, ...), bundlers rewrite `__dirname` to the bundle's output
 * directory, which makes the package-relative lookup point at the consumer's
 * project root (e.g. `<project>/routeGeneration/templates/express.hbs`).
 * In that case we fall back to resolving the templates from the actually
 * installed package location, which is still available at runtime.
 */
export function resolveDefaultTemplatePath(templateName: string, moduleDir: string = __dirname): string {
  const moduleRelative = path.join(moduleDir, '..', 'routeGeneration/templates', templateName);
  if (fs.existsSync(moduleRelative)) {
    return moduleRelative;
  }

  const packageRoot = path.dirname(require.resolve('@tsoa/cli/package.json'));
  const packageRelative = path.join(packageRoot, 'dist', 'routeGeneration/templates', templateName);
  if (fs.existsSync(packageRelative)) {
    return packageRelative;
  }

  throw new Error(
    `Unable to locate the built-in route template "${templateName}". Tried:\n- ${moduleRelative}\n- ${packageRelative}\n` +
      `If you are bundling @tsoa/cli, make sure the package is installed at runtime, or provide a custom "middlewareTemplate".`,
  );
}

export class DefaultRouteGenerator extends AbstractRouteGenerator<ExtendedRoutesConfig> {
  pathTransformerFn: (path: string) => string;
  template: string;
  constructor(metadata: Tsoa.Metadata, options: ExtendedRoutesConfig) {
    super(metadata, options);
    this.pathTransformerFn = convertBracesPathParams;

    switch (options.middleware) {
      case 'hapi':
        this.template = resolveDefaultTemplatePath('hapi.hbs');
        this.pathTransformerFn = (path: string) => path;
        break;
      case 'koa':
        this.template = resolveDefaultTemplatePath('koa.hbs');
        break;
      case 'express':
      default:
        this.template = resolveDefaultTemplatePath('express.hbs');
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
    const allowedExtensions = this.options.esm ? ['.ts', '.mts', '.cts'] : ['.ts'];

    if (!fs.lstatSync(this.options.routesDir).isDirectory()) {
      throw new Error(`routesDir should be a directory`);
    } else if (this.options.routesFileName !== undefined) {
      const ext = path.extname(this.options.routesFileName);
      if (!allowedExtensions.includes(ext)) {
        throw new Error(`routesFileName should be a valid typescript file.`);
      }
    }

    const fileName = `${this.options.routesDir}/${this.options.routesFileName || 'routes.ts'}`;
    const content = this.buildContent(middlewareTemplate);

    if (await this.shouldWriteFile(fileName, content)) {
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
