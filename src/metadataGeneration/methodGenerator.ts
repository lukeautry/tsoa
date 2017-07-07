import * as ts from 'typescript';

import { Method, ResponseType, Type } from './types';
import { getJSDocComment, getJSDocDescription, isExistJSDocTag } from './../utils/jsDocUtils';

import { GenerateMetadataError } from './exceptions';
import { MetadataGenerator } from './metadataGenerator';
import { ParameterGenerator } from './parameterGenerator';
import { ResolveType } from './resolveType';
import { getDecorators } from './../utils/decoratorUtils';
import { getPhase } from '../utils/statusCodes';

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
    if (!this.IsValid()) { throw new GenerateMetadataError(this.node, 'This isn\'t a valid a controller method.'); }
    if (!this.node.type) { throw new GenerateMetadataError(this.node, 'Controller methods must have a return type.'); }

    const identifier = this.node.name as ts.Identifier;
    const type = ResolveType(this.node.type);
    const responses = this.getMethodResponses(type);

    return {
      deprecated: isExistJSDocTag(this.node, tag => tag.tagName.text === 'deprecated'),
      description: getJSDocDescription(this.node),
      method: this.method,
      name: identifier.text,
      parameters: this.buildParameters(),
      path: this.path,
      produces: this.getProduces(),
      responses,
      security: this.getMethodSecurity(),
      summary: getJSDocComment(this.node, 'summary'),
      tags: this.getMethodTags(),
      type
    };
  }

  private buildParameters() {
    const parameters = this.node.parameters.map(p => {
      try {
        return new ParameterGenerator(p, this.method, this.path).Generate()!;
      } catch (e) {
        const methodId = this.node.name as ts.Identifier;
        const controllerId = (this.node.parent as ts.ClassDeclaration).name as ts.Identifier;
        const parameterId = p.name as ts.Identifier;
        throw new GenerateMetadataError(this.node, `Error generate parameter method: '${controllerId.text}.${methodId.text}' argument: ${parameterId.text} ${e}`);
      }
    }).filter(p => p);

    const bodyParameters = parameters.filter(p => p.in === 'body');
    const bodyProps = parameters.filter(p => p.in === 'body-prop');

    if (bodyParameters.length > 1) {
      throw new GenerateMetadataError(this.node, `Only one body parameter allowed in '${this.getCurrentLocation()}' method.`);
    }
    if (bodyParameters.length > 0 && bodyProps.length > 0) {
      throw new GenerateMetadataError(this.node, `Choose either during @Body or @BodyProp in '${this.getCurrentLocation()}' method.`);
    }
    return parameters;
  }

  private getCurrentLocation() {
    const methodId = this.node.name as ts.Identifier;
    const controllerId = (this.node.parent as ts.ClassDeclaration).name as ts.Identifier;
    return `${controllerId.text}.${methodId.text}`;
  }

  private processMethodDecorators() {
    const pathDecorators = getDecorators(this.node, identifier => MetadataGenerator.current.decoratorPlugin.methodActionIdentifiers.indexOf(identifier.text) >= 0);

    if (!pathDecorators || !pathDecorators.length) { return; }
    if (pathDecorators.length > 1) {
      throw new GenerateMetadataError(this.node, `Only one path decorator in '${this.getCurrentLocation}' method, Found: ${pathDecorators.map(d => d.text).join(', ')}`);
    }

    const decorator = pathDecorators[0];
    const expression = decorator.parent as ts.CallExpression;

    const methodAction = MetadataGenerator.current.decoratorPlugin.getMethodAction(expression);

    this.method = methodAction.method;
    // if you don't pass in a path to the method decorator, we'll just use the base route
    // todo: what if someone has multiple no argument methods of the same type in a single controller?
    // we need to throw an error there
    this.path = methodAction.path;
  }

  private getMethodResponses(type: Type): ResponseType[] {
    const decorators = getDecorators(this.node, identifier => MetadataGenerator.current.decoratorPlugin.responseIdentifiers.indexOf(identifier.text) >= 0);

    const responses = decorators.map(decorator => {
      const expression = decorator.parent as ts.CallExpression;
      return MetadataGenerator.current.decoratorPlugin.getMethodResponse(expression, type);
    });

    const successResponses = responses.filter(res => res.code < 400);
    if (!successResponses.length) {
      const code = type.typeName === 'void' ? 204 : 200;
      const successResponse = {
        code,
        description: getPhase(code),
        name: code.toString(),
        schema: type
      };
      successResponses.push(successResponse);
      responses.push(successResponse);
    }

    if (successResponses.length > 1) {
      throw new GenerateMetadataError(this.node, `Only one SuccessResponse decorator allowed in '${this.getCurrentLocation}' method.`);
    }
    successResponses[0].examples = this.getMethodSuccessExamples() || successResponses[0].examples;

    return responses;
  }

  private getMethodSuccessExamples() {
    const exampleDecorators = getDecorators(this.node, identifier => MetadataGenerator.current.decoratorPlugin.exampleIdentifiers.indexOf(identifier.text) >= 0);
    if (!exampleDecorators || !exampleDecorators.length) { return undefined; }
    if (exampleDecorators.length > 1) {
      throw new GenerateMetadataError(this.node, `Only one Example decorator allowed in '${this.getCurrentLocation}' method.`);
    }

    const decorator = exampleDecorators[0];
    const expression = decorator.parent as ts.CallExpression;

    return MetadataGenerator.current.decoratorPlugin.getExample(expression);
  }

  private getMethodTags() {
    const tagsDecorators = getDecorators(this.node, identifier => MetadataGenerator.current.decoratorPlugin.tagIdentifiers.indexOf(identifier.text) >= 0);
    if (!tagsDecorators || !tagsDecorators.length) { return []; }
    if (tagsDecorators.length > 1) {
      throw new GenerateMetadataError(this.node, `Only one Tags decorator allowed in '${this.getCurrentLocation}' method.`);
    }

    const decorator = tagsDecorators[0];
    const expression = decorator.parent as ts.CallExpression;

    return MetadataGenerator.current.decoratorPlugin.getMethodTags(expression);
  }

  private getMethodSecurity() {
    const securityDecorators = getDecorators(this.node, identifier => MetadataGenerator.current.decoratorPlugin.securityIdentifiers.indexOf(identifier.text) >= 0);
    if (!securityDecorators || !securityDecorators.length) { return undefined; }
    if (securityDecorators.length > 1) {
      throw new GenerateMetadataError(this.node, `Only one Security decorator allowed in '${this.getCurrentLocation}' method.`);
    }

    const decorator = securityDecorators[0];
    const expression = decorator.parent as ts.CallExpression;

    return MetadataGenerator.current.decoratorPlugin.getMethodSecurities(expression);
  }

  private getProduces() {
    const decorators = getDecorators(this.node, identifier => MetadataGenerator.current.decoratorPlugin.produceIdentifiers.indexOf(identifier.text) >= 0);
    const produces = decorators.map(decorator => MetadataGenerator.current.decoratorPlugin.getProduce(decorator.parent as ts.CallExpression));
    if (!produces.length) {
      produces.push('application/json');
    }
    return produces;
  }
}
