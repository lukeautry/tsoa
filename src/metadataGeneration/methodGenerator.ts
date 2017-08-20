import * as ts from 'typescript';
import { getDecorators } from './../utils/decoratorUtils';
import { getJSDocComment, getJSDocDescription, isExistJSDocTag } from './../utils/jsDocUtils';
import { GenerateMetadataError } from './exceptions';
import { MetadataGenerator } from './metadataGenerator';
import { ParameterGenerator } from './parameterGenerator';
import { getInitializerValue, resolveType } from './resolveType';
import { Tsoa } from './tsoa';

export class MethodGenerator {
  private method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  private path: string;

  constructor(
    private readonly node: ts.MethodDeclaration,
    private readonly parentTags?: string[],
    private readonly parentSecurity?: Tsoa.Security[]) {
    this.processMethodDecorators();
  }

  public IsValid() {
    return !!this.method;
  }

  public Generate(): Tsoa.Method {
    if (!this.IsValid()) {
      throw new GenerateMetadataError('This isn\'t a valid a controller method.');
    }

    let nodeType = this.node.type;
    if (!nodeType) {
      const typeChecker = MetadataGenerator.current.typeChecker;
      const signature = typeChecker.getSignatureFromDeclaration(this.node);
      const implicitType = typeChecker.getReturnTypeOfSignature(signature!);
      nodeType = typeChecker.typeToTypeNode(implicitType);
    }
    const type = resolveType(nodeType);
    const responses = this.getMethodResponses();
    responses.push(this.getMethodSuccessResponse(type));

    return {
      deprecated: isExistJSDocTag(this.node, (tag) => tag.tagName.text === 'deprecated'),
      description: getJSDocDescription(this.node),
      isHidden: this.getIsHidden(),
      method: this.method,
      name: (this.node.name as ts.Identifier).text,
      parameters: this.buildParameters(),
      path: this.path,
      responses,
      security: this.getSecurity(),
      summary: getJSDocComment(this.node, 'summary'),
      tags: this.getTags(),
      type,
    };
  }

  private buildParameters() {
    const parameters = this.node.parameters.map((p) => {
      try {
        return new ParameterGenerator(p, this.method, this.path).Generate();
      } catch (e) {
        const methodId = this.node.name as ts.Identifier;
        const controllerId = (this.node.parent as ts.ClassDeclaration).name as ts.Identifier;
        throw new GenerateMetadataError(`${e.message} \n in '${controllerId.text}.${methodId.text}'`);
      }
    });

    const bodyParameters = parameters.filter((p) => p.in === 'body');
    const bodyProps = parameters.filter((p) => p.in === 'body-prop');

    if (bodyParameters.length > 1) {
      throw new GenerateMetadataError(`Only one body parameter allowed in '${this.getCurrentLocation()}' method.`);
    }
    if (bodyParameters.length > 0 && bodyProps.length > 0) {
      throw new GenerateMetadataError(`Choose either during @Body or @BodyProp in '${this.getCurrentLocation()}' method.`);
    }
    return parameters;
  }

  private getCurrentLocation() {
    const methodId = this.node.name as ts.Identifier;
    const controllerId = (this.node.parent as ts.ClassDeclaration).name as ts.Identifier;
    return `${controllerId.text}.${methodId.text}`;
  }

  private processMethodDecorators() {
    const pathDecorators = getDecorators(this.node, (identifier) => this.supportsPathMethod(identifier.text));

    if (!pathDecorators || !pathDecorators.length) { return; }
    if (pathDecorators.length > 1) {
      throw new GenerateMetadataError(`Only one path decorator in '${this.getCurrentLocation}' method, Found: ${pathDecorators.map((d) => d.text).join(', ')}`);
    }

    const decorator = pathDecorators[0];
    const expression = decorator.parent as ts.CallExpression;
    const decoratorArgument = expression.arguments[0] as ts.StringLiteral;

    this.method = decorator.text.toLowerCase() as any;
    // if you don't pass in a path to the method decorator, we'll just use the base route
    // todo: what if someone has multiple no argument methods of the same type in a single controller?
    // we need to throw an error there
    this.path = decoratorArgument ? `/${decoratorArgument.text}` : '';
  }

