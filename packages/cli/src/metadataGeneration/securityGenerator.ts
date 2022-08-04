import { Tsoa } from '@namecheap/tsoa-runtime';
import { ClassDeclaration, MethodDeclaration, TypeChecker } from 'typescript';

export type SecurityGenerator = (node: ClassDeclaration | MethodDeclaration, typeChecker: TypeChecker, inheritedSecurities?: Tsoa.Security[]) => Tsoa.Security[];
