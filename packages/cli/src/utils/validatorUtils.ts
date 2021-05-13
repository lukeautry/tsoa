import validator from 'validator';
import * as ts from 'typescript';
import { GenerateMetadataError } from './../metadataGeneration/exceptions';
import { Tsoa } from '@tsoa/runtime';
import { getJSDocTags } from './jsDocUtils';

export function getParameterValidators(parameter: ts.ParameterDeclaration, parameterName): Tsoa.Validators {
  if (!parameter.parent) {
    return {};
  }

  const getCommentValue = (comment?: string) => comment && comment.split(' ')[0];

  const tags = getJSDocTags(parameter.parent, tag => {
    const { comment } = tag;
    return getParameterTagSupport().some(value => !!comment && value === tag.tagName.text && getCommentValue(comment) === parameterName);
  });

  function getErrorMsg(comment?: string, isValue = true) {
    if (!comment) {
      return;
    }
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
    if (!tag.comment) {
      return validateObj;
    }

    const name = tag.tagName.text;
    const comment = tag.comment.substr(tag.comment.indexOf(' ') + 1).trim();
    const value = getCommentValue(comment);

    switch (name) {
      case 'uniqueItems':
        validateObj[name] = {
          errorMsg: getErrorMsg(comment, false),
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
          errorMsg: getErrorMsg(comment),
          value: Number(value),
        };
        break;
      case 'minDate':
      case 'maxDate':
        if (!validator.isISO8601(String(value), { strict: true })) {
          throw new GenerateMetadataError(`${name} parameter use date format ISO 8601 ex. 2017-05-14, 2017-05-14T05:18Z`);
        }
        validateObj[name] = {
          errorMsg: getErrorMsg(comment),
          value,
        };
        break;
      case 'pattern':
        if (typeof value !== 'string') {
          throw new GenerateMetadataError(`${name} parameter use string.`);
        }
        validateObj[name] = {
          errorMsg: getErrorMsg(comment),
          value: removeSurroundingQuotes(value),
        };
        break;
      default:
        if (name.startsWith('is')) {
          const errorMsg = getErrorMsg(comment, false);
          if (errorMsg) {
            validateObj[name] = {
              errorMsg,
              value: undefined,
            };
          }
        }
        break;
    }
    return validateObj;
  }, {} as Tsoa.Validators);
}

export function getPropertyValidators(property: ts.PropertyDeclaration | ts.TypeAliasDeclaration | ts.PropertySignature | ts.ParameterDeclaration): Tsoa.Validators | undefined {
  const tags = getJSDocTags(property, tag => {
    return getParameterTagSupport().some(value => value === tag.tagName.text);
  });
  function getValue(comment?: string) {
    if (!comment) {
      return;
    }
    return comment.split(' ')[0];
  }
  function getErrorMsg(comment?: string, isValue = true) {
    if (!comment) {
      return;
    }
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
          errorMsg: getErrorMsg(comment, false),
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
          errorMsg: getErrorMsg(comment),
          value: Number(value),
        };
        break;
      case 'minDate':
      case 'maxDate':
        if (!validator.isISO8601(String(value), { strict: true })) {
          throw new GenerateMetadataError(`${name} parameter use date format ISO 8601 ex. 2017-05-14, 2017-05-14T05:18Z`);
        }
        validateObj[name] = {
          errorMsg: getErrorMsg(comment),
          value,
        };
        break;
      case 'pattern':
        if (typeof value !== 'string') {
          throw new GenerateMetadataError(`${name} parameter use string.`);
        }
        validateObj[name] = {
          errorMsg: getErrorMsg(comment),
          value: removeSurroundingQuotes(value),
        };
        break;
      default:
        if (name.startsWith('is')) {
          const errorMsg = getErrorMsg(comment, false);
          if (errorMsg) {
            validateObj[name] = {
              errorMsg,
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
    'isString',
    'isBoolean',
    'isInt',
    'isLong',
    'isFloat',
    'isDouble',
    'isDate',
    'isDateTime',
    'minItems',
    'maxItems',
    'uniqueItems',
    'minLength',
    'maxLength',
    'pattern',
    'minimum',
    'maximum',
    'minDate',
    'maxDate',
  ];
}

function removeSurroundingQuotes(str: string) {
  if (str.startsWith('`') && str.endsWith('`')) {
    return str.substring(1, str.length - 1);
  }
  if (str.startsWith('```') && str.endsWith('```')) {
    return str.substring(3, str.length - 3);
  }
  return str;
}
