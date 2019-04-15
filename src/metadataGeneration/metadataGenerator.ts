import * as mm from 'minimatch';
import * as ts from 'typescript';
import { ControllerGenerator } from './controllerGenerator';
import { Tsoa } from './tsoa';

export class MetadataGenerator {
  public readonly nodes = new Array<ts.Node>();
  public readonly typeChecker: ts.TypeChecker;
  private readonly program: ts.Program;
  private referenceTypeMap: Tsoa.ReferenceTypeMap = {};
  private circularDependencyResolvers = new Array<(referenceTypes: Tsoa.ReferenceTypeMap) => void>();

  public IsExportedNode(node: ts.Node) { return true; }

  constructor(entryFile: string, compilerOptions?: ts.CompilerOptions, private readonly ignorePaths?: string[]) {
    this.program = ts.createProgram([entryFile], compilerOptions || {});
    this.typeChecker = this.program.getTypeChecker();
  }

  public Generate(): Tsoa.Metadata {
    this.program.getSourceFiles().forEach((sf) => {
      if (this.ignorePaths && this.ignorePaths.length) {
        for (const path of this.ignorePaths) {
          if (mm(sf.fileName, path)) {
            return;
          }
        }
      }

      ts.forEachChild(sf, (node) => {
        this.nodes.push(node);
      });
    });

    const controllers = this.buildControllers();

    this.circularDependencyResolvers.forEach((c) => c(this.referenceTypeMap));

    return {
      controllers,
      referenceTypeMap: this.referenceTypeMap,
    };
  }

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

  private checkForDuplicateMethods(controllers: Tsoa.Controller[]) {
    const methodSet = new Set<string>();

    controllers.forEach((controller) => {
      controller.methods.forEach(({method, path}) => {
        const methodIdentifier = `${method.toUpperCase()} /${controller.path}/${path}`;

        if (methodSet.has(methodIdentifier)) {
          throw new Error(`Duplicate method for path '${methodIdentifier}' was found`);
        }

        methodSet.add(methodIdentifier);
      });
    });
  }

  private buildControllers() {
    const controllerGenerators: ControllerGenerator[] = this.nodes
      .filter((node) => node.kind === ts.SyntaxKind.ClassDeclaration && this.IsExportedNode(node as ts.ClassDeclaration))
      .map((classDeclaration: ts.ClassDeclaration) => new ControllerGenerator(classDeclaration, this));

    const validControllers: Tsoa.Controller[] = controllerGenerators
      .filter((controllerGenerator: ControllerGenerator) => controllerGenerator.IsValid())
      .map((generator) => generator.Generate());

    this.checkForDuplicateMethods(validControllers);

    return validControllers;
  }
}
