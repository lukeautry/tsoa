import * as ts from 'typescript';
import { Validators } from './../metadataGeneration/types';
export declare function getParameterValidators(parameter: ts.ParameterDeclaration, parameterName: any): Validators;
export declare function getPropertyValidators(property: ts.PropertyDeclaration): Validators;
