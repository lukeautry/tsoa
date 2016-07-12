export const templateHelpersContent = `
    function validateParam(typeData: any, value: any, name?: string) {
        if (value === undefined) {
            if (typeData.required) {
                throw new InvalidRequestException(name + ' is a required parameter.');
            } else {
                return undefined;
            }
        }

        switch (typeData.typeName) {
            case 'string':
                return validateString(value);
            case 'boolean':
                return validateBool(value, name);
            case 'number':
                return validateNumber(value, name);
            case 'array':
                return validateArray(value, typeData.arrayType, name);
            default:
                return validateModel(value, typeData.typeName);
        }
    }

    function validateNumber(numberValue: string, name: string): number {
        const parsedNumber = parseInt(numberValue, 10);
        if (isNaN(parsedNumber)) {
            throw new InvalidRequestException(name + ' should be a valid number.');
        }

        return parsedNumber;
    }

    function validateString(stringValue: string) {
        return stringValue.toString();
    }

    function validateBool(boolValue: any, name: string): boolean {
        if (boolValue === true || boolValue === false) { return boolValue; }
        if (boolValue.toLowerCase() === 'true') { return true; }
        if (boolValue.toLowerCase() === 'false') { return false; }

        throw new InvalidRequestException(name + ' should be valid boolean value.');
    }

    function validateModel(modelValue: any, typeName: string): any {
        const modelDefinition = models[typeName];

        Object.keys(modelDefinition).forEach((key: string) => {
            const property = modelDefinition[key];
            modelValue[key] = validateParam(property, modelValue[key], key);
        });

        return modelValue;
    }

    function validateArray(array: any[], arrayType: string, arrayName: string): any[] {
        return array.map(element => validateParam({
            required: true,
            typeName: arrayType,
        }, element));
    }

    interface Exception extends Error {
        status: number;
    }

    class InvalidRequestException implements Exception {
        public status = 400;
        public name = 'Invalid Request';

        constructor(public message: string) { }
    }
`;
