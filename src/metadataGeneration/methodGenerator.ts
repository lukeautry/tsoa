import * as ts from 'typescript';
import { Method, ResponseType, Type } from './metadataGenerator';
import { ResolveType } from './resolveType';
import { ParameterGenerator } from './parameterGenerator';
import { getJSDocDescription, getJSDocTag, isExistJSDocTag } from './../utils/jsDocUtils';
import { getDecorators } from './../utils/decoratorUtils';

export class MethodGenerator {
  private method: string;
  private path: string;

  constructor(private readonly node: ts.MethodDeclaration) {
    this.processMethodDecorators();
  }

  public IsValid() {
    return !!this.method;
  }

  public Generate(): Method {
    if (!this.IsValid()) { throw new Error('This isn\'t a valid a controller method.'); }
    if (!this.node.type) { throw new Error('Controller methods must have a return type.'); }

    const identifier = this.node.name as ts.Identifier;
    const type = ResolveType(this.node.type);
    const responses = this.getMethodResponses();
    responses.push(this.getMethodSuccessResponse(type));

    return {
      deprecated: isExistJSDocTag(this.node, 'deprecated'),
      description: getJSDocDescription(this.node),
      method: this.method,
      name: identifier.text,
      parameters: this.buildParameters(),
      path: this.path,
      responses,
      security: this.getMethodSecurity(),
      summary: getJSDocTag(this.node, 'summary'),
      tags: this.getMethodTags(),
      type
    };
  }

  private buildParameters() {
    const parameters = this.node.parameters.map(p => {
      try {
        return new ParameterGenerator(p, this.method, this.path).Generate();
      } catch (e) {
        const methodId = this.node.name as ts.Identifier;
        const controllerId = (this.node.parent as ts.ClassDeclaration).name as ts.Identifier;
        const parameterId = p.name as ts.Identifier;
        throw new Error(`Error generate parameter method: '${controllerId.text}.${methodId.text}' argument: ${parameterId.text} ${e}`);
      }
    });

    const bodyParameters = parameters.filter(p => p.in === 'body');
    const bodyProps = parameters.filter(p => p.in === 'body-prop');

    if (bodyParameters.length > 1) {
      throw new Error(`Only one body parameter allowed in '${this.getCurrentLocation()}' method.`);
    }
    if (bodyParameters.length > 0 && bodyProps.length > 0) {
      throw new Error(`Choose either during @Body or @BodyProp in '${this.getCurrentLocation()}' method.`);
    }
    return parameters;
  }

  private getCurrentLocation() {
    const methodId = this.node.name as ts.Identifier;
    const controllerId = (this.node.parent as ts.ClassDeclaration).name as ts.Identifier;
    return `${controllerId.text}.${methodId.text}`;
  }

  private processMethodDecorators() {
    const pathDecorators = getDecorators(this.node, identifier => this.supportsPathMethod(identifier.text));

    if (!pathDecorators || !pathDecorators.length) { return; }
    if (pathDecorators.length > 1) {
      throw new Error(`Only one path decorator in '${this.getCurrentLocation}' method, Found: ${pathDecorators.map(d => d.text).join(', ')}`);
    }

    const decorator = pathDecorators[0];
    const expression = decorator.parent as ts.CallExpression;
    const decoratorArgument = expression.arguments[0] as ts.StringLiteral;

    this.method = decorator.text.toLowerCase();
    // if you don't pass in a path to the method decorator, we'll just use the base route
    // todo: what if someone has multiple no argument methods of the same type in a single controller?
    // we need to throw an error there
    this.path = decoratorArgument ? `/${decoratorArgument.text}` : '';
  }

  private getMethodResponses(): ResponseType[] {
    const decorators = getDecorators(this.node, identifier => identifier.text === 'Response');
    if (!decorators || !decorators.length) { return []; }

    return decorators.map(decorator => {
      const expression = decorator.parent as ts.CallExpression;

      let description = '';
      let name = '200';
      let examples = undefined;
      if (expression.arguments.length > 0 && (expression.arguments[0] as any).text) {
        name = (expression.arguments[0] as any).text;
      }
      if (expression.arguments.length > 1 && (expression.arguments[1] as any).text) {
        description = (expression.arguments[1] as any).text;
      }
      if (expression.arguments.length > 2 && (expression.arguments[2] as any).text) {
        const argument = expression.arguments[2] as any;
        examples = this.getExamplesValue(argument);
      }

      return {
        description: description,
        examples: examples,
        name: name,
        schema: (expression.typeArguments && expression.typeArguments.length > 0)
          ? ResolveType(expression.typeArguments[0])
          : undefined
      };
    });
  }

