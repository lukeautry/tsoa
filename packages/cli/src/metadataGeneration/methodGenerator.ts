import * as ts from '../ts';
import { printType } from './syntheticChildType';
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

  private constructor(
    private readonly node: ts.MethodDeclaration,
    private readonly current: MetadataGenerator,
    private readonly commonResponses: Tsoa.Response[],
    private readonly parentPath?: string,
    private readonly parentTags?: string[],
    private readonly parentSecurity?: Tsoa.Security[],
    private readonly isParentHidden?: boolean,
  ) {}

  public static *create(
    node: ts.MethodDeclaration,
    current: MetadataGenerator,
    commonResponses: Tsoa.Response[],
    parentPath?: string,
    parentTags?: string[],
    parentSecurity?: Tsoa.Security[],
    isParentHidden?: boolean,
  ): ts.Op<MethodGenerator> {
    const generator = new MethodGenerator(node, current, commonResponses, parentPath, parentTags, parentSecurity, isParentHidden);
    yield* generator.processMethodDecorators();
    return generator;
  }

  public IsValid(): this is { method: HttpMethod; path: string } {
    return this.method !== undefined && this.path !== undefined;
  }

  public *Generate(): ts.Op<Tsoa.Method> {
    if (!this.IsValid()) {
      throw new GenerateMetadataError("This isn't a valid a controller method.");
    }

    let nodeType = this.node.type;
    if (!nodeType) {
      const typeChecker = this.current.typeChecker;
      const signature = yield* typeChecker.getSignatureFromDeclaration.gen(this.node);
      const implicitType = yield* typeChecker.getReturnTypeOfSignature.gen(signature);
      nodeType = (yield* printType(typeChecker, implicitType))!;
    }
    const type = yield* new TypeResolver(nodeType, this.current).resolve();
    const responses = this.commonResponses.concat(yield* this.getMethodResponses());
    const { response: successResponse, status: successStatus } = yield* this.getMethodSuccessResponse(type);
    responses.push(successResponse);
    const parameters = yield* this.buildParameters();
    const additionalResponses = parameters.filter((p): p is Tsoa.ResParameter => p.in === 'res');
    responses.push(...additionalResponses);

    return {
      extensions: yield* this.getExtensions(),
      deprecated: this.getIsDeprecated(),
      description: getJSDocDescription(this.node),
      isHidden: this.getIsHidden(),
      method: this.method,
      name: (this.node.name as ts.Identifier).text,
      operationId: yield* this.getOperationId(),
      parameters,
      path: this.path,
      produces: this.produces,
      consumes: this.consumes ?? (parameters.some(p => p.in === 'body' && p.type.dataType === 'binary') ? 'application/octet-stream' : undefined),
      responses,
      successStatus,
      security: yield* this.getSecurity(),
      summary: getJSDocComment(this.node, 'summary'),
      tags: yield* this.getTags(),
      type,
    };
  }

  private *buildParameters(): ts.Op<Tsoa.Parameter[]> {
    if (!this.IsValid()) {
      throw new GenerateMetadataError("This isn't a valid a controller method.");
    }

    const fullPath = path.join(this.parentPath || '', this.path);
    const method = this.method;
    const parameterLists = yield* ts.map(
      this.node.parameters,
      function* (this: MethodGenerator, p: ts.ParameterDeclaration): ts.Op<Tsoa.Parameter[]> {
        try {
          return yield* new ParameterGenerator(p, method, fullPath, this.current).Generate();
        } catch (e) {
          const methodId = this.node.name as ts.Identifier;
          const controllerId = (this.node.parent as ts.ClassDeclaration).name as ts.Identifier;
          const message = e instanceof Error ? e.message : String(e);
          throw new GenerateMetadataError(`${message} \n in '${controllerId.text}.${methodId.text}'`);
        }
      }.bind(this),
    );
    const parameters = parameterLists.reduce((flattened, params) => [...flattened, ...params], []);

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

  private *getExtensions(): ts.Op<Tsoa.Extension[]> {
    const extensionDecorators = this.getDecoratorsByIdentifier(this.node, 'Extension');
    if (!extensionDecorators || !extensionDecorators.length) {
      return [];
    }
    return yield* getExtensions(extensionDecorators, this.current);
  }

  private getCurrentLocation() {
    const methodId = this.node.name as ts.Identifier;
    const controllerId = (this.node.parent as ts.ClassDeclaration).name as ts.Identifier;
    return `${controllerId.text}.${methodId.text}`;
  }

  private *processMethodDecorators(): ts.Op<void> {
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
    this.path = yield* getPath(decorator, this.current.typeChecker);
    this.produces = yield* this.getProduces();
    this.consumes = yield* this.getConsumes();
  }

  private *getProduces(): ts.Op<string[] | undefined> {
    const produces = yield* getProduces(this.node, this.current.typeChecker);
    return produces.length ? produces : undefined;
  }

  private *getConsumes(): ts.Op<string | undefined> {
    const consumesDecorators = this.getDecoratorsByIdentifier(this.node, 'Consumes');

    if (!consumesDecorators || !consumesDecorators.length) {
      return;
    }
    if (consumesDecorators.length > 1) {
      throw new GenerateMetadataError(`Only one Consumes decorator in '${this.getCurrentLocation()}' method, Found: ${consumesDecorators.map(d => d.text).join(', ')}`);
    }

    const [decorator] = consumesDecorators;
    const [consumes] = yield* getDecoratorValues(decorator, this.current.typeChecker);
    return consumes;
  }

  private *getMethodResponses(): ts.Op<Tsoa.Response[]> {
    const responseExamplesByName: Record<string, any> = {};
    const decorators = this.getDecoratorsByIdentifier(this.node, 'Response');
    if (!decorators || !decorators.length) {
      return [];
    }

    const resolved = yield* ts.map(
      decorators,
      function* (this: MethodGenerator, decorator: ts.Identifier) {
        const values = yield* getDecoratorValues(decorator, this.current.typeChecker);
        const schema = yield* this.getSchemaFromDecorator(decorator, 0);
        const headers = yield* this.getHeadersFromDecorator(decorator, 1);
        return { values, schema, headers };
      }.bind(this),
    );

    return resolved.map(({ values, schema, headers }) => {
      const [name, description, example, produces] = values;

      if (example !== undefined) {
        responseExamplesByName[name] = responseExamplesByName[name] ? [...responseExamplesByName[name], example] : [example];
      }

      return {
        description: description || '',
        examples: responseExamplesByName[name] || undefined,
        name: name || '200',
        produces: this.getProducesAdapter(produces),
        schema,
        headers,
      };
    });
  }

  private *getMethodSuccessResponse(type: Tsoa.Type): ts.Op<{ response: Tsoa.Response; status?: number }> {
    const decorators = this.getDecoratorsByIdentifier(this.node, 'SuccessResponse');
    const examplesWithLabels = yield* this.getMethodSuccessExamples();

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
    const [name, description, produces] = yield* getDecoratorValues(firstDecorator, this.current.typeChecker);
    const headers = yield* this.getHeadersFromDecorator(firstDecorator, 0);

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

  private *getHeadersFromDecorator({ parent: expression }: ts.Identifier, headersIndex: number): ts.Op<Tsoa.HeaderType | undefined> {
    if (!ts.isCallExpression(expression)) {
      return undefined;
    }
    return yield* getHeaderType(expression.typeArguments, headersIndex, this.current);
  }

  private *getSchemaFromDecorator({ parent: expression }: ts.Identifier, schemaIndex: number): ts.Op<Tsoa.Type | undefined> {
    if (!ts.isCallExpression(expression) || !expression.typeArguments?.length) {
      return undefined;
    }
    return yield* new TypeResolver(expression.typeArguments[schemaIndex], this.current).resolve();
  }

  private *getMethodSuccessExamples(): ts.Op<Array<{ example: any; label: any }> | undefined> {
    const exampleDecorators = this.getDecoratorsByIdentifier(this.node, 'Example');
    if (!exampleDecorators || !exampleDecorators.length) {
      return undefined;
    }

    const examples = yield* ts.map(
      exampleDecorators,
      function* (this: MethodGenerator, exampleDecorator: ts.Identifier) {
        const [example, label] = yield* getDecoratorValues(exampleDecorator, this.current.typeChecker);
        return { example, label };
      }.bind(this),
    );

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

  private *getOperationId(): ts.Op<string | undefined> {
    const opDecorators = this.getDecoratorsByIdentifier(this.node, 'OperationId');
    if (!opDecorators || !opDecorators.length) {
      return undefined;
    }
    if (opDecorators.length > 1) {
      throw new GenerateMetadataError(`Only one OperationId decorator allowed in '${this.getCurrentLocation()}' method.`);
    }

    const values = yield* getDecoratorValues(opDecorators[0], this.current.typeChecker);
    return values && values[0];
  }

  private *getTags(): ts.Op<string[] | undefined> {
    const tagsDecorators = this.getDecoratorsByIdentifier(this.node, 'Tags');
    if (!tagsDecorators || !tagsDecorators.length) {
      return this.parentTags;
    }
    if (tagsDecorators.length > 1) {
      throw new GenerateMetadataError(`Only one Tags decorator allowed in '${this.getCurrentLocation()}' method.`);
    }

    const tags = yield* getDecoratorValues(tagsDecorators[0], this.current.typeChecker);
    if (tags && this.parentTags) {
      tags.push(...this.parentTags);
    }
    return tags;
  }

  private *getSecurity(): ts.Op<Tsoa.Security[]> {
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

    return yield* ts.map(securityDecorators, d => getSecurites(d, this.current.typeChecker));
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
