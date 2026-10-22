import { Tsoa } from '@tsoa/runtime';
import * as ts from 'typescript';
import isISO8601 from 'validator/lib/isISO8601';
import { GenerateMetadataError } from './../metadataGeneration/exceptions';
import { commentToString, getJSDocTags } from './jsDocUtils';

export function getParameterValidators(parameter: ts.ParameterDeclaration, parameterName: string): Tsoa.Validators {
  if (!parameter.parent) {
    return {};
  }

  const getCommentValue = (comment?: string) => comment && comment.split(' ')[0];

  const tags = getJSDocTags(parameter.parent, tag => {
    const { comment } = tag;
    return getParameterTagSupport().some(value => !!commentToString(comment) && value === tag.tagName.text && getCommentValue(commentToString(comment)) === parameterName);
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

  return tags.reduce(
    (validateObj, tag) => {
      if (!tag.comment) {
        return validateObj;
      }

      const name = tag.tagName.text;
      const comment = commentToString(tag.comment)
        ?.substring((commentToString(tag.comment)?.indexOf(' ') || -1) + 1)
        .trim();
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
          if (!isISO8601(String(value), { strict: true })) {
            throw new GenerateMetadataError(`${name} parameter use date format ISO 8601 ex. 2017-05-14, 2017-05-14T05:18Z`);
          }
          validateObj[name] = {
            errorMsg: getErrorMsg(comment),
            value,
          };
          break;
        case 'pattern':
          validateObj[name] = parsePattern(comment, tag);
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
    },
    {} as Tsoa.Validators & { [unknown: string]: { errorMsg: string; value: undefined } },
  );
}

export function getPropertyValidators(property: ts.Node): Tsoa.Validators | undefined {
  const tags = getJSDocTags(property, tag => {
    return getParameterTagSupport().some(value => value === tag.tagName.text);
  });
  function getValue(comment?: string) {
    if (!comment) {
      return;
    }
    return comment.split(' ')[0];
  }
  function getFullValue(comment?: string) {
    if (!comment) {
      return;
    }
    if (comment.includes('\n')) {
      return comment.split('\n')[0];
    }
    return comment;
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

  return tags.reduce(
    (validateObj, tag) => {
      const name = tag.tagName.text;
      const comment = tag.comment;
      const value = getValue(commentToString(comment));

      switch (name) {
        case 'uniqueItems':
          validateObj[name] = {
            errorMsg: getErrorMsg(commentToString(comment), false),
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
            errorMsg: getErrorMsg(commentToString(comment)),
            value: Number(value),
          };
          break;
        case 'minDate':
        case 'maxDate':
          if (!isISO8601(String(value), { strict: true })) {
            throw new GenerateMetadataError(`${name} parameter use date format ISO 8601 ex. 2017-05-14, 2017-05-14T05:18Z`);
          }
          validateObj[name] = {
            errorMsg: getErrorMsg(commentToString(comment)),
            value,
          };
          break;
        case 'pattern':
          validateObj[name] = parsePattern(commentToString(comment), tag);
          break;
        case 'title':
          if (typeof value !== 'string') {
            throw new GenerateMetadataError(`${name} parameter use string.`);
          }
          validateObj[name] = {
            errorMsg: getErrorMsg(commentToString(comment)),
            value: getFullValue(commentToString(comment)),
          };
          break;
        default:
          if (name.startsWith('is')) {
            const errorMsg = getErrorMsg(commentToString(comment), false);
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
    },
    {} as Tsoa.Validators & { [unknown: string]: { errorMsg: string; value: undefined } },
  );
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
    'title',
  ];
}

function parsePattern(comment: string | undefined, node: ts.Node): { value: string; errorMsg?: string } {
  if (!comment) {
    throw new GenerateMetadataError('pattern parameter use string.', node);
  }

  const quoted = /^`(?!`)[^\r\n]*?`(?= |$)/.exec(comment);
  const separator = quoted ? quoted[0].length : comment.indexOf(' ');
  const source = separator === -1 ? comment : comment.substring(0, separator);
  const value = source.startsWith('`') && source.endsWith('`') ? source.substring(1, source.length - 1) : source;
  const errorMsg = separator > 0 && separator < comment.length ? comment.substring(separator + 1) : undefined;

  try {
    new RegExp(value);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new GenerateMetadataError(`Invalid @pattern ${JSON.stringify(value)}. ${error.message}`, node);
    }
    throw error;
  }
  return { value, errorMsg };
}

export function shouldIncludeValidatorInSchema(key: string): key is Tsoa.SchemaValidatorKey {
  return !key.startsWith('is') && key !== 'minDate' && key !== 'maxDate';
}
