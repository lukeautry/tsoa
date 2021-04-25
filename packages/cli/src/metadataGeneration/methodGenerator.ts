import * as ts from 'typescript';
import * as path from 'path';
import { isVoidType } from '../utils/isVoidType';
import { getDecorators, getDecoratorValues, getSecurites } from './../utils/decoratorUtils';
import { getJSDocComment, getJSDocDescription, isExistJSDocTag } from './../utils/jsDocUtils';
import { getExtensions } from './extension';
import { GenerateMetadataError } from './exceptions';
import { MetadataGenerator } from './metadataGenerator';
import { ParameterGenerator } from './parameterGenerator';

import { Tsoa } from '@tsoa/runtime';
import { TypeResolver } from './typeResolver';
import { getHeaderType } from '../utils/headerTypeHelpers';

export class MethodGenerator {
  private method: 'options' | 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head';
  private path: string;

  constructor(
    private readonly node: ts.MethodDeclaration,
    private readonly current: MetadataGenerator,
    private readonly commonResponses: Tsoa.Response[],
    private readonly parentPath?: string,
    private readonly parentTags?: string[],
    private readonly parentSecurity?: Tsoa.Security[],
    private readonly isParentHidden?: boolean,
  ) {
    this.processMethodDecorators();
  }

  public IsValid() {
    return !!this.method;
  }

  public Generate(): Tsoa.Method {
    if (!this.IsValid()) {
      throw new GenerateMetadataError("This isn't a valid a controller method.");
    }

    let nodeType = this.node.type;
    if (!nodeType) {
      const typeChecker = this.current.typeChecker;
      const signature = typeChecker.getSignatureFromDeclaration(this.node);
      const implicitType = typeChecker.getReturnTypeOfSignature(signature!);
      nodeType = typeChecker.typeToTypeNode(implicitType, undefined, ts.NodeBuilderFlags.NoTruncation) as ts.TypeNode;
    }
    const type = new TypeResolver(nodeType, this.current).resolve();
    const responses = this.commonResponses.concat(this.getMethodResponses());
    const { response: successResponse, status: successStatus } = this.getMethodSuccessResponse(type);
    responses.push(successResponse);
    const parameters = this.buildParameters();
    const additionalResponses = parameters.filter((p): p is Tsoa.ResParameter => p.in === 'res');
    responses.push(...additionalResponses);

    return {
      extensions: this.getExtensions(),
      deprecated: this.getIsDeprecated(),
      description: getJSDocDescription(this.node),
      isHidden: this.getIsHidden(),
      method: this.method,
      name: (this.node.name as ts.Identifier).text,
      operationId: this.getOperationId(),
      parameters,
      path: this.path,
      responses,
      successStatus: successStatus,
      security: this.getSecurity(),
      summary: getJSDocComment(this.node, 'summary'),
      tags: this.getTags(),
      type,
    };
  }

  private buildParameters() {
    const fullPath = path.join(this.parentPath || '', this.path);
    const parameters = this.node.parameters
      .map(p => {
        try {
          return new ParameterGenerator(p, this.method, fullPath, this.current).Generate();
        } catch (e) {
          const methodId = this.node.name as ts.Identifier;
          const controllerId = (this.node.parent as ts.ClassDeclaration).name as ts.Identifier;
          throw new GenerateMetadataError(`${String(e.message)} \n in '${controllerId.text}.${methodId.text}'`);
        }
      })
      .reduce((flattened, params) => [...flattened, ...params], []);

    const bodyParameters = parameters.filter(p => p.in === 'body');
    const bodyProps = parameters.filter(p => p.in === 'body-prop');

    const hasFormDataParameters = parameters.some(p => p.in === 'formData');
    const hasBodyParameter = bodyProps.length + bodyParameters.length > 0;

    if (bodyParameters.length > 1) {
      throw new GenerateMetadataError(`Only one body parameter allowed in '${this.getCurrentLocation()}' method.`);
    }
    if (bodyParameters.length > 0 && bodyProps.length > 0) {
      throw new GenerateMetadataError(`Choose either during @Body or @BodyProp in '${this.getCurrentLocation()}' method.`);
    }
    if (hasBodyParameter && hasFormDataParameters) {
      throw new Error(`@Body or @BodyProp cannot be used with @FormField, @UploadedFile, or @UploadedFiles in '${this.getCurrentLocation()}' method.`);
    }
    return parameters;
  }

  private getExtensions() {
    const extensionDecorators = this.getDecoratorsByIdentifier(this.node, 'Extension');
    if (!extensionDecorators || !extensionDecorators.length) {
      return [];
    }
    return getExtensions(extensionDecorators, this.current);
  }

  private getCurrentLocation() {
    const methodId = this.node.name as ts.Identifier;
    const controllerId = (this.node.parent as ts.ClassDeclaration).name as ts.Identifier;
    return `${controllerId.text}.${methodId.text}`;
  }

  private processMethodDecorators() {
    const pathDecorators = getDecorators(this.node, identifier => this.supportsPathMethod(identifier.text));

    if (!pathDecorators || !pathDecorators.length) {
      return;
    }
    if (pathDecorators.length > 1) {
      throw new GenerateMetadataError(`Only one path decorator in '${this.getCurrentLocation()}' method, Found: ${pathDecorators.map(d => d.text).join(', ')}`);
    }

    const decorator = pathDecorators[0];
    const expression = decorator.parent as ts.CallExpression;
    const decoratorArgument = expression.arguments[0] as ts.StringLiteral;

    this.method = decorator.text.toLowerCase() as any;
    // if you don't pass in a path to the method decorator, we'll just use the base route
    // todo: what if someone has multiple no argument methods of the same type in a single controller?
    // we need to throw an error there
    this.path = decoratorArgument ? `${decoratorArgument.text}` : '';
  }

