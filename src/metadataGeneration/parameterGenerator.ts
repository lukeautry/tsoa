import { MetadataGenerator, Parameter, Type } from './metadataGenerator';
import { ResolveType } from './resolveType';
import * as ts from 'typescript';

export class ParameterGenerator {
  constructor(
    private readonly parameter: ts.ParameterDeclaration,
    private readonly method: string,
    private readonly path: string
  ) { }

  public Generate(): Parameter {
    const decoratorName = this.getDecoratorName();

    switch (decoratorName) {
      case 'Request':
        return this.getRequestParameter(this.parameter);
      case 'Body':
        return this.getBodyParameter(this.parameter);
      case 'BodyProp':
        return this.getBodyPropParameter(this.parameter);
      case 'Header':
        return this.getHeaderParameter(this.parameter);
      case 'Query':
        return this.getQueryParameter(this.parameter);
      case 'Path':
        return this.getPathParameter(this.parameter);
      default:
        return this.getPathParameter(this.parameter);
    }
  }

  private getCurrentLocation() {
    const methodId = (this.parameter.parent as ts.MethodDeclaration).name as ts.Identifier;
    const controllerId = ((this.parameter.parent as ts.MethodDeclaration).parent as ts.ClassDeclaration).name as ts.Identifier;
    return `${controllerId.text}.${methodId.text}`;
  }

  private getRequestParameter(parameter: ts.ParameterDeclaration): Parameter {
    const identifier = parameter.name as ts.Identifier;

    return {
      argumentName: identifier.text,
      description: this.getParameterDescription(parameter),
      in: 'request',
      name: identifier.text,
      required: !parameter.questionToken,
      type: 'object'
    };
  }

  private getBodyPropParameter(parameter: ts.ParameterDeclaration): Parameter {
    const type = this.getValidatedType(parameter);
    const identifier = parameter.name as ts.Identifier;

    if (!this.supportsBodyParameters(this.method)) {
      throw new Error(`Body can't support '${this.getCurrentLocation()}' method.`);
    }

    return {
      argumentName: identifier.text,
      description: this.getParameterDescription(parameter),
      in: 'body-prop',
      name: this.getDecoratorValue(parameter, 'BodyProp') || identifier.text,
      required: !parameter.questionToken,
      type: type
    };
  }

  private getBodyParameter(parameter: ts.ParameterDeclaration): Parameter {
    const type = this.getValidatedType(parameter);
    const identifier = parameter.name as ts.Identifier;

    if (!this.supportsBodyParameters(this.method)) {
      throw new Error(`Body can't support ${this.method} method`);
    }

    return {
      argumentName: identifier.text,
      description: this.getParameterDescription(parameter),
      in: 'body',
      name: identifier.text,
      required: !parameter.questionToken,
      type: type
    };
  }

  private getHeaderParameter(parameter: ts.ParameterDeclaration): Parameter {
    const type = this.getValidatedType(parameter);
    const identifier = parameter.name as ts.Identifier;

    if (!this.isPathableType(type)) {
      throw new InvalidParameterException(`Parameter '${identifier.text}' can't be passed as a header parameter in '${this.getCurrentLocation()}'.`);
    }

    return {
      argumentName: identifier.text,
      description: this.getParameterDescription(parameter),
      in: 'header',
      name: this.getDecoratorValue(parameter, 'Header') || identifier.text,
      required: !parameter.questionToken,
      type: type
    };
  }

  private getQueryParameter(parameter: ts.ParameterDeclaration): Parameter {
    const type = this.getValidatedType(parameter);
    const identifier = parameter.name as ts.Identifier;

    if (!this.isPathableType(type)) {
      throw new InvalidParameterException(`Parameter '${identifier.text}' can't be passed as a query parameter in '${this.getCurrentLocation()}'.`);
    }

    return {
      argumentName: identifier.text,
      description: this.getParameterDescription(parameter),
      in: 'query',
      name: this.getDecoratorValue(parameter, 'Query') || identifier.text,
      required: !parameter.questionToken,
      type: type
    };
  }

  private getPathParameter(parameter: ts.ParameterDeclaration): Parameter {
    const type = this.getValidatedType(parameter);
    const identifier = parameter.name as ts.Identifier;

    if (!this.isPathableType(type)) {
      throw new InvalidParameterException(`Parameter '${identifier.text}' can't be passed as a path parameter in '${this.getCurrentLocation()}'.`);
    }

    const name = this.getDecoratorValue(parameter, 'Path') || identifier.text;

    if (!this.path.includes(`{${name}}`)) {
      throw new Error(`Parameter '${name}' can't macth in path: '${this.path}'`);
    }

    return {
      argumentName: identifier.text,
      description: this.getParameterDescription(parameter),
      in: 'path',
      name: name,
      required: true,
      type: type
    };
  }

  private getParameterDescription(node: ts.ParameterDeclaration) {
    const symbol = MetadataGenerator.current.typeChecker.getSymbolAtLocation(node.name);

    const comments = symbol.getDocumentationComment();
    if (comments.length) { return ts.displayPartsToString(comments); }

    return '';
  }


  private supportsBodyParameters(method: string) {
    return ['post', 'put', 'patch'].some(m => m === method.toLowerCase());
  }

  private supportParameterDecorator() {
    return ['Header', 'Query', 'Parem', 'Body', 'BodyProp', 'Request'];
  }

  private isPathableType(parameterType: Type) {
    if (!(typeof parameterType === 'string' || parameterType instanceof String)) {
      return false;
    }

    const type = parameterType as string;
    return !!['string', 'boolean', 'number', 'datetime', 'buffer'].find(t => t === type);
  }

  private getValidatedType(parameter: ts.ParameterDeclaration) {
    if (!parameter.type) {
      throw new Error(`Parameter ${parameter.name} doesn't have a valid type assigned in '${this.getCurrentLocation()}'.`);
    }
    return ResolveType(parameter.type);
  }

  private getDecorators(isMatching: (identifier: ts.Identifier) => boolean) {
    const decorators = this.parameter.decorators;
    if (!decorators || !decorators.length) { return; }

    return decorators
      .map(d => d.expression as ts.CallExpression)
      .map(e => e.expression as ts.Identifier)
      .filter(isMatching);
  }

  private getDecoratorName() {
    const decorators = this.getDecorators(identifier =>
      this.supportParameterDecorator().some(d => d === identifier.text)
    );

    if (decorators && decorators.length > 0 && decorators[0].text) {
      return decorators[0].text;
    }
    return;
  }

  private getDecoratorValue(parameter: ts.ParameterDeclaration, decoratorName: string) {
    const decorators = this.getDecorators(identifier =>
      identifier.text === decoratorName
    );
    if (!decorators || decorators.length === 0) { return; }

    const expression = decorators[0].parent as ts.CallExpression;
    if (!expression.arguments || expression.arguments.length === 0) { return; }

    return (expression.arguments[0] as any).text;
  }
}

class InvalidParameterException extends Error { }
