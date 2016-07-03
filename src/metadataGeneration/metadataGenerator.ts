import * as ts from 'typescript';
import {ControllerGenerator} from './controllerGenerator';

export class MetadataGenerator {
    private static current: MetadataGenerator;
    private nodes = new Array<ts.Node>();
    private typeChecker: ts.TypeChecker;
    private referenceTypes: { [typeName: string]: ReferenceType } = {};

    public static Current() {
        return MetadataGenerator.current;
    }

    public static IsExportedNode(node: ts.Node) {
        return (node.flags & ts.NodeFlags.Export) !== 0 || (node.parent && node.parent.kind === ts.SyntaxKind.SourceFile);
    }

    constructor() {
        MetadataGenerator.current = this;
    }

    public Generate(entryFile: string): Metadata {
        const program = ts.createProgram([entryFile], {});
        this.typeChecker = program.getTypeChecker();

        program.getSourceFiles().forEach(sf => {
            ts.forEachChild(sf, node => {
                this.nodes.push(node);
            });
        });

        const controllers = this.buildControllers();

        return {
            Controllers: controllers,
            ReferenceTypes: this.referenceTypes
        };
    }

    public Nodes() {
        return this.nodes;
    }

    public TypeChecker() {
        return this.typeChecker;
    }

    public AddReferenceType(referenceType: ReferenceType) {
        this.referenceTypes[referenceType.name] = referenceType;
    }

    public GetReferenceType(typeName: string) {
        return this.referenceTypes[typeName];
    }

    private buildControllers() {
        return this.nodes
            .filter(node => node.kind === ts.SyntaxKind.ClassDeclaration && MetadataGenerator.IsExportedNode(node))
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
    description: string;
    example: any;
    method: string;
    name: string;
    parameters: Parameter[];
    path: string;
    type: Type;
}

export interface Parameter {
    description: string;
    in: string;
    name: string;
    required: boolean;
    type: Type;
}

export type Type = PrimitiveType | ReferenceType | ArrayType;

export type PrimitiveType = string;

export interface ReferenceType {
    description: string;
    name: string;
    properties: Property[];
}

export interface Property {
    description: string;
    name: string;
    type: Type;
    required: boolean;
}

export interface ArrayType {
    elementType: Type;
}
