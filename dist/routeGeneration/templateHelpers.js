"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var moment = require("moment");
var validator = require("validator");
var models = null;
function ValidateParam(schema, value, generatedModels, name, fieldErrors, parent) {
    if (name === void 0) { name = ''; }
    if (parent === void 0) { parent = ''; }
    models = generatedModels;
    if (value === undefined || value === null) {
        if (schema.required) {
            var message_1 = "'" + name + "' is a required " + schema.in + " parameter.";
            if (schema.validators) {
                Object.keys(schema.validators).forEach(function (key) {
                    if (key.startsWith('is')) {
                        message_1 = schema.validators[key].errorMsg;
                    }
                });
            }
            fieldErrors[parent + name] = {
                message: message_1,
                value: value
            };
            return;
        }
        else {
            return;
        }
    }
    switch (schema.typeName) {
        case 'string':
            return validateString(name, value, fieldErrors, schema.validators);
        case 'boolean':
            return validateBool(name, value, fieldErrors);
        case 'integer':
        case 'long':
            return validateInt(name, value, fieldErrors, schema.validators);
        case 'float':
        case 'double':
            return validateFloat(name, value, fieldErrors, schema.validators);
        case 'enum':
            return validateEnum(name, value, fieldErrors, schema.enumMembers);
        case 'array':
            return validateArray(name, value, fieldErrors, schema.array, schema.validators);
        case 'date':
            return validateDate(name, value, fieldErrors, schema.validators);
        case 'datetime':
            return validateDateTime(name, value, fieldErrors, schema.validators);
        case 'buffer':
            return validateBuffer(name, value);
        default:
            return validateModel(schema.typeName, value, fieldErrors, name + '.');
    }
}
exports.ValidateParam = ValidateParam;
function validateInt(name, numberValue, fieldErrors, validators, parent) {
    if (parent === void 0) { parent = ''; }
    if (!validator.isInt(numberValue + '')) {
        var message = 'Invalid integer number.';
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
            value: numberValue
        };
        return;
    }
    var value = validator.toInt(numberValue + '', 10);
    if (!validators) {
        return value;
    }
    if (validators.minimum && validators.minimum.value) {
        if (validators.minimum.value > value) {
            fieldErrors[parent + name] = {
                message: validators.minimum.errorMsg || "min " + validators.minimum.value,
                value: value,
            };
            return;
        }
    }
    if (validators.maximum && validators.maximum.value) {
        if (validators.maximum.value < value) {
            fieldErrors[parent + name] = {
                message: validators.maximum.errorMsg || "max " + validators.maximum.value,
                value: value,
            };
            return;
        }
    }
    return value;
}
function validateFloat(name, numberValue, fieldErrors, validators, parent) {
    if (parent === void 0) { parent = ''; }
    if (!validator.isFloat(numberValue + '')) {
        var message = 'Invalid float number.';
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
            value: numberValue
        };
        return;
    }
    var value = validator.toFloat(numberValue + '');
    if (!validators) {
        return value;
    }
    if (validators.minimum && validators.minimum.value) {
        if (validators.minimum.value > value) {
            fieldErrors[parent + name] = {
                message: validators.minimum.errorMsg || "min " + validators.minimum.value,
                value: value,
            };
            return;
        }
    }
    if (validators.maximum && validators.maximum.value) {
        if (validators.maximum.value < value) {
            fieldErrors[parent + name] = {
                message: validators.maximum.errorMsg || "max " + validators.maximum.value,
                value: value,
            };
            return;
        }
    }
    return value;
}
function validateEnum(name, enumValue, fieldErrors, members, parent) {
    if (parent === void 0) { parent = ''; }
    if (!members) {
        fieldErrors[parent + name] = {
            message: name + " no member.",
            value: enumValue
        };
        return;
    }
    var existValue = members.filter(function (m) { return m === enumValue; });
    if (!existValue || !enumValue.length || !existValue.length) {
        fieldErrors[parent + name] = {
            message: name + ' should be one of the following; ' + members.join(', '),
            value: enumValue
        };
        return;
    }
    return existValue[0];
}
function validateDate(name, dateValue, fieldErrors, validators, parent) {
    if (parent === void 0) { parent = ''; }
    var momentDate = moment(dateValue, 'YYYY-MM-DD');
    if (!momentDate.isValid()) {
        var message = (validators && validators.isDate && validators.isDate.errorMsg) ? validators.isDate.errorMsg : "Invalid ISO 8601 date format, i.e. YYYY-MM-DD";
        fieldErrors[parent + name] = {
            message: message,
            value: dateValue
        };
        return;
    }
    var value = new Date(dateValue);
    if (!validators) {
        return value;
    }
    if (validators.minDate && validators.minDate.value) {
        var minDate = new Date(validators.minDate.value);
        if (minDate.getTime() > value.getTime()) {
            fieldErrors[parent + name] = {
                message: validators.minDate.errorMsg || "minDate " + validators.minDate.value,
                value: dateValue,
            };
            return;
        }
    }
    if (validators.maxDate && validators.maxDate.value) {
        var maxDate = new Date(validators.maxDate.value);
        if (maxDate.getTime() < value.getTime()) {
            fieldErrors[parent + name] = {
                message: validators.maxDate.errorMsg || "maxDate " + validators.maxDate.value,
                value: dateValue,
            };
            return;
        }
    }
    return value;
}
function validateDateTime(name, datetimeValue, fieldErrors, validators, parent) {
    if (parent === void 0) { parent = ''; }
    var momentDateTime = moment(datetimeValue, moment.ISO_8601);
    if (!momentDateTime.isValid()) {
        var message = (validators && validators.isDateTime && validators.isDateTime.errorMsg) ? validators.isDateTime.errorMsg : "Invalid ISO 8601 datetime format, i.e. YYYY-MM-DDTHH:mm:ss";
        fieldErrors[parent + name] = {
            message: message,
            value: datetimeValue
        };
        return;
    }
    var value = new Date(datetimeValue);
    if (!validators) {
        return value;
    }
    if (validators.minDate && validators.minDate.value) {
        var minDate = new Date(validators.minDate.value);
        if (minDate.getTime() > value.getTime()) {
            fieldErrors[parent + name] = {
                message: validators.minDate.errorMsg || "minDate " + validators.minDate.value,
                value: datetimeValue,
            };
            return;
        }
    }
    if (validators.maxDate && validators.maxDate.value) {
        var maxDate = new Date(validators.maxDate.value);
        if (maxDate.getTime() < value.getTime()) {
            fieldErrors[parent + name] = {
                message: validators.maxDate.errorMsg || "maxDate " + validators.maxDate.value,
                value: datetimeValue,
            };
            return;
        }
    }
    return value;
}
function validateString(name, stringValue, fieldErrors, validators, parent) {
    if (parent === void 0) { parent = ''; }
    if (typeof stringValue !== 'string') {
        var message = (validators && validators.isString && validators.isString.errorMsg) ? validators.isString.errorMsg : "Invalid string value.";
        fieldErrors[parent + name] = {
            message: message,
            value: stringValue
        };
        return;
    }
    var value = stringValue.toString();
    if (!validators) {
        return value;
    }
    if (validators.minLength && validators.minLength.value) {
        if (validators.minLength.value > value.length) {
            fieldErrors[parent + name] = {
                message: validators.minLength.errorMsg || "minLength " + validators.minLength.value,
                value: stringValue,
            };
            return;
        }
    }
    if (validators.maxLength && validators.maxLength.value) {
        if (validators.maxLength.value < value.length) {
            fieldErrors[parent + name] = {
                message: validators.maxLength.errorMsg || "maxLength " + validators.maxLength.value,
                value: stringValue,
            };
            return;
        }
    }
    if (validators.pattern && validators.pattern.value) {
        if (!validator.matches(value, validators.pattern.value)) {
            fieldErrors[parent + name] = {
                message: validators.pattern.errorMsg || "Not match in '" + validators.pattern.value + "'.",
                value: stringValue,
            };
            return;
        }
    }
    return value;
}
function validateBool(name, boolValue, fieldErrors, validators, parent) {
    if (parent === void 0) { parent = ''; }
    if (boolValue === true || boolValue === false) {
        return boolValue;
    }
    if (boolValue.toLowerCase() === 'true') {
        return true;
    }
    if (boolValue.toLowerCase() === 'false') {
        return false;
    }
    var message = (validators && validators.isArray && validators.isArray.errorMsg) ? validators.isArray.errorMsg : "Invalid boolean value.";
    fieldErrors[parent + name] = {
        message: message,
        value: boolValue
    };
    return;
}
function validateModel(typeName, modelValue, fieldErrors, parent) {
    if (parent === void 0) { parent = ''; }
    var modelDefinition = models[typeName];
    if (modelDefinition) {
        if (modelDefinition.properties) {
            Object.keys(modelDefinition.properties).forEach(function (key) {
                var property = modelDefinition.properties[key];
                modelValue[key] = ValidateParam(property, modelValue[key], models, key, fieldErrors, parent);
            });
        }
        if (modelDefinition.additionalProperties) {
            Object.keys(modelValue).forEach(function (key) {
                var validatedValue = ValidateParam(modelDefinition.additionalProperties, modelValue[key], models, key, fieldErrors, parent);
                if (validatedValue) {
                    modelValue[key] = validatedValue;
                }
                else {
                    fieldErrors[parent + typeName + '.' + key] = {
                        message: "No matching model found in additionalProperties to validate " + key,
                        value: key
                    };
                }
            });
        }
    }
    return modelValue;
}
function validateArray(name, arrayValue, fieldErrors, schema, validators, parent) {
    if (parent === void 0) { parent = ''; }
    if (!schema || !Array.isArray(arrayValue)) {
        var message = (validators && validators.isArray && validators.isArray.errorMsg) ? validators.isArray.errorMsg : "Invalid array.";
        fieldErrors[parent + name] = {
            message: message,
            value: arrayValue
        };
        return;
    }
    var value = arrayValue.map(function (v) {
        return ValidateParam(schema, v, models, undefined, fieldErrors);
    });
    if (!validators) {
        return value;
    }
    ;
    if (validators.minItems && validators.minItems.value) {
        if (validators.minItems.value > value.length) {
            fieldErrors[parent + name] = {
                message: validators.minItems.errorMsg || "minItems " + validators.minItems.value,
                value: value
            };
            return;
        }
    }
    if (validators.maxItems && validators.maxItems.value) {
        if (validators.maxItems.value < value.length) {
            fieldErrors[parent + name] = {
                message: validators.maxItems.errorMsg || "maxItems " + validators.maxItems.value,
                value: value
            };
            return;
        }
    }
    if (validators.uniqueItems) {
        var unique = value.some(function (elem, index, arr) {
            var indexOf = arr.indexOf(elem);
            return indexOf > -1 && indexOf !== index;
        });
        if (unique) {
            fieldErrors[parent + name] = {
                message: validators.uniqueItems.errorMsg || "Required unique array.",
                value: value
            };
            return;
        }
    }
    return value;
}
function validateBuffer(name, value) {
    return new Buffer(value);
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