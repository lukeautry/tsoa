import * as moment from 'moment';
import * as ts from 'typescript';
import { GenerateMetadataError } from './../metadataGeneration/exceptions';
import { Tsoa } from './../metadataGeneration/tsoa';
import { getDecorators } from './decoratorUtils';
import { getJSDocTags } from './jsDocUtils';

const validateDecoratorSupport = [
    'MinDate', 'MaxDate', 'Min', 'Max', 'MinLength', 'MaxLength', 'Pattern', 'MinItems', 'MaxItems',
    'IsInt', 'IsLong', 'IsFloat', 'IsDouble', 'IsDate', 'IsDateTime', 'IsString', 'IsBool', 'IsEnum',
    'IsRequire', 'IsArray', 'UniqueItems',
];

export function getValidateDecorators(parameter: ts.ParameterDeclaration | ts.PropertyDeclaration): Tsoa.Validators {
    const validators = {} as Tsoa.Validators;
    const decoratorTwoArgss = getDecorators(parameter, (ident) => validateDecoratorSupport.indexOf(ident.text) !== -1);
    decoratorTwoArgss.forEach(decorator => {
        const expression = decorator.parent as ts.CallExpression;
        const identifier = expression.expression as ts.Identifier;

        let messageArg;
        let value;
        let name = identifier.text;
        switch (name) {
            case 'IsInt':
            case 'IsLong':
            case 'IsFloat':
            case 'IsDouble':
            case 'IsDate':
            case 'IsDateTime':
            case 'IsString':
            case 'IsBool':
            case 'IsEnum':
            case 'IsRequire':
            case 'IsArray':
            case 'UniqueItems':
                messageArg = expression.arguments[0] as ts.StringLiteral;
                break;
            case 'MinDate':
            case 'MaxDate':
            case 'Pattern':
                const stringArg = expression.arguments[0] as ts.StringLiteral;
                value = String(stringArg.text);
                messageArg = expression.arguments[1] as ts.StringLiteral;
                break;
            case 'Min':
            case 'Max':
            case 'MinLength':
            case 'MaxLength':
            case 'MinItems':
            case 'MaxItems':
                const numberArg = expression.arguments[0] as ts.StringLiteral;
                value = Number(numberArg.text);
                messageArg = expression.arguments[1] as ts.StringLiteral;
                break;
        }

        name = camelize(identifier.text);
        if (name === 'min') {
            name = 'minimum';
        }
        if (name === 'max') {
            name = 'maximum';
        }
        validators[name] = {
            message: messageArg ? messageArg.text : undefined,
            value,
        };
    });
    return validators;
}

function camelize(str) {
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) => {
    return index === 0 ? letter.toLowerCase() : letter.toUpperCase();
  }).replace(/\s+/g, '');
}

