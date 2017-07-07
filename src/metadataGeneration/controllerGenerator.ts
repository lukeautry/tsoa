import * as ts from 'typescript';

import { Controller } from './types';
import { GenerateMetadataError } from './exceptions';
import { MetadataGenerator } from './metadataGenerator';
import { MethodGenerator } from './methodGenerator';

export class ControllerGenerator {
  private readonly pathValue: string | undefined;

  constructor(private readonly node: ts.ClassDeclaration) {
    this.pathValue = this.getControllerRouteValue(node);
  }

  public IsValid() {
    return !!this.pathValue || this.pathValue === '';
  }

  public Generate(): Controller {
    if (!this.node.parent) { throw new GenerateMetadataError(this.node, 'Controller node doesn\'t have a valid parent source file.'); }
    if (!this.node.name) { throw new GenerateMetadataError(this.node, 'Controller node doesn\'t have a valid name.'); }

    const sourceFile = this.node.parent.getSourceFile();

    return {
      location: sourceFile.fileName,
      methods: this.buildMethods(),
      name: this.node.name.text,
      path: this.pathValue || ''
    };
  }

  private buildMethods() {
    return this.node.members
      .filter(m => m.kind === ts.SyntaxKind.MethodDeclaration)
      .map((m: ts.MethodDeclaration) => new MethodGenerator(m))
      .filter(generator => generator.IsValid())
      .map(generator => generator.Generate());
  }

  private getControllerRouteValue(node: ts.ClassDeclaration) {
    return this.getControllerDecoratorValue(node);
  }

  private getControllerDecoratorValue(node: ts.ClassDeclaration) {
    if (!node.decorators) { return undefined; }

    const matchedAttributes = node.decorators
      .map(d => d.expression as ts.CallExpression)
      .filter(expression => {
        const subExpression = expression.expression as ts.Identifier;
        return MetadataGenerator.current.decoratorPlugin.routeIdentifiers.indexOf(subExpression.text) >= 0;
      });

    if (!matchedAttributes.length) { return undefined; }
    if (matchedAttributes.length > 1) {
      throw new GenerateMetadataError(this.node, `A controller can only have a single 'decoratorName' decorator in \`${(this.node.name as any).text}\` class.`);
    }

    return MetadataGenerator.current.decoratorPlugin.getRoutePrefix(matchedAttributes[0]);
  }

}
