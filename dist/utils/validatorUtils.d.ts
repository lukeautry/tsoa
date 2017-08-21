import * as ts from 'typescript';
import { Tsoa } from './../metadataGeneration/tsoa';
export declare function getParameterValidators(parameter: ts.ParameterDeclaration, parameterName: any): Tsoa.Validators;
export declare function getPropertyValidators(property: ts.PropertyDeclaration): Tsoa.Validators | undefined;
