import * as ts from 'typescript';
import { Controller } from './metadataGenerator';
import { MethodGenerator } from './methodGenerator';
import { DecoratorsSchema } from './acceptedDecoratorsSchema';

export class ControllerGenerator {
  private readonly pathValue: string | undefined;

  constructor(private readonly node: ts.ClassDeclaration, private readonly decoratorsSchema: DecoratorsSchema/* = ['Route', 'Controller', 'JsonController']*/) {
    this.pathValue = this.getControllerRouteValue(node);
  }

  public IsValid() {
    return !!this.pathValue || this.pathValue === '';
  }

  public Generate(): Controller {
    if (!this.node.parent) { throw new Error('Controller node doesn\'t have a valid parent source file.'); }
    if (!this.node.name) { throw new Error('Controller node doesn\'t have a valid name.'); }

    const sourceFile = this.node.parent.getSourceFile();

    return {
      location: sourceFile.fileName,
      methods: this.buildMethods(),
      name: this.node.name.text,
      path: this.pathValue || ''
    };
  }

  private buildMethods() {
    if (!this.node.name) { throw new Error('Controller node doesn\'t have a valid name.'); }

    return this.node.members
      .filter(m => m.kind === ts.SyntaxKind.MethodDeclaration)
      .map((m: ts.MethodDeclaration) => new MethodGenerator(m, this.decoratorsSchema))
      .filter(generator => generator.IsValid())
      .map(generator => generator.Generate());
  }

  private getControllerRouteValue(node: ts.ClassDeclaration) {
    return this.getControllerDecoratorValue(node, this.decoratorsSchema.controllersDecorators.map( d => d.name ), '');
  }

  private getControllerDecoratorValue(node: ts.ClassDeclaration, decoratorName: string | string[], defaultValue: string) {
    if (!node.decorators) { return undefined; }

    const matchedAttributes = node.decorators
      .map(d => d.expression as ts.CallExpression)
      .filter(expression => {
        const subExpression = expression.expression as ts.Identifier;
        let result = subExpression.text === decoratorName;
        if ( decoratorName instanceof Array ) {
          result = !!decoratorName.find( decoratorName => decoratorName === subExpression.text );
        }
        return result;
      });

    if (!matchedAttributes.length) { return undefined; }
    if (matchedAttributes.length > 1) {
      throw new Error(`A controller can only have a single 'decoratorName' decorator in \`${(this.node.name as any).text}\` class.`);
    }

    const value = matchedAttributes[0].arguments[0] as ts.StringLiteral;
    return value ? value.text : defaultValue;
  }

}
