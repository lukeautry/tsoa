import * as ts from 'typescript';
import * as moment from 'moment';
import { Validators } from './../metadataGeneration/types';
import { getDecorators } from './decoratorUtils';
import { GenerateMetadataError } from './../metadataGeneration/exceptions';

export function getValidators(property: ts.Node): Validators {
    const validatorDecorator = getDecorators(property, ident => {
        return supportValidatorDecorator().some(name => name === ident.text);
    });

    return validatorDecorator.reduce((previous, decorator) => {
        const name = decorator.text;
        const swaggerName = name.charAt(0).toLowerCase() + name.slice(1);
        const expression = decorator.parent as ts.CallExpression;
        switch (name) {
            case 'UniqueItems':
                previous[swaggerName] = {
                    errorMsg: getValidatorValue(expression.arguments, 0),
                    value: undefined,
                };
                break;
            case 'Minimum':
            case 'Maximum':
            case 'MinItems':
            case 'MaxItems':
            case 'MinLength':
            case 'MaxLength':
                if (isNaN(getValidatorValue(expression.arguments, 0) as any)) {
                    throw new GenerateMetadataError(property, `${name} parameter use number.`);
                }
                previous[swaggerName] = {
                    errorMsg: getValidatorValue(expression.arguments, 1),
                    value: Number(getValidatorValue(expression.arguments, 0)),
                };
                break;
            case 'MinDate':
            case 'MaxDate':
                if (!moment(getValidatorValue(expression.arguments, 0), moment.ISO_8601, true).isValid()) {
                    throw new GenerateMetadataError(property, `${name} parameter use date format ISO 8601 ex. 2017-05-14, 2017-05-14T05:18Z`);
                }
                previous[swaggerName] = {
                    errorMsg: getValidatorValue(expression.arguments, 1),
                    value: getValidatorValue(expression.arguments, 0),
                };
                break;
            case 'Pattern':
                if (typeof getValidatorValue(expression.arguments, 0) !== 'string') {
                    throw new GenerateMetadataError(property, `${name} patameter use string.`);
                }
                previous[swaggerName] = {
                    errorMsg: getValidatorValue(expression.arguments, 1),
                    value: getValidatorValue(expression.arguments, 0),
                };
                break;
            default:
                const errorMsg = getValidatorValue(expression.arguments, 0);
                if (errorMsg) {
                    previous[swaggerName] = {
                        errorMsg,
                        value: undefined,
                    };
                }
                break;
        }
        return previous;
    }, {} as Validators);
}

function getValidatorValue(nodes: ts.NodeArray<ts.Expression>, index: number) {
    if (nodes.length <= index) { return; }
    return (nodes[index] as ts.StringLiteral).text;
}

function supportValidatorDecorator() {
    return ['UniqueItems', 'MinItems', 'MaxItems', 'Minimum', 'Maximum',
        'MinLength', 'MaxLength', 'Pattern', 'MinDate', 'MaxDate',
        'IsInt', 'IsLong', 'IsFloat', 'IsDouble', 'IsDate', 'IsDateTime',
        'IsString', 'IsArray', 'IsBoolean'];
}
