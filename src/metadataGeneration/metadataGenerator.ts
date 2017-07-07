import * as ts from 'typescript';

import { Metadata, ReferenceType } from './types';

import { ControllerGenerator } from './controllerGenerator';
import { DecoratorPlugin } from '../plugins/DecoratorPlugin';
import { defaultDecoratorPlugin } from '../plugins/defaultDecoratorPlugin';

export class MetadataGenerator {
  public static current: MetadataGenerator;
  public readonly nodes = new Array<ts.Node>();
  public readonly typeChecker: ts.TypeChecker;
  private readonly program: ts.Program;
  private referenceTypes: { [typeName: string]: ReferenceType } = {};
  private circularDependencyResolvers = new Array<(referenceTypes: { [typeName: string]: ReferenceType }) => void>();

  public IsExportedNode(node: ts.Node) { return true; }

  constructor(entryFile: string, compilerOptions?: ts.CompilerOptions, public decoratorPlugin: DecoratorPlugin = defaultDecoratorPlugin) {
    this.program = ts.createProgram([entryFile], compilerOptions || {});
    this.typeChecker = this.program.getTypeChecker();
    MetadataGenerator.current = this;
  }

  public Generate(): Metadata {
    this.program.getSourceFiles().forEach(sf => {
      ts.forEachChild(sf, node => {
        this.nodes.push(node);
      });
    });

    const controllers = this.buildControllers();

    this.circularDependencyResolvers.forEach(c => c(this.referenceTypes));

    return {
      Controllers: controllers,
      ReferenceTypes: this.referenceTypes
    };
  }

  public TypeChecker() {
    return this.typeChecker;
  }

  public AddReferenceType(referenceType: ReferenceType) {
    this.referenceTypes[referenceType.typeName] = referenceType;
  }

  public GetReferenceType(typeName: string) {
    return this.referenceTypes[typeName];
  }

  public OnFinish(callback: (referenceTypes: { [typeName: string]: ReferenceType }) => void) {
    this.circularDependencyResolvers.push(callback);
  }

  private buildControllers() {
    return this.nodes
      .filter(node => node.kind === ts.SyntaxKind.ClassDeclaration && this.IsExportedNode(node as ts.ClassDeclaration))
      .map((classDeclaration: ts.ClassDeclaration) => new ControllerGenerator(classDeclaration))
      .filter(generator => generator.IsValid())
      .map(generator => generator.Generate());
  }
}
