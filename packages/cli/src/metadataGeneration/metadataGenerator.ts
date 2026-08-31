import { Config, Tsoa } from '@tsoa/runtime';
import { minimatch } from 'minimatch';
import {
  createProgram,
  forEachChild,
  isClassDeclaration,
  isEnumDeclaration,
  isInterfaceDeclaration,
  isModuleBlock,
  isModuleDeclaration,
  isTypeAliasDeclaration,
  type ClassDeclaration,
  type CompilerOptions,
  type EnumDeclaration,
  type InterfaceDeclaration,
  type Node,
  type Program,
  type TypeAliasDeclaration,
  type TypeChecker,
} from 'typescript';
import { getDecorators } from '../utils/decoratorUtils';
import { isExistJSDocTag } from '../utils/jsDocUtils';
import { importClassesFromDirectories } from '../utils/importClassesFromDirectories';
import { ControllerGenerator } from './controllerGenerator';
import { GenerateMetadataError } from './exceptions';
import { ModelDefinitionIdentity, type ModelDefinitionPosition } from './modelDefinitionIdentity';
import { TypeResolver } from './typeResolver';

export type DesignatedModelDeclaration = InterfaceDeclaration | ClassDeclaration | TypeAliasDeclaration | EnumDeclaration;

export class MetadataGenerator {
  public readonly controllerNodes = new Array<ClassDeclaration>();
  public readonly typeChecker: TypeChecker;
  private readonly program: Program;
  private readonly modelDefinitionIdentity = new ModelDefinitionIdentity();
  private referenceTypeMap: Tsoa.ReferenceTypeMap = {};
  private modelDefinitionPosMap: { [name: string]: ModelDefinitionPosition[] } = {};
  private expressionOrigNameMap: Record<string, string> = {};
  private designatedModelIndex?: Map<string, DesignatedModelDeclaration[]>;

  constructor(
    entryFile: string,
    private readonly compilerOptions?: CompilerOptions,
    private readonly ignorePaths?: string[],
    controllers?: string[],
    private readonly rootSecurity: Tsoa.Security[] = [],
    public readonly defaultNumberType: NonNullable<Config['defaultNumberType']> = 'double',
    esm = false,
  ) {
    TypeResolver.clearCache();
    this.program = controllers ? this.setProgramToDynamicControllersFiles(controllers, esm) : createProgram([entryFile], compilerOptions || {});
    this.typeChecker = this.program.getTypeChecker();
  }

  public Generate(): Tsoa.Metadata {
    this.extractNodeFromProgramSourceFiles();

    const controllers = this.buildControllers();

    this.checkForMethodSignatureDuplicates(controllers);
    this.checkForPathParamSignatureDuplicates(controllers);

    return {
      controllers,
      referenceTypeMap: this.referenceTypeMap,
    };
  }

  private setProgramToDynamicControllersFiles(controllers: string[], esm: boolean) {
    const allGlobFiles = importClassesFromDirectories(controllers, esm ? ['.mts', '.ts', '.cts'] : ['.ts']);
    if (allGlobFiles.length === 0) {
      throw new GenerateMetadataError(`[${controllers.join(', ')}] globs found 0 controllers.`);
    }

    return createProgram(allGlobFiles, this.compilerOptions || {});
  }

  private extractNodeFromProgramSourceFiles() {
    this.program.getSourceFiles().forEach(sf => {
      if (this.ignorePaths && this.ignorePaths.length) {
        for (const path of this.ignorePaths) {
          if (minimatch(sf.fileName, path)) {
            return;
          }
        }
      }

      forEachChild(sf, node => {
        if (isClassDeclaration(node) && getDecorators(node, identifier => identifier.text === 'Route').length) {
          this.controllerNodes.push(node);
        }
      });
    });
  }

  private checkForMethodSignatureDuplicates = (controllers: Tsoa.Controller[]) => {
    const map: Tsoa.MethodsSignatureMap = {};
    controllers.forEach(controller => {
      controller.methods.forEach(method => {
        const signature = method.path ? `@${method.method}(${controller.path}/${method.path})` : `@${method.method}(${controller.path})`;
        const methodDescription = `${controller.name}#${method.name}`;

        if (map[signature]) {
          map[signature].push(methodDescription);
        } else {
          map[signature] = [methodDescription];
        }
      });
    });

    let message = '';
    Object.keys(map).forEach(signature => {
      const controllers = map[signature];
      if (controllers.length > 1) {
        message += `Duplicate method signature ${signature} found in controllers: ${controllers.join(', ')}\n`;
      }
    });

    if (message) {
      throw new GenerateMetadataError(message);
    }
  };

