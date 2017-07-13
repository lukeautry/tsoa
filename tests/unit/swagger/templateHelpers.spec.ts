import * as chai from 'chai';
import 'mocha';
import * as templateHelpers from './../../../src/routeGeneration/templateHelpers';

const expect = chai.expect;

describe('templateHelpers', () => {

    describe('Integer validate', () => {
        it('should integer value', () => {
            const value = '10';
            const result = templateHelpers.validateInt('name', value, {});
            expect(result).to.equal(Number(value));
        });

        it('should invalid integer format', () => {
            const name = 'name';
            const value = '10.0';
            const error = {};
            const result = templateHelpers.validateInt(name, value, error);
            expect(result).to.equal(undefined);
            expect(error[name].message).to.equal(`invalid integer number`);
        });

        it('should interger validate', () => {
            const name = 'name';
            const value = '11';
            const error = {};
            const validator = { minimum: { value: 10 }, maximum: { value: 12 } };
            const result = templateHelpers.validateInt(name, value, error, validator);
            expect(result).to.equal(Number(value));
        });

        it('should invalid interger min validate', () => {
            const name = 'name';
            const value = '11';
            const error = {};
            const validator = { minimum: { value: 12 } };
            const result = templateHelpers.validateInt(name, value, error, validator);
            expect(result).to.equal(undefined);
            expect(error[name].message).to.equal(`min 12`);
        });

        it('should invalid interger max validate', () => {
            const name = 'name';
            const value = '11';
            const error = {};
            const validator = { maximum: { value: 10 } };
            const result = templateHelpers.validateInt(name, value, error, validator);
            expect(result).to.equal(undefined);
            expect(error[name].message).to.equal(`max 10`);
        });
    });

    describe('Float validate', () => {
        it('should float value', () => {
            const value = '10';
            const result = templateHelpers.validateFloat('name', value, {});
            expect(result).to.equal(Number(value));
        });

        it('should invalid float format', () => {
            const name = 'name';
            const value = 'Hello';
            const error = {};
            const result = templateHelpers.validateFloat(name, value, error);
            expect(result).to.equal(undefined);
            expect(error[name].message).to.equal(`invalid float number`);
        });

        it('should float validate', () => {
            const name = 'name';
            const value = '11.5';
            const error = {};
            const validator = { minimum: { value: 10 }, maximum: { value: 12 } };
            const result = templateHelpers.validateFloat(name, value, error, validator);
            expect(result).to.equal(Number(value));
        });

        it('should invalid float min validate', () => {
            const name = 'name';
            const value = '12.4';
            const error = {};
            const validator = { minimum: { value: 12.5 } };
            const result = templateHelpers.validateFloat(name, value, error, validator);
            expect(result).to.equal(undefined);
            expect(error[name].message).to.equal(`min 12.5`);
        });

        it('should invalid float max validate', () => {
            const name = 'name';
            const value = '10.6';
            const error = {};
            const validator = { maximum: { value: 10.5 } };
            const result = templateHelpers.validateFloat(name, value, error, validator);
            expect(result).to.equal(undefined);
            expect(error[name].message).to.equal(`max 10.5`);
        });
    });

    describe('Enum validate', () => {
        it('should enum number value', () => {
            const value = 1;
            const result = templateHelpers.validateEnum('name', value, {}, ['0', '1'] as any);
            expect(result).to.equal(value);
        });

        it('should enum string value', () => {
            const value = 'HELLO';
            const result = templateHelpers.validateEnum('name', value, {}, ['HELLO'] as any);
            expect(result).to.equal(value);
        });

        it('should enum no member', () => {
            const error: any = {};
            const name = 'name';
            const value = 'HI';
            const result = templateHelpers.validateEnum(name, value, error, [] as any);
            expect(result).to.equal(undefined);
            expect(error[name].message).to.equal(`no member`);
        });

        it('should enum out of member', () => {
            const error: any = {};
            const name = 'name';
            const value = 'SAY';
            const result = templateHelpers.validateEnum(name, value, error, ['HELLO', 'HI'] as any);
            expect(result).to.equal(undefined);
            expect(error[name].message).to.equal(`should be one of the following; ['HELLO', 'HI']`);
        });
    });

    describe('String validate', () => {
        it('should string value', () => {
            const value = 'Hello';
            const result = templateHelpers.validateString('name', value, {});
            expect(result).to.equal(value);
        });

        it('should string minLength validate', () => {
            const name = 'name';
            const value = 'AB';
            const error = {};
            const result = templateHelpers.validateString(name, value, error, { minLength: { value: 5 } });
            expect(result).to.equal(undefined);
            expect(error[name].message).to.equal(`minLength 5`);
        });

        it('should string maxLength validate', () => {
            const name = 'name';
            const value = 'ABCDE';
            const error = {};
            const result = templateHelpers.validateString(name, value, error, { maxLength: { value: 3 } });
            expect(result).to.equal(undefined);
            expect(error[name].message).to.equal(`maxLength 3`);
        });

        it('should string pattern validate', () => {
            const name = 'name';
            const value = 'ABC';
            const error = {};
            const result = templateHelpers.validateString(name, value, error, { pattern: { value: 'a-z' } });
            expect(result).to.equal(undefined);
            expect(error[name].message).to.equal(`Not match in 'a-z'`);
        });
    });

    describe('Date validate', () => {
        it('should date value', () => {
            const value = '2017-01-01';
            const result = templateHelpers.validateDate('name', value, {});
            expect(result).to.deep.equal(new Date(value));
        });

        it('should invalid date format', () => {
            const name = 'name';
            const value = '2017-33-11';
            const error = {};
            const result = templateHelpers.validateDate(name, value, error);
            expect(result).to.equal(undefined);
            expect(error[name].message).to.equal(`invalid ISO 8601 date format, i.e. YYYY-MM-DD`);
        });

        it('should date minDate validate', () => {
            const name = 'name';
            const value = '2017-06-01';
            const error = {};
            const result = templateHelpers.validateDate(name, value, error, { minDate: { value: '2017-07-01' } });
            expect(result).to.equal(undefined);
            expect(error[name].message).to.equal(`minDate '2017-07-01'`);
        });

        it('should string maxDate validate', () => {
            const name = 'name';
            const value = '2017-06-01';
            const error = {};
            const result = templateHelpers.validateDate(name, value, error, { maxDate: { value: '2017-05-01' } });
            expect(result).to.equal(undefined);
            expect(error[name].message).to.equal(`maxDate '2017-05-01'`);
        });
    });

    describe('DateTime validate', () => {
        it('should datetime value', () => {
            const value = '2017-12-30T00:00:00';
            const result = templateHelpers.validateDateTime('name', value, {});
            expect(result).to.deep.equal(new Date(value));
        });

        it('should invalid datetime format', () => {
            const name = 'name';
            const value = '2017-12-309i';
            const error = {};
            const result = templateHelpers.validateDateTime(name, value, error);
            expect(result).to.equal(undefined);
            expect(error[name].message).to.equal(`invalid ISO 8601 datetime format, i.e. YYYY-MM-DDTHH:mm:ss`);
        });

        it('should datetime minDate validate', () => {
            const name = 'name';
            const value = '2017-12-30T00:00:00';
            const error = {};
            const result = templateHelpers.validateDateTime(name, value, error, { minDate: { value: '2017-12-31T00:00:00' } });
            expect(result).to.equal(undefined);
            expect(error[name].message).to.equal(`minDate '2017-12-31T00:00:00'`);
        });

        it('should datetime maxDate validate', () => {
            const name = 'name';
            const value = '2017-12-30T00:00:00';
            const error = {};
            const result = templateHelpers.validateDateTime(name, value, error, { maxDate: { value: '2017-12-29T00:00:00' } });
            expect(result).to.equal(undefined);
            expect(error[name].message).to.equal(`maxDate '2017-12-29T00:00:00'`);
        });
    });

    describe('Array validate', () => {
        it('should array value', () => {
            const value = ['A', 'B', 'C'];
            const result = templateHelpers.validateArray('name', value, {}, { typeName: 'string' });
            expect(result).to.deep.equal(value);
        });

        it('should invalid array value', () => {
            const name = 'name';
            const value = ['A', 10, true];
            const error = {};
            const result = templateHelpers.validateArray(name, value, error, { typeName: 'integer' });
            expect(result).to.deep.equal([undefined, 10, undefined]);
            expect(error[`${name}.$0`].message).to.equal('invalid integer number');
            expect(error[`${name}.$0`].value).to.equal('A');
            expect(error[`${name}.$2`].message).to.equal('invalid integer number');
            expect(error[`${name}.$2`].value).to.equal(true);
        });

        it('should array minItems validate', () => {
            const name = 'name';
            const value = [80, 10, 199];
            const error = {};
            const result = templateHelpers.validateArray(name, value, error, { typeName: 'integer' }, { minItems: { value: 4 } });
            expect(result).to.equal(undefined);
            expect(error[name].message).to.equal(`minItems 4`);
        });

        it('should array maxItems validate', () => {
            const name = 'name';
            const value = [80, 10, 199];
            const error = {};
            const result = templateHelpers.validateArray(name, value, error, { typeName: 'integer' }, { maxItems: { value: 2 } });
            expect(result).to.equal(undefined);
            expect(error[name].message).to.equal(`maxItems 2`);
        });

        it('should array uniqueItems validate', () => {
            const name = 'name';
            const value = [10, 10, 20];
            const error = {};
            const result = templateHelpers.validateArray(name, value, error, { typeName: 'integer' }, { uniqueItems: {} });
            expect(result).to.equal(undefined);
            expect(error[name].message).to.equal(`required unique array`);
        });
    });
});