  private getMethodResponses(): Tsoa.Response[] {
    const decorators = getDecorators(this.node, (identifier) => identifier.text === 'Response');
    if (!decorators || !decorators.length) {
      return [];
    }

    return decorators.map((decorator) => {
      const expression = decorator.parent as ts.CallExpression;

      let description = '';
      let name = '200';
      let examples;
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
        description,
        examples,
        name,
        schema: (expression.typeArguments && expression.typeArguments.length > 0)
          ? resolveType(expression.typeArguments[0])
          : undefined,
      } as Tsoa.Response;
    });
  }

  private getMethodSuccessResponse(type: Tsoa.Type): Tsoa.Response {
    const decorators = getDecorators(this.node, (identifier) => identifier.text === 'SuccessResponse');
    if (!decorators || !decorators.length) {
      return {
        description: type.dataType === 'void' ? 'No content' : 'Ok',
        examples: this.getMethodSuccessExamples(),
        name: type.dataType === 'void' ? '204' : '200',
        schema: type,
      };
    }
    if (decorators.length > 1) {
      throw new GenerateMetadataError(`Only one SuccessResponse decorator allowed in '${this.getCurrentLocation}' method.`);
    }

    const decorator = decorators[0];
    const expression = decorator.parent as ts.CallExpression;

    let description = '';
    let name = '200';
    const examples = undefined;

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
      schema: type,
    };
  }

  private getMethodSuccessExamples() {
    const exampleDecorators = getDecorators(this.node, (identifier) => identifier.text === 'Example');
    if (!exampleDecorators || !exampleDecorators.length) {
      return undefined;
    }
    if (exampleDecorators.length > 1) {
      throw new GenerateMetadataError(`Only one Example decorator allowed in '${this.getCurrentLocation}' method.`);
    }

    const decorator = exampleDecorators[0];
    const expression = decorator.parent as ts.CallExpression;
    const argument = expression.arguments[0] as any;

    return this.getExamplesValue(argument);
  }

  private supportsPathMethod(method: string) {
    return ['get', 'post', 'put', 'patch', 'delete'].some((m) => m === method.toLowerCase());
  }

  private getExamplesValue(argument: any) {
    const example: any = {};
    argument.properties.forEach((p: any) => {
      example[p.name.text] = getInitializerValue(p.initializer);
    });
    return example;
  }

  private getTags() {
    const tagsDecorators = getDecorators(this.node, (identifier) => identifier.text === 'Tags');
    if (!tagsDecorators || !tagsDecorators.length) {
      return this.parentTags;
    }
    if (tagsDecorators.length > 1) {
      throw new GenerateMetadataError(`Only one Tags decorator allowed in '${this.getCurrentLocation}' method.`);
    }

    const decorator = tagsDecorators[0];
    const expression = decorator.parent as ts.CallExpression;
    const tags = expression.arguments.map((a: any) => a.text as string);
    if (this.parentTags) {
      tags.push(...this.parentTags);
    }
    return tags;
  }

  private getIsHidden() {
    const hiddenDecorators = getDecorators(this.node, (identifier) => identifier.text === 'Hidden');
    if (!hiddenDecorators || !hiddenDecorators.length) {
      return false;
    }
    if (hiddenDecorators.length > 1) {
      throw new GenerateMetadataError(`Only one Hidden decorator allowed in '${this.getCurrentLocation}' method.`);
    }

    return true;
  }

  private getSecurity(): Tsoa.Security[] {
    const securityDecorators = getDecorators(this.node, (identifier) => identifier.text === 'Security');
    if (!securityDecorators || !securityDecorators.length) {
      return this.parentSecurity || [];
    }

    const security: Tsoa.Security[] = [];
    for (const sec of securityDecorators) {
      const expression = sec.parent as ts.CallExpression;
      security.push({
        name: (expression.arguments[0] as any).text,
        scopes: expression.arguments[1] ? (expression.arguments[1] as any).elements.map((e: any) => e.text) : undefined,
      });
    }

    return security;
  }
}