  private checkForPathParamSignatureDuplicates = (controllers: Tsoa.Controller[]) => {
    const paramRegExp = new RegExp('{(\\w*)}|:(\\w+)', 'g');
    type RouteCollision = {
      type: PathDuplicationType;
      method: Tsoa.Method;
      controller: Tsoa.Controller;
      collidesWith: Tsoa.Method[];
    };

    enum PathDuplicationType {
      FULL, // Fully duplicate.
      PARTIAL, // Collides, check order or fix route
    }

    const collisions: RouteCollision[] = [];

    function addCollision(type: PathDuplicationType, method: Tsoa.Method, controller: Tsoa.Controller, collidesWith: Tsoa.Method) {
      let existingCollision = collisions.find(collision => collision.type === type && collision.method === method && collision.controller === controller);
      if (!existingCollision) {
        existingCollision = {
          type,
          method,
          controller,
          collidesWith: [],
        };
        collisions.push(existingCollision);
      }

      existingCollision.collidesWith.push(collidesWith);
    }

    controllers.forEach(controller => {
      const methodRouteGroup: {
        [key: string]: Array<{
          path: string;
          method: Tsoa.Method;
        }>;
      } = {};
      // Group all ts methods with HTTP method decorator into same object in same controller.
      controller.methods.forEach(method => {
        if (methodRouteGroup[method.method] === undefined) {
          methodRouteGroup[method.method] = [];
        }

        const params = method.path.match(paramRegExp);

        methodRouteGroup[method.method].push({
          method, // method.name + ": " + method.path) as any,
          path:
            params?.reduce((s, a) => {
              // replace all params with {} placeholder for comparison
              return s.replace(a, '{}');
            }, method.path) || method.path,
        });
      });

      Object.keys(methodRouteGroup).forEach((key: string) => {
        const methodRoutes = methodRouteGroup[key];

        // check each route with the routes that are defined before it
        for (let i = 0; i < methodRoutes.length; i += 1) {
          for (let j = 0; j < i; j += 1) {
            if (methodRoutes[i].path === methodRoutes[j].path) {
              // full match
              addCollision(PathDuplicationType.FULL, methodRoutes[i].method, controller, methodRoutes[j].method);
            } else if (
              methodRoutes[i].path.split('/').length === methodRoutes[j].path.split('/').length &&
              methodRoutes[j].path
                .substr(methodRoutes[j].path.lastIndexOf('/')) // compare only the "last" part of the path
                .split('/')
                .some(v => !!v) && // ensure the comparison path has a value
              methodRoutes[i].path.split('/').every((v, index) => {
                const comparisonPathPart = methodRoutes[j].path.split('/')[index];
                // if no params, compare values
                if (!v.includes('{}')) {
                  return v === comparisonPathPart;
                }
                // otherwise check if route starts with comparison route
                return v.startsWith(methodRoutes[j].path.split('/')[index]);
              })
            ) {
              // partial match - reorder routes!
              addCollision(PathDuplicationType.PARTIAL, methodRoutes[i].method, controller, methodRoutes[j].method);
            }
          }
        }
      });
    });

    // print warnings for each collision (grouped by route)
    collisions.forEach(collision => {
      let message = '';
      if (collision.type === PathDuplicationType.FULL) {
        message = `Duplicate path parameter definition signature found in controller `;
      } else if (collision.type === PathDuplicationType.PARTIAL) {
        message = `Overlapping path parameter definition signature found in controller `;
      }
      message += collision.controller.name;
      message += ` [ method ${collision.method.method.toUpperCase()} ${collision.method.name} route: ${collision.method.path} ] collides with `;
      message += collision.collidesWith
        .map((method: Tsoa.Method) => {
          return `[ method ${method.method.toUpperCase()} ${method.name} route: ${method.path} ]`;
        })
        .join(', ');

      message += '\n';
      console.warn(message);
    });
  };

  public TypeChecker() {
    return this.typeChecker;
  }

  public AddReferenceType(referenceType: Tsoa.ReferenceType) {
    if (!referenceType.refName) {
      throw new Error('no reference type name found');
    }
    this.referenceTypeMap[referenceType.refName] = referenceType;
  }