export function getParameterValidators(parameter: ts.ParameterDeclaration, parameterName): Tsoa.Validators {
    if (!parameter.parent) { return {}; }

    const tags = getJSDocTags(parameter.parent, tag => {
        return getParameterTagSupport().some(value => {
            if (!tag.comment) { return false; }
            return value === tag.tagName.text && tag.comment.startsWith(parameterName);
        });
    });

    function getValue(comment?: string) {
        if (!comment) { return; }
        return comment.split(' ')[0];
    }
    function getMessage(comment?: string, isValue = true) {
        if (!comment) { return; }
        if (isValue) {
            const indexOf = comment.indexOf(' ');
            if (indexOf > 0) {
                return comment.substr(indexOf + 1);
            } else {
                return undefined;
            }
        } else {
            return comment;
        }
    }

    return tags.reduce((validateObj, tag) => {
        if (!tag.comment) { return validateObj; }

        const name = tag.tagName.text;
        const comment = tag.comment.substr(tag.comment.indexOf(' ') + 1).trim();
        const value = getValue(comment);

        switch (name) {
            case 'uniqueItems':
                validateObj[name] = {
                    message: getMessage(comment, false),
                    value: undefined,
                };
                break;
            case 'minimum':
            case 'maximum':
            case 'minItems':
            case 'maxItems':
            case 'minLength':
            case 'maxLength':
                if (isNaN(value as any)) {
                    throw new GenerateMetadataError(`${name} parameter use number.`);
                }
                validateObj[name] = {
                    message: getMessage(comment),
                    value: Number(value),
                };
                break;
            case 'minDate':
            case 'maxDate':
                if (!moment(value, moment.ISO_8601, true).isValid()) {
                    throw new GenerateMetadataError(`${name} parameter use date format ISO 8601 ex. 2017-05-14, 2017-05-14T05:18Z`);
                }
                validateObj[name] = {
                    message: getMessage(comment),
                    value,
                };
                break;
            case 'pattern':
                if (typeof value !== 'string') {
                    throw new GenerateMetadataError(`${name} patameter use string.`);
                }
                validateObj[name] = {
                    message: getMessage(comment),
                    value,
                };
                break;
            default:
                if (name.startsWith('is')) {
                    const message = getMessage(comment, false);
                    if (message) {
                        validateObj[name] = {
                            message,
                            value: undefined,
                        };
                    }
                }
                break;
        }
        return validateObj;
    }, {} as Tsoa.Validators);
}

export function getPropertyValidators(property: ts.PropertyDeclaration): Tsoa.Validators | undefined {
    const tags = getJSDocTags(property, (tag) => {
        return getParameterTagSupport().some(value => value === tag.tagName.text);
    });
    function getValue(comment?: string) {
        if (!comment) { return; }
        return comment.split(' ')[0];
    }
    function getMessage(comment?: string, isValue = true) {
        if (!comment) { return; }
        if (isValue) {
            const indexOf = comment.indexOf(' ');
            if (indexOf > 0) {
                return comment.substr(indexOf + 1);
            } else {
                return undefined;
            }
        } else {
            return comment;
        }
    }

    return tags.reduce((validateObj, tag) => {
        const name = tag.tagName.text;
        const comment = tag.comment;
        const value = getValue(comment);

        switch (name) {
            case 'uniqueItems':
                validateObj[name] = {
                    message: getMessage(comment, false),
                    value: undefined,
                };
                break;
            case 'minimum':
            case 'maximum':
            case 'minItems':
            case 'maxItems':
            case 'minLength':
            case 'maxLength':
                if (isNaN(value as any)) {
                    throw new GenerateMetadataError(`${name} parameter use number.`);
                }
                validateObj[name] = {
                    message: getMessage(comment),
                    value: Number(value),
                };
                break;
            case 'minDate':
            case 'maxDate':
                if (!moment(value, moment.ISO_8601, true).isValid()) {
                    throw new GenerateMetadataError(`${name} parameter use date format ISO 8601 ex. 2017-05-14, 2017-05-14T05:18Z`);
                }
                validateObj[name] = {
                    message: getMessage(comment),
                    value,
                };
                break;
            case 'pattern':
                if (typeof value !== 'string') {
                    throw new GenerateMetadataError(`${name} patameter use string.`);
                }
                validateObj[name] = {
                    message: getMessage(comment),
                    value,
                };
                break;
            default:
                if (name.startsWith('is')) {
                    const message = getMessage(comment, false);
                    if (message) {
                        validateObj[name] = {
                            message,
                            value: undefined,
                        };
                    }
                }
                break;
        }
        return validateObj;
    }, {} as Tsoa.Validators);
}

function getParameterTagSupport() {
    return [
        'isString', 'isBoolean', 'isInt', 'isLong', 'isFloat', 'isDouble', 'isDate', 'isDateTime',
        'minItems', 'maxItems', 'uniqueItems',
        'minLength', 'maxLength', 'pattern',
        'minimum', 'maximum',
        'minDate', 'maxDate',
    ];
}