  private getMethodResponses(): Tsoa.Response[] {
    const decorators = this.getDecoratorsByIdentifier(this.node, 'Response');
    if (!decorators || !decorators.length) {
      return [];
    }

    return decorators.map(decorator => {
      const expression = decorator.parent as ts.CallExpression;

      const [name, description, example] = getDecoratorValues(decorator, this.current.typeChecker);

      return {
        description: description || '',
        examples: example === undefined ? undefined : [example],
        name: name || '200',
        schema: expression.typeArguments && expression.typeArguments.length > 0 ? new TypeResolver(expression.typeArguments[0], this.current).resolve() : undefined,
        headers: getHeaderType(expression.typeArguments, 1, this.current),
      } as Tsoa.Response;
    });
  }

  private getMethodSuccessResponse(type: Tsoa.Type): { response: Tsoa.Response; status?: number } {
    const decorators = this.getDecoratorsByIdentifier(this.node, 'SuccessResponse');

    if (!decorators || !decorators.length) {
      return {
        response: {
          description: isVoidType(type) ? 'No content' : 'Ok',
          examples: this.getMethodSuccessExamples(),
          name: isVoidType(type) ? '204' : '200',
          schema: type,
        },
      };
    }
    if (decorators.length > 1) {
      throw new GenerateMetadataError(`Only one SuccessResponse decorator allowed in '${this.getCurrentLocation()}' method.`);
    }

    const [name, description] = getDecoratorValues(decorators[0], this.current.typeChecker);
    const examples = this.getMethodSuccessExamples();

    const expression = decorators[0].parent as ts.CallExpression;
    const headers = getHeaderType(expression.typeArguments, 0, this.current);

    return {
      response: {
        description: description || '',
        examples,
        name: name || '200',
        schema: type,
        headers,
      },
      status: name && /^\d+$/.test(name) ? parseInt(name, 10) : undefined,
    };
  }

  private getMethodSuccessExamples() {
    const exampleDecorators = this.getDecoratorsByIdentifier(this.node, 'Example');
    if (!exampleDecorators || !exampleDecorators.length) {
      return undefined;
    }

    const examples = exampleDecorators.map(exampleDecorator => getDecoratorValues(exampleDecorator, this.current.typeChecker)?.[0]);

    return examples || [];
  }

  private supportsPathMethod(method: string) {
    return ['options', 'get', 'post', 'put', 'patch', 'delete', 'head'].some(m => m === method.toLowerCase());
  }

  private getIsDeprecated() {
    if (isExistJSDocTag(this.node, tag => tag.tagName.text === 'deprecated')) {
      return true;
    }
    const depDecorators = this.getDecoratorsByIdentifier(this.node, 'Deprecated');
    if (!depDecorators || !depDecorators.length) {
      return false;
    }
    if (depDecorators.length > 1) {
      throw new GenerateMetadataError(`Only one Deprecated decorator allowed in '${this.getCurrentLocation()}' method.`);
    }

    return true;
  }

  private getOperationId() {
    const opDecorators = this.getDecoratorsByIdentifier(this.node, 'OperationId');
    if (!opDecorators || !opDecorators.length) {
      return undefined;
    }
    if (opDecorators.length > 1) {
      throw new GenerateMetadataError(`Only one OperationId decorator allowed in '${this.getCurrentLocation()}' method.`);
    }

    const values = getDecoratorValues(opDecorators[0], this.current.typeChecker);
    return values && values[0];
  }

  private getTags() {
    const tagsDecorators = this.getDecoratorsByIdentifier(this.node, 'Tags');
    if (!tagsDecorators || !tagsDecorators.length) {
      return this.parentTags;
    }
    if (tagsDecorators.length > 1) {
      throw new GenerateMetadataError(`Only one Tags decorator allowed in '${this.getCurrentLocation()}' method.`);
    }

    const tags = getDecoratorValues(tagsDecorators[0], this.current.typeChecker);
    if (tags && this.parentTags) {
      tags.push(...this.parentTags);
    }
    return tags;
  }

  private getSecurity(): Tsoa.Security[] {
    const noSecurityDecorators = this.getDecoratorsByIdentifier(this.node, 'NoSecurity');
    const securityDecorators = this.getDecoratorsByIdentifier(this.node, 'Security');

    if (noSecurityDecorators?.length > 1) {
      throw new GenerateMetadataError(`Only one NoSecurity decorator allowed in '${this.getCurrentLocation()}' method.`);
    }

    if (noSecurityDecorators?.length && securityDecorators?.length) {
      throw new GenerateMetadataError(`NoSecurity decorator cannot be used in conjunction with Security decorator in '${this.getCurrentLocation()}' method.`);
    }

    if (noSecurityDecorators?.length) {
      return [];
    }

    if (!securityDecorators || !securityDecorators.length) {
      return this.parentSecurity || [];
    }

    return securityDecorators.map(d => getSecurites(d, this.current.typeChecker));
  }

  private getIsHidden() {
    const hiddenDecorators = this.getDecoratorsByIdentifier(this.node, 'Hidden');
    if (!hiddenDecorators || !hiddenDecorators.length) {
      return !!this.isParentHidden;
    }

    if (this.isParentHidden) {
      throw new GenerateMetadataError(`Hidden decorator cannot be set on '${this.getCurrentLocation()}' it is already defined on the controller`);
    }

    if (hiddenDecorators.length > 1) {
      throw new GenerateMetadataError(`Only one Hidden decorator allowed in '${this.getCurrentLocation()}' method.`);
    }

    return true;
  }

  private getDecoratorsByIdentifier(node: ts.Node, id: string) {
    return getDecorators(node, identifier => identifier.text === id);
  }
}