  public GetReferenceType(refName: string) {
    return this.referenceTypeMap[refName];
  }

  public CheckModelUnicity(refName: string, positions: ModelDefinitionPosition[]) {
    if (!this.modelDefinitionPosMap[refName]) {
      this.modelDefinitionPosMap[refName] = positions;
    } else {
      const origPositions = this.modelDefinitionPosMap[refName];
      if (!(origPositions.length === positions.length && positions.every(pos => origPositions.find(origPos => this.modelDefinitionIdentity.areDefinitionsEquivalent(pos, origPos))))) {
        const printable = (definitionPositions: ModelDefinitionPosition[]) => JSON.stringify(definitionPositions.map(({ fileName, pos }) => ({ fileName, pos })));
        if (this.GetDesignatedModels(refName).length > 1) {
          throw new GenerateMetadataError(`Multiple models for ${refName} marked with '@tsoaModel'; '@tsoaModel' should only be applied to one model.`);
        }
        throw new Error(
          `Found 2 different model definitions for model ${refName}: orig: ${printable(origPositions)}, act: ${printable(positions)}. ` +
            `If both definitions describe the same model, mark the canonical declaration with a '@tsoaModel' JSDoc tag; otherwise rename one of the types to resolve the collision.`,
        );
      }
    }
  }

  /**
   * Returns the declarations marked with '@tsoaModel' for the given type name anywhere in the
   * program. Such a declaration is the canonical model for that name: same-named declarations in
   * other files resolve to it instead of raising a model definition conflict. Designations that
   * are the same logical declaration reached through different files (e.g. a marked source file
   * whose built declaration file, which keeps the JSDoc, is also in the program) are deduplicated.
   */
  public GetDesignatedModels(typeName: string): DesignatedModelDeclaration[] {
    if (!this.designatedModelIndex) {
      this.designatedModelIndex = this.buildDesignatedModelIndex();
    }
    const designated = this.designatedModelIndex.get(typeName);
    if (!designated) {
      return [];
    }
    return designated.filter(
      (declaration, index) => !designated.slice(0, index).some(other => this.modelDefinitionIdentity.areDefinitionsEquivalent(toDefinitionPosition(declaration), toDefinitionPosition(other))),
    );
  }

  private buildDesignatedModelIndex(): Map<string, DesignatedModelDeclaration[]> {
    const index = new Map<string, DesignatedModelDeclaration[]>();
    const visit = (node: Node) => {
      if (
        (isInterfaceDeclaration(node) || isClassDeclaration(node) || isTypeAliasDeclaration(node) || isEnumDeclaration(node)) &&
        node.name &&
        isExistJSDocTag(node, tag => tag.tagName.text === 'tsoaModel')
      ) {
        const declarations = index.get(node.name.text) || [];
        declarations.push(node);
        index.set(node.name.text, declarations);
      } else if (isModuleDeclaration(node) || isModuleBlock(node)) {
        forEachChild(node, visit);
      }
    };
    for (const sourceFile of this.program.getSourceFiles()) {
      if (!sourceFile.text.includes('@tsoaModel')) {
        continue;
      }
      forEachChild(sourceFile, visit);
    }
    return index;
  }

  public CheckExpressionUnicity(formattedRefName: string, refName: string) {
    if (!this.expressionOrigNameMap[formattedRefName]) {
      this.expressionOrigNameMap[formattedRefName] = refName;
    } else {
      if (this.expressionOrigNameMap[formattedRefName] !== refName) {
        throw new Error(`Found 2 different type expressions for formatted name "${formattedRefName}": orig: "${this.expressionOrigNameMap[formattedRefName]}", act: "${refName}"`);
      }
    }
  }

  private buildControllers() {
    if (this.controllerNodes.length === 0) {
      throw new Error('no controllers found, check tsoa configuration');
    }
    return this.controllerNodes
      .map(classDeclaration => new ControllerGenerator(classDeclaration, this, this.rootSecurity))
      .filter(generator => generator.IsValid())
      .map(generator => generator.Generate());
  }
}

function toDefinitionPosition(declaration: DesignatedModelDeclaration): ModelDefinitionPosition {
  return { fileName: declaration.getSourceFile().fileName, pos: declaration.pos, declaration };
}
