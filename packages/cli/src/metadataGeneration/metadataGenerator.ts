import { Config, Tsoa } from '@tsoa/runtime';
import { minimatch } from 'minimatch';
import { getApi, isClassDeclaration, map, run, type ClassDeclaration, type CompilerOptions, type Program, type Checker, type Op, type SourceFile } from '../ts';
import { getDecorators } from '../utils/decoratorUtils';
import { importClassesFromDirectories } from '../utils/importClassesFromDirectories';
import { ControllerGenerator } from './controllerGenerator';
import { GenerateMetadataError } from './exceptions';
import { TypeResolver } from './typeResolver';

const controllersPerBatch = Number(process.env.TSOA_CONTROLLERS_PER_BATCH) || 10;

export class MetadataGenerator {
  public readonly controllerNodes = new Array<ClassDeclaration>();
  public readonly typeChecker: Checker;
  private readonly program: Program;
  private referenceTypeMap: Tsoa.ReferenceTypeMap = {};
  private modelDefinitionPosMap: { [name: string]: Array<{ fileName: string; pos: number }> } = {};
  private expressionOrigNameMap: Record<string, string> = {};
  private readonly compilerOptions: CompilerOptions;

  constructor(
    entryFile: string,
    compilerOptions?: CompilerOptions,
    private readonly ignorePaths?: string[],
    controllers?: string[],
    private readonly rootSecurity: Tsoa.Security[] = [],
    public readonly defaultNumberType: NonNullable<Config['defaultNumberType']> = 'double',
    esm = false,
  ) {
    TypeResolver.clearCache();
    this.compilerOptions = { ...compilerOptions, strictNullChecks: compilerOptions?.strictNullChecks ?? compilerOptions?.strict ?? false };
    this.program = getApi().createProgram(controllers ? this.getDynamicControllersFiles(controllers, esm) : [entryFile], this.compilerOptions);
    this.typeChecker = this.program.getProject().checker;
  }

  public Generate(): Tsoa.Metadata {
    try {
      run(this.extractNodeFromProgramSourceFiles());

      const controllers = this.buildControllers();
      this.checkForMethodSignatureDuplicates(controllers);
      this.checkForPathParamSignatureDuplicates(controllers);

      return {
        controllers,
        referenceTypeMap: this.referenceTypeMap,
      };
    } finally {
      this.program.dispose();
    }
  }

  private getDynamicControllersFiles(controllers: string[], esm: boolean) {
    const allGlobFiles = importClassesFromDirectories(controllers, esm ? ['.mts', '.ts', '.cts'] : ['.ts']);
    if (allGlobFiles.length === 0) {
      throw new GenerateMetadataError(`[${controllers.join(', ')}] globs found 0 controllers.`);
    }

    return allGlobFiles;
  }

  private *extractNodeFromProgramSourceFiles(): Op<void> {
    // Declaration files cannot hold decorated classes, so they are not fetched from the compiler.
    const fileNames = (yield* this.program.getSourceFileNames.gen()).filter(fileName => !/\.d\.[cm]?ts$/.test(fileName) && !this.ignorePaths?.some(path => minimatch(fileName, path)));
    const sourceFiles = yield* map(fileNames, fileName => this.program.getSourceFile.gen(fileName));
    sourceFiles.forEach(sourceFile => {
      sourceFile?.forEachChild(node => {
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

  /** Whether a file is one of TypeScript's own library declaration files (`lib.*.d.ts`). */
  public *isDefaultLibraryFile(sourceFile: SourceFile): Op<boolean> {
    return yield* this.program.isSourceFileDefaultLibrary.gen(sourceFile);
  }

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

  public CheckModelUnicity(refName: string, positions: Array<{ fileName: string; pos: number }>) {
    if (!this.modelDefinitionPosMap[refName]) {
      this.modelDefinitionPosMap[refName] = positions;
    } else {
      const origPositions = this.modelDefinitionPosMap[refName];
      if (!(origPositions.length === positions.length && positions.every(pos => origPositions.find(origPos => pos.pos === origPos.pos && pos.fileName === origPos.fileName)))) {
        throw new Error(`Found 2 different model definitions for model ${refName}: orig: ${JSON.stringify(origPositions)}, act: ${JSON.stringify(positions)}`);
      }
    }
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

  private buildControllers(): Tsoa.Controller[] {
    if (this.controllerNodes.length === 0) {
      throw new Error('no controllers found, check tsoa configuration');
    }
    // Controllers run in batches: independent compiler calls of a batch share round trips, and the compiler
    // releases what a batch used before the next one starts.
    const controllers: Tsoa.Controller[] = [];
    for (let start = 0; start < this.controllerNodes.length; start += controllersPerBatch) {
      const batch = run(
        map(
          this.controllerNodes.slice(start, start + controllersPerBatch),
          function* (this: MetadataGenerator, classDeclaration: ClassDeclaration): Op<Tsoa.Controller | undefined> {
            const generator = yield* ControllerGenerator.create(classDeclaration, this, this.rootSecurity);
            return generator.IsValid() ? yield* generator.Generate() : undefined;
          }.bind(this),
        ),
      );
      controllers.push(...batch.filter((controller): controller is Tsoa.Controller => controller !== undefined));
    }
    return controllers;
  }
}
