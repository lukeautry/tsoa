import * as ts from 'typescript';
import { ControllerGenerator } from './controllerGenerator';

export class MetadataGenerator {
  public static current: MetadataGenerator;
  public readonly nodes = new Array<ts.Node>();
  public readonly typeChecker: ts.TypeChecker;
  private readonly program: ts.Program;
  private referenceTypes: { [typeName: string]: ReferenceType } = {};
  private circularDependencyResolvers = new Array<(referenceTypes: { [typeName: string]: ReferenceType }) => void>();

  public IsExportedNode(node: ts.Node) { return true; }

  constructor(entryFile: string) {
    this.program = ts.createProgram([entryFile], {});
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

export interface Metadata {
  Controllers: Controller[];
  ReferenceTypes: { [typeName: string]: ReferenceType };
}

export interface Controller {
  location: string;
  methods: Method[];
  name: string;
  path: string;
}

export interface Method {
  deprecated?: boolean;
  description: string;
  method: string;
  name: string;
  parameters: Parameter[];
  path: string;
  type: Type;
  tags: string[];
  responses: ResponseType[];
  security?: Security;
  summary?: string;
}

export interface Parameter {
  parameterName: string;
  description: string;
  in: string;
  name: string;
  required: boolean;
  type: Type;
}

export interface Security {
  name: string;
  scopes?: string[];
}

export interface Type {
  typeName: string;
};

export interface EnumerateType extends Type {
  enumMembers: string[];
}

export interface ReferenceType extends Type {
  description: string;
  properties: Property[];
  additionalProperties?: Property[];
}

export interface ArrayType extends Type {
  elementType: Type;
}

export interface ResponseType {
  description: string;
  name: string;
  schema?: Type;
  examples?: any;
}

export interface Property {
  description: string;
  name: string;
  type: Type;
  required: boolean;
}
