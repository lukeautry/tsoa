"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var moment = require("moment");
var validator = require("validator");
var models = {};
function ValidateParam(property, value, generatedModels, name, fieldErrors, parent) {
    if (name === void 0) { name = ''; }
    if (parent === void 0) { parent = ''; }
    models = generatedModels;
    if (value === undefined || value === null) {
        if (property.required) {
            var message_1 = "'" + name + "' is a required";
            if (property.validators) {
                var validators_1 = property.validators;
                Object.keys(validators_1).forEach(function (key) {
                    var errorMsg = validators_1[key].errorMsg;
                    if (key.startsWith('is') && errorMsg) {
                        message_1 = errorMsg;
                    }
                });
            }
            fieldErrors[parent + name] = {
                message: message_1,
                value: value,
            };
            return;
        }
        else {
            return;
        }
    }
    switch (property.dataType) {
        case 'string':
            return validateString(name, value, fieldErrors, property.validators, parent);
        case 'boolean':
            return validateBool(name, value, fieldErrors, property.validators, parent);
        case 'integer':
        case 'long':
            return validateInt(name, value, fieldErrors, property.validators, parent);
        case 'float':
        case 'double':
            return validateFloat(name, value, fieldErrors, property.validators, parent);
        case 'enum':
            return validateEnum(name, value, fieldErrors, property.enums, parent);
        case 'array':
            return validateArray(name, value, fieldErrors, property.array, property.validators, parent);
        case 'date':
            return validateDate(name, value, fieldErrors, property.validators, parent);
        case 'datetime':
            return validateDateTime(name, value, fieldErrors, property.validators, parent);
        case 'buffer':
            return validateBuffer(name, value);
        case 'any':
            return value;
        default:
            if (property.ref) {
                return validateModel(name, value, property.ref, fieldErrors, parent);
            }
            return value;
    }
}
exports.ValidateParam = ValidateParam;
function validateInt(name, value, fieldErrors, validators, parent) {
    if (parent === void 0) { parent = ''; }
    if (!validator.isInt(String(value))) {
        var message = "invalid integer number";
        if (validators) {
            if (validators.isInt && validators.isInt.errorMsg) {
                message = validators.isInt.errorMsg;
            }
            if (validators.isLong && validators.isLong.errorMsg) {
                message = validators.isLong.errorMsg;
            }
        }
        fieldErrors[parent + name] = {
            message: message,
            value: value,
        };
        return;
    }
    var numberValue = validator.toInt(String(value), 10);
    if (!validators) {
        return numberValue;
    }
    if (validators.minimum && validators.minimum.value) {
        if (validators.minimum.value > numberValue) {
            fieldErrors[parent + name] = {
                message: validators.minimum.errorMsg || "min " + validators.minimum.value,
                value: value,
            };
            return;
        }
    }
    if (validators.maximum && validators.maximum.value) {
        if (validators.maximum.value < numberValue) {
            fieldErrors[parent + name] = {
                message: validators.maximum.errorMsg || "max " + validators.maximum.value,
                value: value,
            };
            return;
        }
    }
    return numberValue;
}
exports.validateInt = validateInt;
function validateFloat(name, value, fieldErrors, validators, parent) {
    if (parent === void 0) { parent = ''; }
    if (!validator.isFloat(String(value))) {
        var message = 'invalid float number';
        if (validators) {
            if (validators.isFloat && validators.isFloat.errorMsg) {
                message = validators.isFloat.errorMsg;
            }
            if (validators.isDouble && validators.isDouble.errorMsg) {
                message = validators.isDouble.errorMsg;
            }
        }
        fieldErrors[parent + name] = {
            message: message,
            value: value,
        };
        return;
    }
    var numberValue = validator.toFloat(String(value));
    if (!validators) {
        return numberValue;
    }
    if (validators.minimum && validators.minimum.value) {
        if (validators.minimum.value > numberValue) {
            fieldErrors[parent + name] = {
                message: validators.minimum.errorMsg || "min " + validators.minimum.value,
                value: value,
            };
            return;
        }
    }
    if (validators.maximum && validators.maximum.value) {
        if (validators.maximum.value < numberValue) {
            fieldErrors[parent + name] = {
                message: validators.maximum.errorMsg || "max " + validators.maximum.value,
                value: value,
            };
            return;
        }
    }
    return numberValue;
}
exports.validateFloat = validateFloat;
function validateEnum(name, value, fieldErrors, members, parent) {
    if (parent === void 0) { parent = ''; }
    if (!members || members.length === 0) {
        fieldErrors[parent + name] = {
            message: 'no member',
            value: value,
        };
        return;
    }
    var enumValue = members.find(function (member) {
        return member === String(value);
    });
    if (!enumValue) {
        fieldErrors[parent + name] = {
            message: "should be one of the following; ['" + members.join("', '") + "']",
            value: value,
        };
        return;
    }
    return value;
}
exports.validateEnum = validateEnum;
function validateDate(name, value, fieldErrors, validators, parent) {
    if (parent === void 0) { parent = ''; }
    var momentDate = moment(String(value), moment.ISO_8601, true);
    if (!momentDate.isValid()) {
        var message = (validators && validators.isDate && validators.isDate.errorMsg) ? validators.isDate.errorMsg : "invalid ISO 8601 date format, i.e. YYYY-MM-DD";
        fieldErrors[parent + name] = {
            message: message,
            value: value,
        };
        return;
    }
    var dateValue = new Date(String(value));
    if (!validators) {
        return dateValue;
    }
    if (validators.minDate && validators.minDate.value) {
        var minDate = new Date(validators.minDate.value);
        if (minDate.getTime() > dateValue.getTime()) {
            fieldErrors[parent + name] = {
                message: validators.minDate.errorMsg || "minDate '" + validators.minDate.value + "'",
                value: value,
            };
            return;
        }
    }
    if (validators.maxDate && validators.maxDate.value) {
        var maxDate = new Date(validators.maxDate.value);
        if (maxDate.getTime() < dateValue.getTime()) {
            fieldErrors[parent + name] = {
                message: validators.maxDate.errorMsg || "maxDate '" + validators.maxDate.value + "'",
                value: value,
            };
            return;
        }
    }
    return dateValue;
}
exports.validateDate = validateDate;
function validateDateTime(name, value, fieldErrors, validators, parent) {
    if (parent === void 0) { parent = ''; }
    var momentDateTime = moment(String(value), moment.ISO_8601, true);
    if (!momentDateTime.isValid()) {
        var message = (validators && validators.isDateTime && validators.isDateTime.errorMsg) ? validators.isDateTime.errorMsg : "invalid ISO 8601 datetime format, i.e. YYYY-MM-DDTHH:mm:ss";
        fieldErrors[parent + name] = {
            message: message,
            value: value,
        };
        return;
    }
    var datetimeValue = new Date(String(value));
    if (!validators) {
        return datetimeValue;
    }
    if (validators.minDate && validators.minDate.value) {
        var minDate = new Date(validators.minDate.value);
        if (minDate.getTime() > datetimeValue.getTime()) {
            fieldErrors[parent + name] = {
                message: validators.minDate.errorMsg || "minDate '" + validators.minDate.value + "'",
                value: value,
            };
            return;
        }
    }
    if (validators.maxDate && validators.maxDate.value) {
        var maxDate = new Date(validators.maxDate.value);
        if (maxDate.getTime() < datetimeValue.getTime()) {
            fieldErrors[parent + name] = {
                message: validators.maxDate.errorMsg || "maxDate '" + validators.maxDate.value + "'",
                value: value,
            };
            return;
        }
    }
    return datetimeValue;
}
exports.validateDateTime = validateDateTime;
function validateString(name, value, fieldErrors, validators, parent) {
    if (parent === void 0) { parent = ''; }
    if (typeof value !== 'string') {
        var message = (validators && validators.isString && validators.isString.errorMsg) ? validators.isString.errorMsg : "invalid string value";
        fieldErrors[parent + name] = {
            message: message,
            value: value,
        };
        return;
    }
    var stringValue = String(value);
    if (!validators) {
        return stringValue;
    }
    if (validators.minLength && validators.minLength.value) {
        if (validators.minLength.value > stringValue.length) {
            fieldErrors[parent + name] = {
                message: validators.minLength.errorMsg || "minLength " + validators.minLength.value,
                value: value,
            };
            return;
        }
    }
    if (validators.maxLength && validators.maxLength.value) {
        if (validators.maxLength.value < stringValue.length) {
            fieldErrors[parent + name] = {
                message: validators.maxLength.errorMsg || "maxLength " + validators.maxLength.value,
                value: value,
            };
            return;
        }
    }
    if (validators.pattern && validators.pattern.value) {
        if (!validator.matches(String(stringValue), validators.pattern.value)) {
            fieldErrors[parent + name] = {
                message: validators.pattern.errorMsg || "Not match in '" + validators.pattern.value + "'",
                value: value,
            };
            return;
        }
    }
    return stringValue;
}
exports.validateString = validateString;
function validateBool(name, value, fieldErrors, validators, parent) {
    if (parent === void 0) { parent = ''; }
    if (value === undefined || value === null) {
        return false;
    }
    if (value === true || value === false) {
        return value;
    }
    if (String(value).toLowerCase() === 'true') {
        return true;
    }
    if (String(value).toLowerCase() === 'false') {
        return false;
    }
    var message = (validators && validators.isArray && validators.isArray.errorMsg) ? validators.isArray.errorMsg : "invalid boolean value";
    fieldErrors[parent + name] = {
        message: message,
        value: value,
    };
    return;
}
exports.validateBool = validateBool;
function validateArray(name, value, fieldErrors, schema, validators, parent) {
    if (parent === void 0) { parent = ''; }
    if (!schema || value === undefined || value === null) {
        var message = (validators && validators.isArray && validators.isArray.errorMsg) ? validators.isArray.errorMsg : "invalid array";
        fieldErrors[parent + name] = {
            message: message,
            value: value,
        };
        return;
    }
    var arrayValue = [];
    if (Array.isArray(value)) {
        arrayValue = value.map(function (elementValue, index) {
            return ValidateParam(schema, elementValue, models, "$" + index, fieldErrors, name + '.');
        });
    }
    else {
        arrayValue = [
            ValidateParam(schema, value, models, '$0', fieldErrors, name + '.'),
        ];
    }
    if (!validators) {
        return arrayValue;
    }
    if (validators.minItems && validators.minItems.value) {
        if (validators.minItems.value > arrayValue.length) {
            fieldErrors[parent + name] = {
                message: validators.minItems.errorMsg || "minItems " + validators.minItems.value,
                value: value,
            };
            return;
        }
    }
    if (validators.maxItems && validators.maxItems.value) {
        if (validators.maxItems.value < arrayValue.length) {
            fieldErrors[parent + name] = {
                message: validators.maxItems.errorMsg || "maxItems " + validators.maxItems.value,
                value: value,
            };
            return;
        }
    }
    if (validators.uniqueItems) {
        var unique = arrayValue.some(function (elem, index, arr) {
            var indexOf = arr.indexOf(elem);
            return indexOf > -1 && indexOf !== index;
        });
        if (unique) {
            fieldErrors[parent + name] = {
                message: validators.uniqueItems.errorMsg || "required unique array",
                value: value,
            };
            return;
        }
    }
    return arrayValue;
}
exports.validateArray = validateArray;
function validateBuffer(name, value) {
    return new Buffer(value);
}
function validateModel(name, value, refName, fieldErrors, parent) {
    if (parent === void 0) { parent = ''; }
    var modelDefinition = models[refName];
    if (modelDefinition) {
        var properties_1 = modelDefinition.properties;
        if (properties_1) {
            Object.keys(modelDefinition.properties).forEach(function (key) {
                var property = properties_1[key];
                value[key] = ValidateParam(property, value[key], models, key, fieldErrors, parent);
            });
        }
        var additionalProperties_1 = modelDefinition.additionalProperties;
        if (additionalProperties_1) {
            Object.keys(value).forEach(function (key) {
                var validatedValue = ValidateParam(additionalProperties_1, value[key], models, key, fieldErrors, parent);
                if (validatedValue) {
                    value[key] = validatedValue;
                }
                else {
                    fieldErrors[parent + '.' + key] = {
                        message: "No matching model found in additionalProperties to validate " + key,
                        value: key,
                    };
                }
            });
        }
        var enums = modelDefinition.enums;
        if (enums) {
            return validateEnum(name, value, fieldErrors, enums, parent);
        }
    }
    return value;
}
var ValidateError = (function () {
    function ValidateError(fields, message) {
        this.fields = fields;
        this.message = message;
        this.status = 400;
        this.name = 'ValidateError';
    }
    return ValidateError;
}());
exports.ValidateError = ValidateError;
//# sourceMappingURL=templateHelpers.js.map