import * as mm from 'minimatch';
import * as ts from 'typescript';
import { importClassesFromDirectories } from '../utils/importClassesFromDirectories';
import { ControllerGenerator } from './controllerGenerator';
import { GenerateMetadataError } from './exceptions';
import { Tsoa } from '@tsoa/runtime';
import { TypeResolver } from './typeResolver';

export class MetadataGenerator {
  public readonly nodes = new Array<ts.Node>();
  public readonly typeChecker: ts.TypeChecker;
  private readonly program: ts.Program;
  private referenceTypeMap: Tsoa.ReferenceTypeMap = {};
  private circularDependencyResolvers = new Array<(referenceTypes: Tsoa.ReferenceTypeMap) => void>();

  public IsExportedNode(_node: ts.Node) {
    return true;
  }

  constructor(entryFile: string, private readonly compilerOptions?: ts.CompilerOptions, private readonly ignorePaths?: string[], controllers?: string[]) {
    TypeResolver.clearCache();
    this.program = !!controllers ? this.setProgramToDynamicControllersFiles(controllers) : ts.createProgram([entryFile], compilerOptions || {});
    this.typeChecker = this.program.getTypeChecker();
  }

  public Generate(): Tsoa.Metadata {
    this.extractNodeFromProgramSourceFiles();

    const controllers = this.buildControllers();

    this.checkForMethodSignatureDuplicates(controllers);
    this.checkForPathParamSignatureDuplicates(controllers);
    this.circularDependencyResolvers.forEach(c => c(this.referenceTypeMap));

    return {
      controllers,
      referenceTypeMap: this.referenceTypeMap,
    };
  }

  private setProgramToDynamicControllersFiles(controllers: string[]) {
    const allGlobFiles = importClassesFromDirectories(controllers);
    if (allGlobFiles.length === 0) {
      throw new GenerateMetadataError(`[${controllers.join(', ')}] globs found 0 controllers.`);
    }

    return ts.createProgram(allGlobFiles, this.compilerOptions || {});
  }

