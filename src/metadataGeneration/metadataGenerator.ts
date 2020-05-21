import * as mm from 'minimatch';
import * as ts from 'typescript';
import { importClassesFromDirectories } from '../utils/importClassesFromDirectories';
import { ControllerGenerator } from './controllerGenerator';
import { GenerateMetadataError } from './exceptions';
import { Tsoa } from './tsoa';
import { TypeResolver } from './typeResolver';

export class MetadataGenerator {
  public readonly nodes = new Array<ts.Node>();
  public readonly typeChecker: ts.TypeChecker;
  private readonly program: ts.Program;
  private referenceTypeMap: Tsoa.ReferenceTypeMap = {};
  private circularDependencyResolvers = new Array<(referenceTypes: Tsoa.ReferenceTypeMap) => void>();

  public IsExportedNode(node: ts.Node) {
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
    this.circularDependencyResolvers.forEach(c => c(this.referenceTypeMap));

    return {
      controllers,
      referenceTypeMap: this.referenceTypeMap,
    };
  }

  private setProgramToDynamicControllersFiles(controllers) {
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
          // tslint:disable-next-line:no-bitwise
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
