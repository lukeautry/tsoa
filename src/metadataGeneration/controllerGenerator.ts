import * as ts from 'typescript';
import { getDecorators } from './../utils/decoratorUtils';
import { GenerateMetadataError } from './exceptions';
import { MetadataGenerator } from './metadataGenerator';
import { MethodGenerator } from './methodGenerator';
import { getSecurities } from './security';
import { Tsoa } from './tsoa';

export class ControllerGenerator {
  private readonly path?: string;
  private readonly tags?: string[];
  private readonly security?: Tsoa.Security[];

  constructor(
    private readonly node: ts.ClassDeclaration,
    private readonly current: MetadataGenerator,
    ) {
    this.path = this.getPath();
    this.tags = this.getTags();
    this.security = this.getSecurity();
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
      .map((m: ts.MethodDeclaration) => new MethodGenerator(m, this.current, this.tags, this.security))
      .filter((generator) => generator.IsValid())
      .map((generator) => generator.Generate());
  }

  private getPath() {
    const decorators = getDecorators(this.node, (identifier) => identifier.text === 'Route');
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

  private getTags() {
    const decorators = getDecorators(this.node, (identifier) => identifier.text === 'Tags');
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
    const securityDecorators = getDecorators(this.node, (identifier) => identifier.text === 'Security');
    if (!securityDecorators || !securityDecorators.length) {
      return [];
    }

    return getSecurities(securityDecorators);
  }
}
