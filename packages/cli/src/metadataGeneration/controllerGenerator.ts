import { getDecorators, getDecoratorValues, getProduces, getSecurites } from './../utils/decoratorUtils';
import { GenerateMetadataError } from './exceptions';
import { MetadataGenerator } from './metadataGenerator';
import { MethodGenerator } from './methodGenerator';
import { TypeResolver } from './typeResolver';
import { Tsoa } from '@tsoa/runtime';
import { getHeaderType } from '../utils/headerTypeHelpers';
import { isMethodDeclaration, map, type ClassDeclaration, type CallExpression, type Op, type StringLiteral } from '../ts';

export class ControllerGenerator {
  private readonly path?: string;
  private readonly tags?: string[];
  private security?: Tsoa.Security[];
  private readonly isHidden?: boolean;
  private commonResponses: Tsoa.Response[] = [];
  private produces?: string[];

  private constructor(
    private readonly node: ClassDeclaration,
    private readonly current: MetadataGenerator,
    private readonly parentSecurity: Tsoa.Security[] = [],
  ) {
    this.path = this.getPath();
    this.tags = this.getTags();
    this.isHidden = this.getIsHidden();
  }

  public static *create(node: ClassDeclaration, current: MetadataGenerator, parentSecurity: Tsoa.Security[] = []): Op<ControllerGenerator> {
    const generator = new ControllerGenerator(node, current, parentSecurity);
    generator.security = yield* generator.getSecurity();
    generator.commonResponses = yield* generator.getCommonResponses();
    generator.produces = yield* generator.getProduces();
    return generator;
  }

  public IsValid() {
    return !!this.path || this.path === '';
  }

  public *Generate(): Op<Tsoa.Controller> {
    if (!this.node.parent) {
      throw new GenerateMetadataError("Controller node doesn't have a valid parent source file.");
    }
    if (!this.node.name) {
      throw new GenerateMetadataError("Controller node doesn't have a valid name.");
    }

    const sourceFile = this.node.parent.getSourceFile();

    return {
      location: sourceFile.fileName,
      methods: yield* this.buildMethods(),
      name: this.node.name.text,
      path: this.path || '',
      produces: this.produces,
    };
  }

  private *buildMethods(): Op<Tsoa.Method[]> {
    const generators = yield* map(this.node.members.filter(isMethodDeclaration), m =>
      MethodGenerator.create(m, this.current, this.commonResponses, this.path, this.tags, this.security, this.isHidden),
    );
    return yield* map(
      generators.filter(generator => generator.IsValid()),
      generator => generator.Generate(),
    );
  }

  private getPath() {
    const decorators = getDecorators(this.node, identifier => identifier.text === 'Route');
    if (!decorators || !decorators.length) {
      return;
    }
    if (decorators.length > 1) {
      throw new GenerateMetadataError(`Only one Route decorator allowed in '${this.node.name!.text}' class.`);
    }

    const decorator = decorators[0];
    const expression = decorator.parent as CallExpression;
    const decoratorArgument = expression.arguments[0] as StringLiteral;
    return decoratorArgument ? `${decoratorArgument.text}` : '';
  }

  private *getCommonResponses(): Op<Tsoa.Response[]> {
    const decorators = getDecorators(this.node, identifier => identifier.text === 'Response');
    if (!decorators || !decorators.length) {
      return [];
    }

    return yield* map(
      decorators,
      function* (this: ControllerGenerator, decorator: (typeof decorators)[number]): Op<Tsoa.Response> {
        const expression = decorator.parent as CallExpression;

        const [name, description, example] = yield* getDecoratorValues(decorator, this.current.typeChecker);
        if (!name) {
          throw new GenerateMetadataError(`Controller's responses should have an explicit name.`);
        }

        return {
          description: description || '',
          examples: example === undefined ? undefined : [example],
          name,
          schema: expression.typeArguments && expression.typeArguments.length > 0 && !this.isHidden ? yield* new TypeResolver(expression.typeArguments[0], this.current).resolve() : undefined,
          headers: yield* getHeaderType(expression.typeArguments, 1, this.current),
        };
      }.bind(this),
    );
  }

  private getTags() {
    const decorators = getDecorators(this.node, identifier => identifier.text === 'Tags');
    if (!decorators || !decorators.length) {
      return;
    }
    if (decorators.length > 1) {
      throw new GenerateMetadataError(`Only one Tags decorator allowed in '${this.node.name!.text}' class.`);
    }

    const decorator = decorators[0];
    const expression = decorator.parent as CallExpression;

    return expression.arguments.map((a: any) => a.text as string);
  }

  private *getSecurity(): Op<Tsoa.Security[]> {
    const noSecurityDecorators = getDecorators(this.node, identifier => identifier.text === 'NoSecurity');
    const securityDecorators = getDecorators(this.node, identifier => identifier.text === 'Security');

    if (noSecurityDecorators?.length && securityDecorators?.length) {
      throw new GenerateMetadataError(`NoSecurity decorator cannot be used in conjunction with Security decorator in '${this.node.name!.text}' class.`);
    }

    if (noSecurityDecorators?.length) {
      return [];
    }

    if (!securityDecorators || !securityDecorators.length) {
      return this.parentSecurity;
    }

    return yield* map(securityDecorators, d => getSecurites(d, this.current.typeChecker));
  }

  private getIsHidden(): boolean {
    const hiddenDecorators = getDecorators(this.node, identifier => identifier.text === 'Hidden');
    if (!hiddenDecorators || !hiddenDecorators.length) {
      return false;
    }
    if (hiddenDecorators.length > 1) {
      throw new GenerateMetadataError(`Only one Hidden decorator allowed in '${this.node.name!.text}' class.`);
    }

    return true;
  }

  private *getProduces(): Op<string[] | undefined> {
    const produces = yield* getProduces(this.node, this.current.typeChecker);
    return produces.length ? produces : undefined;
  }
}
