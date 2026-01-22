import { Tsoa } from '@tsoa/runtime';
import * as ts from 'typescript';
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
          if (!isISO8601(String(value))) {
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
          if (!isISO8601(String(value))) {
            throw new GenerateMetadataError(`${name} parameter use date format ISO 8601 ex. 2017-05-14, 2017-05-14T05:18Z`);
          }
          validateObj[name] = {
            errorMsg: getErrorMsg(commentToString(comment)),
            value,
          };
          break;
        case 'pattern':
          if (typeof value !== 'string') {
            throw new GenerateMetadataError(`${name} parameter use string.`);
          }
          validateObj[name] = {
            errorMsg: getErrorMsg(commentToString(comment)),
            value: removeSurroundingQuotes(value),
          };
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

function removeSurroundingQuotes(str: string) {
  if (str.startsWith('`') && str.endsWith('`')) {
    return str.substring(1, str.length - 1);
  }
  if (str.startsWith('```') && str.endsWith('```')) {
    return str.substring(3, str.length - 3);
  }
  return str;
}

export function shouldIncludeValidatorInSchema(key: string): key is Tsoa.SchemaValidatorKey {
  return !key.startsWith('is') && key !== 'minDate' && key !== 'maxDate';
}

/**
 * Validates if a string is in ISO 8601 format (strict mode, matching validator.js behavior)
 * Supports date-only (YYYY-MM-DD) and datetime with strict 'T' separator (YYYY-MM-DDTHH:mm:ss[.sss][Z])
 * Based on validator.js with strictSeparator: true and strict: true options
 */
export function isISO8601(value: string): boolean {
  // ISO 8601 strict separator regex from validator.js
  // Time portion is optional, but if present, requires 'T' separator
  const iso8601Regex = /^([+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-3])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T]((([01]\d|2[0-3])((:?)[0-5]\d)?|24:?00)([.,]\d+(?!:))?)?(\17[0-5]\d([.,]\d+)?)?([zZ]|([+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$/;

  if (!iso8601Regex.test(value)) {
    return false;
  }

  // Validate the actual date is correct (catches invalid dates like 2009-02-31)
  // This matches validator.js isValidDate function behavior

  // Check for ordinal dates (YYYY-DDD format)
  const ordinalMatch = value.match(/^(\d{4})-?(\d{3})([ T]{1}\.*|$)/);
  if (ordinalMatch) {
    const oYear = Number(ordinalMatch[1]);
    const oDay = Number(ordinalMatch[2]);
    // Check if leap year
    if ((oYear % 4 === 0 && oYear % 100 !== 0) || oYear % 400 === 0) {
      return oDay <= 366;
    }
    return oDay <= 365;
  }

  // Regular date format
  const match = value.match(/(\d{4})-?(\d{0,2})-?(\d*)/)?.map(Number);
  if (!match) {
    return false;
  }

  const year = match[1];
  const month = match[2];
  const day = match[3];
  const monthString = month ? `0${month}`.slice(-2) : month;
  const dayString = day ? `0${day}`.slice(-2) : day;

  // Create a date object and compare
  const d = new Date(`${year}-${monthString || '01'}-${dayString || '01'}`);
  if (month && day) {
    return d.getUTCFullYear() === year
      && (d.getUTCMonth() + 1) === month
      && d.getUTCDate() === day;
  }
  return true;
}
