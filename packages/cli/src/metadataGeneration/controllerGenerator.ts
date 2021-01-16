import * as ts from 'typescript';
import { getDecorators, getDecoratorValues, getSecurites } from './../utils/decoratorUtils';
import { GenerateMetadataError } from './exceptions';
import { MetadataGenerator } from './metadataGenerator';
import { MethodGenerator } from './methodGenerator';
import { TypeResolver } from './typeResolver';
import { Tsoa } from '@tsoa/runtime';
import { getHeaderType } from '../utils/headerTypeHelpers';

export class ControllerGenerator {
  private readonly path?: string;
  private readonly tags?: string[];
  private readonly security?: Tsoa.Security[];
  private readonly isHidden?: boolean;
  private readonly commonResponses: Tsoa.Response[];

  constructor(private readonly node: ts.ClassDeclaration, private readonly current: MetadataGenerator) {
    this.path = this.getPath();
    this.tags = this.getTags();
    this.security = this.getSecurity();
    this.isHidden = this.getIsHidden();
    this.commonResponses = this.getCommonResponses();
  }

  public IsValid() {
    return !!this.path || this.path === '';
  }

  public Generate(): Tsoa.Controller {
    if (!this.node.parent) {
      throw new GenerateMetadataError("Controller node doesn't have a valid parent source file.");
    }
    if (!this.node.name) {
      throw new GenerateMetadataError("Controller node doesn't have a valid name.");
    }

    const sourceFile = this.node.parent.getSourceFile();

    return {
      location: sourceFile.fileName,
      methods: this.buildMethods(),
      name: this.node.name.text,
      path: this.path || '',
    };
  }

  private buildMethods() {
    return this.node.members
      .filter(m => m.kind === ts.SyntaxKind.MethodDeclaration)
      .map((m: ts.MethodDeclaration) => new MethodGenerator(m, this.current, this.commonResponses, this.path, this.tags, this.security, this.isHidden))
      .filter(generator => generator.IsValid())
      .map(generator => generator.Generate());
  }

  private getPath() {
    const decorators = getDecorators(this.node, identifier => identifier.text === 'Route');
    if (!decorators || !decorators.length) {
      return;
    }
    if (decorators.length > 1) {
      throw new GenerateMetadataError(`Only one Route decorator allowed in '${this.node.name!.text}' class.`);
    }

    const decorator = decorators[0];
    const expression = decorator.parent as ts.CallExpression;
    const decoratorArgument = expression.arguments[0] as ts.StringLiteral;
    return decoratorArgument ? `${decoratorArgument.text}` : '';
  }

  private getCommonResponses(): Tsoa.Response[] {
    const decorators = getDecorators(this.node, identifier => identifier.text === 'Response');
    if (!decorators || !decorators.length) {
      return [];
    }

    return decorators.map(decorator => {
      const expression = decorator.parent as ts.CallExpression;

      const [name, description, example] = getDecoratorValues(decorator, this.current.typeChecker);
      if (!name) {
        throw new GenerateMetadataError(`Controller's responses should have an explicit name.`);
      }

      return {
        description: description || '',
        examples: example === undefined ? undefined : [example],
        name,
        schema: expression.typeArguments && expression.typeArguments.length > 0 ? new TypeResolver(expression.typeArguments[0], this.current).resolve() : undefined,
        headers: getHeaderType(expression.typeArguments, 1, this.current),
      } as Tsoa.Response;
    });
  }

  private getTags() {
    const decorators = getDecorators(this.node, identifier => identifier.text === 'Tags');
    if (!decorators || !decorators.length) {
      return;
    }
    if (decorators.length > 1) {
      throw new GenerateMetadataError(`Only one Tags decorator allowed in '${this.node.name!.text}' class.`);
    }

    const decorator = decorators[0];
    const expression = decorator.parent as ts.CallExpression;

    return expression.arguments.map((a: any) => a.text as string);
  }

  private getSecurity(): Tsoa.Security[] {
    const noSecurityDecorators = getDecorators(this.node, identifier => identifier.text === 'NoSecurity');
    const securityDecorators = getDecorators(this.node, identifier => identifier.text === 'Security');

    if (noSecurityDecorators?.length) {
      throw new GenerateMetadataError(`NoSecurity decorator is unnecessary in '${this.node.name!.text}' class.`);
    }

    if (!securityDecorators || !securityDecorators.length) {
      return [];
    }

    return securityDecorators.map(d => getSecurites(d, this.current.typeChecker));
  }

  private getIsHidden(): boolean {
    const hiddenDecorators = getDecorators(this.node, identifier => identifier.text === 'Hidden');
    if (!hiddenDecorators || !hiddenDecorators.length) {
      return false;
    }
    if (hiddenDecorators.length > 1) {
      throw new GenerateMetadataError(`Only one Hidden decorator allowed in '${this.node.name!.text}' class.`);
    }

    return true;
  }
}
