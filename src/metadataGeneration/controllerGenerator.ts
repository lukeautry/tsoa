import * as ts from 'typescript';
import { getDecorators } from './../utils/decoratorUtils';
import { GenerateMetadataError } from './exceptions';
import { MethodGenerator } from './methodGenerator';
import { Tsoa } from './tsoa';

export class ControllerGenerator {
  private path: string;
  private tags: string[];
  private consumes: string[];
  private security?: Tsoa.Security;

  constructor(private readonly node: ts.ClassDeclaration) {
    this.processRouteDecorator();
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
    this.tags = this.getTags();
    this.consumes = this.getConsumes();
    this.security = this.getSecurity();

    return {
      location: sourceFile.fileName,
      methods: this.buildMethods(),
      name: this.node.name.text,
      path: this.path,
    };
  }

  private buildMethods() {
    return this.node.members
      .filter((m) => m.kind === ts.SyntaxKind.MethodDeclaration)
      .map((m: ts.MethodDeclaration) => new MethodGenerator(m, this.tags, this.consumes, this.security))
      .filter((generator) => generator.IsValid())
      .map((generator) => generator.Generate());
  }

  private processRouteDecorator() {
    const decorators = getDecorators(this.node, (ident) => ident.text === 'Route' || ident.text === 'tsoa.Route');
    if (!decorators || !decorators.length) { return; }
    if (decorators.length > 1) {
      throw new GenerateMetadataError(`A controller can only have a single 'decoratorName' decorator in \`${(this.node.name as any).text}\` class.`);
    }

    const decorator = decorators[0];
    const expression = decorator.parent as ts.CallExpression;
    const decoratorArgument = expression.arguments[0] as ts.StringLiteral;
    this.path = decoratorArgument ? `${decoratorArgument.text}` : '';
  }

  private getCurrentLocation() {
    const controllerId = this.node.name as ts.Identifier;
    return `${controllerId.text}`;
  }

  private getTags(): string[] {
    const decorators = getDecorators(this.node, (ident) => ident.text === 'Tags' || ident.text === 'tsoa.Tags');
    if (!decorators || !decorators.length) {
      return [];
    }
    if (decorators.length > 1) {
      throw new GenerateMetadataError(`Only one Tags decorator allowed in '${this.getCurrentLocation}' method.`);
    }

    const decorator = decorators[0];
    const expression = decorator.parent as ts.CallExpression;

    return expression.arguments.map((a: any) => a.text);
  }

  private getConsumes(): string[] {
    const decorators = getDecorators(this.node, (ident) => ident.text === 'Consumers' || ident.text === 'tsoa.Consumers');
    if (!decorators || !decorators.length) {
      return ['application/json'];
    }
    if (decorators.length > 1) {
      throw new GenerateMetadataError(`Only one Consumers decorator allowed in '${this.getCurrentLocation}' method.`);
    }

    const decorator = decorators[0];
    const expression = decorator.parent as ts.CallExpression;

    return expression.arguments.map((a: any) => a.text);
  }

  private getSecurity(): Tsoa.Security | undefined {
    const decorators = getDecorators(this.node, (ident) => ident.text === 'Security' || ident.text === 'tsoa.Security');
    if (!decorators || !decorators.length) {
      return;
    }
    if (decorators.length > 1) {
      throw new GenerateMetadataError(`Only one Security decorator allowed in '${this.getCurrentLocation}' method.`);
    }

    const decorator = decorators[0];
    const expression = decorator.parent as ts.CallExpression;

    return {
      name: (expression.arguments[0] as any).text,
      scopes: expression.arguments[1] ? (expression.arguments[1] as any).elements.map((e: any) => e.text) : undefined,
    };
  }

}
