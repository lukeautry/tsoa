import * as ts from 'typescript';
import { getDecorators } from './../utils/decoratorUtils';
import { GenerateMetadataError } from './exceptions';
import { MethodGenerator } from './methodGenerator';
import { Tsoa } from './tsoa';

export class ControllerGenerator {
  private readonly path?: string;
  private readonly tags?: string[];
  private readonly contentTypes?: string[];
  private readonly security?: Tsoa.Security;

  constructor(private readonly node: ts.ClassDeclaration) {
    this.path = this.getPath();
    this.tags = this.getTags();
    this.security = this.getSecurity();
    this.contentTypes = this.getContentTypes();
  }

  public IsValid() {
    return !!this.path || this.path === '';
  }

  public Generate(): Tsoa.Controller {
    if (!this.node.parent) {
      throw new GenerateMetadataError('Controller node doesn\'t have a valid parent source file.');
    }
    if (!this.node.name) {
      throw new GenerateMetadataError('Controller node doesn\'t have a valid name.');
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
      .filter((m) => m.kind === ts.SyntaxKind.MethodDeclaration)
      .map((method: ts.MethodDeclaration) => new MethodGenerator(method, this.tags, this.security, this.contentTypes))
      .filter((generator) => generator.IsValid())
      .map((generator) => generator.Generate());
  }

  private getPath() {
    const decorators = getDecorators(this.node, (identifier) => identifier.text === 'Route');
    if (!decorators || !decorators.length) {
      return;
    }
    if (decorators.length > 1) {
      throw new GenerateMetadataError(`Only one @Route decorator allowed in '${this.node.name!.text}' class.`);
    }

    const decorator = decorators[0];
    const expression = decorator.parent as ts.CallExpression;
    const decoratorArgument = expression.arguments[0] as ts.StringLiteral;
    return decoratorArgument ? `${decoratorArgument.text}` : '';
  }

  private getTags() {
    const decorators = getDecorators(this.node, (identifier) => identifier.text === 'Tags');
    if (!decorators || !decorators.length) {
      return;
    }
    if (decorators.length > 1) {
      throw new GenerateMetadataError(`Only one @Tags decorator allowed in '${this.node.name!.text}' class.`);
    }

    const decorator = decorators[0];
    const expression = decorator.parent as ts.CallExpression;

    return expression.arguments.map((a: any) => a.text as string);
  }

  private getContentTypes() {
    const decorators = getDecorators(this.node, (ident) => ident.text === 'ContentType');
    if (!decorators || !decorators.length) {
      return;
    }
    if (decorators.length > 1) {
      throw new GenerateMetadataError(`Only one @ContentType decorator allowed in '${this.node.name!.text}' class.`);
    }

    const decorator = decorators[0];
    const expression = decorator.parent as ts.CallExpression;

    return expression.arguments.map((a: any) => a.text as string);
  }

  private getSecurity() {
    const decorators = getDecorators(this.node, (identifier) => identifier.text === 'Security');
    if (!decorators || !decorators.length) {
      return;
    }
    if (decorators.length > 1) {
      throw new GenerateMetadataError(`Only one @Security decorator allowed in '${this.node.name!.text}' class.`);
    }

    const decorator = decorators[0];
    const expression = decorator.parent as ts.CallExpression;
    return {
      name: (expression.arguments[0] as any).text,
      scopes: expression.arguments[1] ? (expression.arguments[1] as any).elements.map((e: any) => e.text) : undefined,
    } as Tsoa.Security;
  }
}