  private getMethodSuccessResponse(type: Type): ResponseType {
    const decorators = getDecorators(this.node, identifier => identifier.text === 'SuccessResponse');
    if (!decorators || !decorators.length) {
      return {
        description: type.typeName === 'void' ? 'No content' : 'Ok',
        examples: this.getMethodSuccessExamples(),
        name: type.typeName === 'void' ? '204' : '200',
        schema: type
      };
    }
    if (decorators.length > 1) {
      throw new Error(`Only one SuccessResponse decorator allowed in '${this.getCurrentLocation}' method.`);
    }

    const decorator = decorators[0];
    const expression = decorator.parent as ts.CallExpression;

    let description = '';
    let name = '200';
    let examples = undefined;

    if (expression.arguments.length > 0 && (expression.arguments[0] as any).text) {
      name = (expression.arguments[0] as any).text;
    }
    if (expression.arguments.length > 1 && (expression.arguments[1] as any).text) {
      description = (expression.arguments[1] as any).text;
    }

    return {
      description,
      examples,
      name,
      schema: type
    };
  }

  private getMethodSuccessExamples() {
    const exampleDecorators = getDecorators(this.node, identifier => identifier.text === 'Example');
    if (!exampleDecorators || !exampleDecorators.length) { return undefined; }
    if (exampleDecorators.length > 1) {
      throw new Error(`Only one Example decorator allowed in '${this.getCurrentLocation}' method.`);
    }

    const decorator = exampleDecorators[0];
    const expression = decorator.parent as ts.CallExpression;
    const argument = expression.arguments[0] as any;

    return this.getExamplesValue(argument);
  }

  private supportsPathMethod(method: string) {
    return ['get', 'post', 'patch', 'delete', 'put'].some(m => m === method.toLowerCase());
  }

  private getExamplesValue(argument: any) {
    const example: any = {};
    argument.properties.forEach((p: any) => {
      example[p.name.text] = this.getInitializerValue(p.initializer);
    });
    return example;
  }

  private getMethodTags() {
    const tagsDecorators = getDecorators(this.node, identifier => identifier.text === 'Tags');
    if (!tagsDecorators || !tagsDecorators.length) { return []; }
    if (tagsDecorators.length > 1) {
      throw new Error(`Only one Tags decorator allowed in '${this.getCurrentLocation}' method.`);
    }

    const decorator = tagsDecorators[0];
    const expression = decorator.parent as ts.CallExpression;

    return expression.arguments.map((a: any) => a.text);
  }

  private getMethodSecurity() {
    const securityDecorators = getDecorators(this.node, identifier => identifier.text === 'Security');
    if (!securityDecorators || !securityDecorators.length) { return undefined; }
    if (securityDecorators.length > 1) {
      throw new Error(`Only one Security decorator allowed in '${this.getCurrentLocation}' method.`);
    }

    const decorator = securityDecorators[0];
    const expression = decorator.parent as ts.CallExpression;

    return {
      name: (expression.arguments[0] as any).text,
      scopes: expression.arguments[1] ? (expression.arguments[1] as any).elements.map((e: any) => e.text) : undefined
    };
  }

  private getInitializerValue(initializer: any) {
    switch (initializer.kind as ts.SyntaxKind) {
      case ts.SyntaxKind.ArrayLiteralExpression:
        return initializer.elements.map((e: any) => this.getInitializerValue(e));
      case ts.SyntaxKind.StringLiteral:
        return initializer.text;
      case ts.SyntaxKind.TrueKeyword:
        return true;
      case ts.SyntaxKind.FalseKeyword:
        return false;
      case ts.SyntaxKind.NumberKeyword:
      case ts.SyntaxKind.FirstLiteralToken:
        return parseInt(initializer.text, 10);
      case ts.SyntaxKind.ObjectLiteralExpression:
        const nestedObject: any = {};

        initializer.properties.forEach((p: any) => {
          nestedObject[p.name.text] = this.getInitializerValue(p.initializer);
        });

        return nestedObject;
      default:
        return undefined;
    }
  }
}
