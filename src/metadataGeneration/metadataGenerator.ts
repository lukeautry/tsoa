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

  private getInheritedMethods(controller: Tsoa.Controller, controllerList: Tsoa.Controller[]): Tsoa.Method[] {
    const inheritedClasses = controllerList.filter(({ name }) => controller.inheritanceList.includes(name));

    // Crawl the inherited classes for decorated methods, filter out any that exist on the current controller
    const currentMethodPaths = controller.methods.map(method => method.path)
    const inheritedMethods: Tsoa.Method[] = inheritedClasses
      .reduce((acc, item) => [...acc, ...item.methods], [])
      .filter(method => !currentMethodPaths.includes(method.path));

    return inheritedClasses.reduce((acc, item) => [...acc, ...this.getInheritedMethods(item, controllerList)], inheritedMethods);
  }

  private buildControllers() {
    const controllerGenerators: ControllerGenerator[] = this.nodes
      .filter((node) => node.kind === ts.SyntaxKind.ClassDeclaration && this.IsExportedNode(node as ts.ClassDeclaration))
      .map((classDeclaration: ts.ClassDeclaration) => new ControllerGenerator(classDeclaration, this));

    // Need a list of all controllers with decorated methods for determining heritage on valid controllers.
    const allControllers: Tsoa.Controller[] = controllerGenerators.map((generator) => generator.Generate());

    const validControllers: Tsoa.Controller[] = controllerGenerators
      .filter((controllerGenerator: ControllerGenerator) => controllerGenerator.IsValid())
      .map((generator) => generator.Generate());

    // Attach all decorated methods, including those on parent classes, to the controller.
    validControllers.forEach(controller => controller.methods.push(...this.getInheritedMethods(controller, allControllers)));

    return validControllers;
  }
}