  private extractNodeFromProgramSourceFiles() {
    this.program.getSourceFiles().forEach(sf => {
      if (this.ignorePaths && this.ignorePaths.length) {
        for (const path of this.ignorePaths) {
          if (mm(sf.fileName, path)) {
            return;
          }
        }
      }

      ts.forEachChild(sf, node => {
        /**
         * If we declare a namespace within a module, like we do in `tsoaTestModule.d.ts`,
         * we need to explicitly get the children of the module declaration
         * (`declare module 'tsoaTest'`) - which are the moduleBlock statements,
         * because otherwise our type resolver cannot iterate over namespaces defined in that module.
         */
        if (ts.isModuleDeclaration(node)) {
          /**
           * For some reason unknown to me, TS resolves both `declare module` and `namespace` to
           * the same kind (`ModuleDeclaration`). In order to figure out whether it's one or the other,
           * we check the node flags. They tell us whether it is a namespace or not.
           */
          // eslint-disable-next-line no-bitwise
          if ((node.flags & ts.NodeFlags.Namespace) === 0 && node.body && ts.isModuleBlock(node.body)) {
            node.body.statements.forEach(statement => {
              this.nodes.push(statement);
            });
            return;
          }
        }

        this.nodes.push(node);
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
    const isParamRegExp = new RegExp("{|}|:");
    const controllerDup: { [key: string]: { [key: string]: Tsoa.Method[] } } = {};
    let message = '';

    /**
     * @return 0 means not duplication.
     * @return 1 means fully duplicate.
     * @return 2 means partially duplicate, and p's path is o's prefix.
     * @return 3 means partially duplicate, and o's path is p's prefix.
     */
    function _examinePaths(o: { paths: Array<{ isParam: boolean, path: string }>, method: Tsoa.Method }, p: { paths: Array<{ isParam: boolean, path: string }>, method: Tsoa.Method }): number {
      const testLength = o.paths.length > p.paths.length ? p.paths.length : o.paths.length;
      for (let i = 0; i < testLength; i += 1) {
        if ((o.paths[i].isParam && !p.paths[i].isParam)
          || (!o.paths[i].isParam && p.paths[i].isParam)
          || (!o.paths[i].isParam && o.paths[i].path !== p.paths[i].path)
        ) {
          return 0;
        }
      }
      if (o.paths.length === p.paths.length) {
        return 1;
      } else if (o.paths.length > p.paths.length) {
        return 2;
      } else {
        return 3;
      }
    }

    controllers.forEach(controller => {
      const methodRouteGroup: { [key: string]: Array<{
        paths: Array<{
          isParam: boolean,
          path: string,
        }>,
        method: Tsoa.Method,
      }> } = {};
      // Group each ts methods with RESTful methods into same object in same controller.
      controller.methods.forEach(method => {
        if (methodRouteGroup[method.method] === undefined) {
          methodRouteGroup[method.method] = [];
        }
        methodRouteGroup[method.method].push({
          paths: method.path.split('/').map((val: string) => {
            return { isParam: isParamRegExp.test(val), path: val };
          }),
          method,
        });
      });

      const dupRoute: { [key: string]: Tsoa.Method[] } = {};
      Object.keys(methodRouteGroup).forEach((key: string) => {
        const methodRoutes: Array<{ paths: Array<{ isParam: boolean, path: string }>, method: Tsoa.Method }> = methodRouteGroup[key];
        const duplicates: Tsoa.Method[] = [];
        for (let i = 0; i < methodRoutes.length - 1; i += 1) {
          const iMethodRoute = methodRoutes[i];
          for (let j = i + 1; j < methodRoutes.length; j += 1) {
            const jMethodRoute = methodRoutes[j];
            const examineResult = _examinePaths(iMethodRoute, jMethodRoute);
            if (examineResult === 1) {
              if (!duplicates.includes(iMethodRoute.method)) { duplicates.push(iMethodRoute.method); }
              if (!duplicates.includes(jMethodRoute.method)) { duplicates.push(jMethodRoute.method); }
            } else if (examineResult === 2) {
              console.warn(`[Method ${jMethodRoute.method.name} route: ${jMethodRoute.method.path}] may never been invoke, because its route is partialy collison with [Method ${iMethodRoute.method.name} route: ${iMethodRoute.method.path}]`);
            } else if (examineResult === 3) {
              console.warn(`[Method ${iMethodRoute.method.name} route: ${iMethodRoute.method.path}] may never been invoke, because its route is partialy collison with [Method ${jMethodRoute.method.name} route: ${jMethodRoute.method.path}]`);
            }
          }
        }

        if (duplicates.length > 1) {
          dupRoute[key] = duplicates;
        }
      });

      if (Object.keys(dupRoute).length > 0) {
        controllerDup[controller.name] = dupRoute;
      }
    });

    if (Object.keys(controllerDup).length > 0) {
      message = `Duplicate path parameter definition signature found in controller `;
      message += Object.keys(controllerDup)
        .map((conKey: string) => {
          const methodDup: { [key: string]: Tsoa.Method[] } = controllerDup[conKey];
          return `${conKey} at ${Object.keys(methodDup)
            .map((methodKey: string) => {
              return `[method ${methodKey.toUpperCase()} ${methodDup[methodKey]
                .map((method: Tsoa.Method) => {
                  return method.name;
                })
                .join(', ')}]`;
            })
            .join(', ')}`;
        })
        .join(', ');
      message += '\n';
    }

    if (message) {
      throw new GenerateMetadataError(message);
    }
  };

  public TypeChecker() {
    return this.typeChecker;
  }

  public AddReferenceType(referenceType: Tsoa.ReferenceType) {
    if (!referenceType.refName) {
      return;
    }
    this.referenceTypeMap[referenceType.refName] = referenceType;
  }

  public GetReferenceType(refName: string) {
    return this.referenceTypeMap[refName];
  }

  public OnFinish(callback: (referenceTypes: Tsoa.ReferenceTypeMap) => void) {
    this.circularDependencyResolvers.push(callback);
  }

  private buildControllers() {
    return this.nodes
      .filter(node => node.kind === ts.SyntaxKind.ClassDeclaration && this.IsExportedNode(node as ts.ClassDeclaration))
      .map((classDeclaration: ts.ClassDeclaration) => new ControllerGenerator(classDeclaration, this))
      .filter(generator => generator.IsValid())
      .map(generator => generator.Generate());
  }
}
