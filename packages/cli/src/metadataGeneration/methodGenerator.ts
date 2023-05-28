import * as ts from 'typescript';
import * as path from 'path';
import { isVoidType } from '../utils/isVoidType';
import { getDecorators, getDecoratorValues, getPath, getProduces, getSecurites } from './../utils/decoratorUtils';
import { getJSDocComment, getJSDocDescription, isExistJSDocTag } from './../utils/jsDocUtils';
import { getExtensions } from './extension';
import { GenerateMetadataError } from './exceptions';
import { MetadataGenerator } from './metadataGenerator';
import { ParameterGenerator } from './parameterGenerator';

import { Tsoa } from '@tsoa/runtime';
import { TypeResolver } from './typeResolver';
import { getHeaderType } from '../utils/headerTypeHelpers';

type HttpMethod = 'options' | 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head';

export class MethodGenerator {
  protected method?: HttpMethod;
  protected path?: string;
  private produces?: string[];
  private consumes?: string;

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

  public IsValid(): this is { method: HttpMethod; path: string } {
    return this.method !== undefined && this.path !== undefined;
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
      produces: this.produces,
      consumes: this.consumes,
      responses,
      successStatus,
      security: this.getSecurity(),
      summary: getJSDocComment(this.node, 'summary'),
      tags: this.getTags(),
      type,
    };
  }

  private buildParameters() {
    if (!this.IsValid()) {
      throw new GenerateMetadataError("This isn't a valid a controller method.");
    }

    const fullPath = path.join(this.parentPath || '', this.path);
    const method = this.method;
    const parameters = this.node.parameters
      .map(p => {
        try {
          return new ParameterGenerator(p, method, fullPath, this.current).Generate();
        } catch (e) {
          const methodId = this.node.name as ts.Identifier;
          const controllerId = (this.node.parent as ts.ClassDeclaration).name as ts.Identifier;
          const message = e instanceof Error ? e.message : String(e);
          throw new GenerateMetadataError(`${message} \n in '${controllerId.text}.${methodId.text}'`);
        }
      })
      .reduce((flattened, params) => [...flattened, ...params], []);

    this.validateBodyParameters(parameters);
    this.validateQueryParameters(parameters);

    return parameters;
  }

  private validateBodyParameters(parameters: Tsoa.Parameter[]) {
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
  }

  private validateQueryParameters(parameters: Tsoa.Parameter[]) {
    const queryParameters = parameters.filter(p => p.in === 'query');
    const queriesParameters = parameters.filter(p => p.in === 'queries');

    if (queriesParameters.length > 1) {
      throw new GenerateMetadataError(`Only one queries parameter allowed in '${this.getCurrentLocation()}' method.`);
    }
    if (queriesParameters.length > 0 && queryParameters.length > 0) {
      throw new GenerateMetadataError(`Choose either during @Query or @Queries in '${this.getCurrentLocation()}' method.`);
    }
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

    this.method = decorator.text.toLowerCase() as any;
    // if you don't pass in a path to the method decorator, we'll just use the base route
    // todo: what if someone has multiple no argument methods of the same type in a single controller?
    // we need to throw an error there
    this.path = getPath(decorator, this.current.typeChecker);
    this.produces = this.getProduces();
    this.consumes = this.getConsumes();
  }

  private getProduces(): string[] | undefined {
    const produces = getProduces(this.node, this.current.typeChecker);
    return produces.length ? produces : undefined;
  }

  private getConsumes(): string | undefined {
    const consumesDecorators = this.getDecoratorsByIdentifier(this.node, 'Consumes');

    if (!consumesDecorators || !consumesDecorators.length) {
      return;
    }
    if (consumesDecorators.length > 1) {
      throw new GenerateMetadataError(`Only one Consumes decorator in '${this.getCurrentLocation()}' method, Found: ${consumesDecorators.map(d => d.text).join(', ')}`);
    }

    const [decorator] = consumesDecorators;
    const [consumes] = getDecoratorValues(decorator, this.current.typeChecker);
    return consumes;
  }

  private getMethodResponses(): Tsoa.Response[] {
    const decorators = this.getDecoratorsByIdentifier(this.node, 'Response');
    if (!decorators || !decorators.length) {
      return [];
    }

    return decorators.map(decorator => {
      const [name, description, example, produces] = getDecoratorValues(decorator, this.current.typeChecker);

      return {
        description: description || '',
        examples: example === undefined ? undefined : [example],
        name: name || '200',
        produces: this.getProducesAdapter(produces),
        schema: this.getSchemaFromDecorator(decorator, 0),
        headers: this.getHeadersFromDecorator(decorator, 1),
      } as Tsoa.Response;
    });
  }

  private getMethodSuccessResponse(type: Tsoa.Type): { response: Tsoa.Response; status?: number } {
    const decorators = this.getDecoratorsByIdentifier(this.node, 'SuccessResponse');
    const examplesWithLabels = this.getMethodSuccessExamples();

    if (!decorators || !decorators.length) {
      const returnsDescription = getJSDocComment(this.node, 'returns') || 'Ok';
      return {
        response: {
          description: isVoidType(type) ? 'No content' : returnsDescription,
          examples: examplesWithLabels?.map(ex => ex.example),
          exampleLabels: examplesWithLabels?.map(ex => ex.label),
          name: isVoidType(type) ? '204' : '200',
          produces: this.produces,
          schema: type,
        },
      };
    }
    if (decorators.length > 1) {
      throw new GenerateMetadataError(`Only one SuccessResponse decorator allowed in '${this.getCurrentLocation()}' method.`);
    }

    const [firstDecorator] = decorators;
    const [name, description, produces] = getDecoratorValues(firstDecorator, this.current.typeChecker);
    const headers = this.getHeadersFromDecorator(firstDecorator, 0);

    return {
      response: {
        description: description || '',
        examples: examplesWithLabels?.map(ex => ex.example),
        exampleLabels: examplesWithLabels?.map(ex => ex.label),
        name: name || '200',
        produces: this.getProducesAdapter(produces),
        schema: type,
        headers,
      },
      status: name && /^\d+$/.test(name) ? parseInt(name, 10) : undefined,
    };
  }

  private getHeadersFromDecorator({ parent: expression }: ts.Identifier, headersIndex: number) {
    if (!ts.isCallExpression(expression)) {
      return undefined;
    }
    return getHeaderType(expression.typeArguments, headersIndex, this.current);
  }

  private getSchemaFromDecorator({ parent: expression }: ts.Identifier, schemaIndex: number): Tsoa.Type | undefined {
    if (!ts.isCallExpression(expression) || !expression.typeArguments?.length) {
      return undefined;
    }
    return new TypeResolver(expression.typeArguments[schemaIndex], this.current).resolve();
  }

  private getMethodSuccessExamples() {
    const exampleDecorators = this.getDecoratorsByIdentifier(this.node, 'Example');
    if (!exampleDecorators || !exampleDecorators.length) {
      return undefined;
    }

    const examples = exampleDecorators.map(exampleDecorator => {
      const [example, label] = getDecoratorValues(exampleDecorator, this.current.typeChecker);
      return { example, label };
    });

    return examples || undefined;
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

  private getProducesAdapter(produces?: string[] | string): string[] | undefined {
    if (Array.isArray(produces)) {
      return produces;
    } else if (typeof produces === 'string') {
      return [produces];
    }
    return;
  }
}
