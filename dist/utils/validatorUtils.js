"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var moment = require("moment");
var exceptions_1 = require("./../metadataGeneration/exceptions");
var jsDocUtils_1 = require("./jsDocUtils");
function getParameterValidators(parameter, parameterName) {
    if (!parameter.parent) {
        return {};
    }
    var tags = jsDocUtils_1.getJSDocTags(parameter.parent, function (tag) {
        return getParameterTagSupport().some(function (value) {
            if (!tag.comment) {
                return false;
            }
            return value === tag.tagName.text && tag.comment.startsWith(parameterName);
        });
    });
    function getValue(comment) {
        if (!comment) {
            return;
        }
        return comment.split(' ')[0];
    }
    function getErrorMsg(comment, isValue) {
        if (isValue === void 0) { isValue = true; }
        if (!comment) {
            return;
        }
        if (isValue) {
            var indexOf = comment.indexOf(' ');
            if (indexOf > 0) {
                return comment.substr(indexOf + 1);
            }
            else {
                return undefined;
            }
        }
        else {
            return comment;
        }
    }
    return tags.reduce(function (validateObj, tag) {
        if (!tag.comment) {
            return validateObj;
        }
        var name = tag.tagName.text;
        var comment = tag.comment.substr(tag.comment.indexOf(' ') + 1).trim();
        var value = getValue(comment);
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
                if (isNaN(value)) {
                    throw new exceptions_1.GenerateMetadataError(name + " parameter use number.");
                }
                validateObj[name] = {
                    errorMsg: getErrorMsg(comment),
                    value: Number(value),
                };
                break;
            case 'minDate':
            case 'maxDate':
                if (!moment(value, moment.ISO_8601, true).isValid()) {
                    throw new exceptions_1.GenerateMetadataError(name + " parameter use date format ISO 8601 ex. 2017-05-14, 2017-05-14T05:18Z");
                }
                validateObj[name] = {
                    errorMsg: getErrorMsg(comment),
                    value: value,
                };
                break;
            case 'pattern':
                if (typeof value !== 'string') {
                    throw new exceptions_1.GenerateMetadataError(name + " patameter use string.");
                }
                validateObj[name] = {
                    errorMsg: getErrorMsg(comment),
                    value: value,
                };
                break;
            default:
                if (name.startsWith('is')) {
                    var errorMsg = getErrorMsg(comment, false);
                    if (errorMsg) {
                        validateObj[name] = {
                            errorMsg: errorMsg,
                            value: undefined,
                        };
                    }
                }
                break;
        }
        return validateObj;
    }, {});
}
exports.getParameterValidators = getParameterValidators;
function getPropertyValidators(property) {
    var tags = jsDocUtils_1.getJSDocTags(property, function (tag) {
        return getParameterTagSupport().some(function (value) { return value === tag.tagName.text; });
    });
    function getValue(comment) {
        if (!comment) {
            return;
        }
        return comment.split(' ')[0];
    }
    function getErrorMsg(comment, isValue) {
        if (isValue === void 0) { isValue = true; }
        if (!comment) {
            return;
        }
        if (isValue) {
            var indexOf = comment.indexOf(' ');
            if (indexOf > 0) {
                return comment.substr(indexOf + 1);
            }
            else {
                return undefined;
            }
        }
        else {
            return comment;
        }
    }
    return tags.reduce(function (validateObj, tag) {
        var name = tag.tagName.text;
        var comment = tag.comment;
        var value = getValue(comment);
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
                if (isNaN(value)) {
                    throw new exceptions_1.GenerateMetadataError(name + " parameter use number.");
                }
                validateObj[name] = {
                    errorMsg: getErrorMsg(comment),
                    value: Number(value),
                };
                break;
            case 'minDate':
            case 'maxDate':
                if (!moment(value, moment.ISO_8601, true).isValid()) {
                    throw new exceptions_1.GenerateMetadataError(name + " parameter use date format ISO 8601 ex. 2017-05-14, 2017-05-14T05:18Z");
                }
                validateObj[name] = {
                    errorMsg: getErrorMsg(comment),
                    value: value,
                };
                break;
            case 'pattern':
                if (typeof value !== 'string') {
                    throw new exceptions_1.GenerateMetadataError(name + " patameter use string.");
                }
                validateObj[name] = {
                    errorMsg: getErrorMsg(comment),
                    value: value,
                };
                break;
            default:
                if (name.startsWith('is')) {
                    var errorMsg = getErrorMsg(comment, false);
                    if (errorMsg) {
                        validateObj[name] = {
                            errorMsg: errorMsg,
                            value: undefined,
                        };
                    }
                }
                break;
        }
        return validateObj;
    }, {});
}
exports.getPropertyValidators = getPropertyValidators;
function getParameterTagSupport() {
    return [
        'isString', 'isBoolean', 'isInt', 'isLong', 'isFloat', 'isDouble', 'isDate', 'isDateTime',
        'minItems', 'maxItems', 'uniqueItems',
        'minLength', 'maxLength', 'pattern',
        'minimum', 'maximum',
        'minDate', 'maxDate',
    ];
}
//# sourceMappingURL=validatorUtils.js.map