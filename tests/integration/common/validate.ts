import { expect } from 'chai';
import 'mocha';
import { App } from 'supertest/types';
import { ValidateMapStringToAny, ValidateMapStringToNumber, ValidateModel } from '../../fixtures/testModel';
import { verifyGetRequest, verifyPostRequest } from '../utils';

export function registerValidateTests(app: App, basePath: string) {
  describe('Validate', () => {
    it('should valid minDate and maxDate validation of date type', () => {
      const minDate = '2019-01-01';
      const maxDate = '2015-01-01';
      return verifyGetRequest(
        app,
        basePath + `/Validate/parameter/date?minDateValue=${minDate}&maxDateValue=${maxDate}`,
        (_err, res) => {
          const { body } = res;
          expect(new Date(body.minDateValue)).to.deep.equal(new Date(minDate));
          expect(new Date(body.maxDateValue)).to.deep.equal(new Date(maxDate));
        },
        200,
      );
    });

    it('should invalid minDate and maxDate validation of date type', () => {
      const date = '2017-01-01';
      return verifyGetRequest(
        app,
        basePath + `/Validate/parameter/date?minDateValue=${date}&maxDateValue=${date}`,
        (err, _res) => {
          const body = JSON.parse(err.text);
          expect(body.fields.minDateValue.message).to.equal(`minDate '2018-01-01'`);
          expect(body.fields.minDateValue.value).to.equal(date);
          expect(body.fields.maxDateValue.message).to.equal(`maxDate '2016-01-01'`);
          expect(body.fields.maxDateValue.value).to.equal(date);
        },
        400,
      );
    });

    it('should valid minDate and maxDate validation of datetime type', () => {
      const minDate = '2019-01-01T00:00:00';
      const maxDate = '2015-01-01T00:00:00';
      return verifyGetRequest(
        app,
        basePath + `/Validate/parameter/datetime?minDateValue=${minDate}&maxDateValue=${maxDate}`,
        (_err, res) => {
          const { body } = res;
          expect(new Date(body.minDateValue)).to.deep.equal(new Date(minDate));
          expect(new Date(body.maxDateValue)).to.deep.equal(new Date(maxDate));
        },
        200,
      );
    });

    it('should invalid minDate and maxDate validation of datetime type', () => {
      const date = '2017-01-01T00:00:00';
      return verifyGetRequest(
        app,
        basePath + `/Validate/parameter/datetime?minDateValue=${date}&maxDateValue=${date}`,
        (err, _res) => {
          const body = JSON.parse(err.text);
          expect(body.fields.minDateValue.message).to.equal(`minDate '2018-01-01T00:00:00'`);
          expect(body.fields.minDateValue.value).to.equal(date);
          expect(body.fields.maxDateValue.message).to.equal(`maxDate '2016-01-01T00:00:00'`);
          expect(body.fields.maxDateValue.value).to.equal(date);
        },
        400,
      );
    });

    it('should valid max and min validation of integer type', () => {
      return verifyGetRequest(
        app,
        basePath + `/Validate/parameter/integer?value=6&value_max=2`,
        (_err, res) => {
          const { body } = res;
          expect(body.minValue).to.equal(6);
          expect(body.maxValue).to.equal(2);
        },
        200,
      );
    });

    it('should invalid max and min validation of integer type', () => {
      const value = 4;
      return verifyGetRequest(
        app,
        basePath + `/Validate/parameter/integer?value=${value}&value_max=${value}`,
        (err, _res) => {
          const body = JSON.parse(err.text);
          expect(body.fields.value.message).to.equal('min 5');
          expect(body.fields.value.value).to.equal(String(value));
          expect(body.fields.value_max.message).to.equal('max 3');
          expect(body.fields.value_max.value).to.equal(String(value));
        },
        400,
      );
    });

    it('should valid max and min validation of float type', () => {
      return verifyGetRequest(
        app,
        basePath + `/Validate/parameter/float?minValue=5.6&maxValue=3.4`,
        (_err, res) => {
          const { body } = res;
          expect(body.minValue).to.equal(5.6);
          expect(body.maxValue).to.equal(3.4);
        },
        200,
      );
    });

    it('should invalid max and min validation of float type', () => {
      const value = 4.5;
      return verifyGetRequest(
        app,
        basePath + `/Validate/parameter/float?minValue=${value}&maxValue=${value}`,
        (err, _res) => {
          const body = JSON.parse(err.text);
          expect(body.fields.minValue.message).to.equal('min 5.5');
          expect(body.fields.minValue.value).to.equal(String(value));
          expect(body.fields.maxValue.message).to.equal('max 3.5');
          expect(body.fields.maxValue.value).to.equal(String(value));
        },
        400,
      );
    });

    it('should valid validation of boolean type', () => {
      return verifyGetRequest(
        app,
        basePath + `/Validate/parameter/boolean?boolValue=true`,
        (_err, res) => {
          const { body } = res;
          expect(body.boolValue).to.equal(true);
        },
        200,
      );
    });

    it('should invalid validation of boolean type', () => {
      const value = 'true0001';
      return verifyGetRequest(
        app,
        basePath + `/Validate/parameter/boolean?boolValue=${value}`,
        (err, _res) => {
          const body = JSON.parse(err.text);
          expect(body.fields.boolValue.message).to.equal('boolValue');
          expect(body.fields.boolValue.value).to.equal(value);
        },
        400,
      );
    });

    it('should valid minLength, maxLength and pattern (quoted/unquoted) validation of string type', () => {
      return verifyGetRequest(
        app,
        basePath + `/Validate/parameter/string?minLength=abcdef&maxLength=ab&patternValue=aBcDf&quotedPatternValue=A`,
        (_err, res) => {
          const { body } = res;

          expect(body.minLength).to.equal('abcdef');
          expect(body.maxLength).to.equal('ab');
          expect(body.patternValue).to.equal('aBcDf');
          expect(body.quotedPatternValue).to.equal('A');
        },
        200,
      );
    });

    it('should invalid minLength, maxLength and pattern (quoted/unquoted) validation of string type', () => {
      const value = '1234';
      return verifyGetRequest(
        app,
        basePath + `/Validate/parameter/string?minLength=${value}&maxLength=${value}&patternValue=${value}&quotedPatternValue=A@`,
        (err, _res) => {
          const body = JSON.parse(err.text);

          expect(body.fields.minLength.message).to.equal('minLength 5');
          expect(body.fields.minLength.value).to.equal(value);
          expect(body.fields.maxLength.message).to.equal('maxLength 3');
          expect(body.fields.maxLength.value).to.equal(value);
          expect(body.fields.patternValue.message).to.equal("Not match in '^[a-zA-Z]+$'");
          expect(body.fields.patternValue.value).to.equal(value);
          expect(body.fields.quotedPatternValue.message).to.equal("Not match in '^([A-Z])(?!@)$'");
          expect(body.fields.quotedPatternValue.value).to.equal('A@');
        },
        400,
      );
    });

    it('should valid model validate', () => {
      const bodyModel = new ValidateModel();
      bodyModel.floatValue = 1.2;
      bodyModel.doubleValue = 1.2;
      bodyModel.intValue = 120;
      bodyModel.longValue = 120;
      bodyModel.booleanValue = true;
      bodyModel.arrayValue = [0, 2];
      bodyModel.dateValue = new Date('2017-01-01');
      bodyModel.datetimeValue = new Date('2017-01-01T00:00:00');

      bodyModel.numberMax10 = 10;
      bodyModel.numberMin5 = 5;
      bodyModel.stringMax10Lenght = 'abcdef';
      bodyModel.stringMin5Lenght = 'abcdef';
      bodyModel.stringPatternAZaz = 'aBcD';
      bodyModel.quotedStringPatternA = 'A';

      bodyModel.arrayMax5Item = [0, 1, 2, 3];
      bodyModel.arrayMin2Item = [0, 1];
      bodyModel.arrayUniqueItem = [0, 1, 2, 3];
      bodyModel.model = { value1: 'abcdef' };
      bodyModel.mixedUnion = { value1: '' };
      bodyModel.intersection = { value1: 'one', value2: 'two' };
      bodyModel.singleBooleanEnum = true;

      bodyModel.nestedObject = {
        floatValue: 1.2,
        doubleValue: 1.2,
        intValue: 120,
        longValue: 120,
        booleanValue: true,
        arrayValue: [0, 2],
        dateValue: new Date('2017-01-01'),
        datetimeValue: new Date('2017-01-01T00:00:00'),

        numberMax10: 10,
        numberMin5: 5,
        stringMax10Lenght: 'abcdef',
        stringMin5Lenght: 'abcdef',
        stringPatternAZaz: 'aBcD',
        quotedStringPatternA: 'A',

        arrayMax5Item: [0, 1, 2, 3],
        arrayMin2Item: [0, 1],
        arrayUniqueItem: [0, 1, 2, 3],
        model: { value1: 'abcdef' },
        mixedUnion: { value1: '' },
        intersection: { value1: 'one', value2: 'two' },
      };

      bodyModel.typeAliases = {
        word: 'word',
        fourtyTwo: 42,
        intersectionAlias: { value1: 'value1', value2: 'value2' },
        unionAlias: { value2: 'value2' },
        nOLAlias: { value1: 'value1', value2: 'value2' },
        genericAlias: 'genericString',
        genericAlias2: {
          id: 1,
        },
        forwardGenericAlias: { value1: 'value1' },
      };

      bodyModel.nullableTypes = {
        numberOrNull: 'null' as unknown as null,
        wordOrNull: null,
        maybeString: null,
        justNull: null,
        nestedNullable: { property: null },
      };

      return verifyPostRequest(
        app,
        basePath + `/Validate/body`,
        bodyModel,
        (_err, res) => {
          const { body } = res;

          expect(body.floatValue).to.equal(bodyModel.floatValue);
          expect(body.doubleValue).to.equal(bodyModel.doubleValue);
          expect(body.intValue).to.equal(bodyModel.intValue);
          expect(body.longValue).to.equal(bodyModel.longValue);
          expect(body.booleanValue).to.equal(bodyModel.booleanValue);
          expect(body.arrayValue).to.deep.equal(bodyModel.arrayValue);

          expect(new Date(body.dateValue)).to.deep.equal(new Date(bodyModel.dateValue));
          expect(new Date(body.datetimeValue)).to.deep.equal(new Date(bodyModel.datetimeValue));

          expect(body.numberMax10).to.equal(bodyModel.numberMax10);
          expect(body.numberMin5).to.equal(bodyModel.numberMin5);
          expect(body.stringMax10Lenght).to.equal(bodyModel.stringMax10Lenght);
          expect(body.stringMin5Lenght).to.equal(bodyModel.stringMin5Lenght);
          expect(body.stringPatternAZaz).to.equal(bodyModel.stringPatternAZaz);
          expect(body.quotedStringPatternA).to.equal(bodyModel.quotedStringPatternA);

          expect(body.arrayMax5Item).to.deep.equal(bodyModel.arrayMax5Item);
          expect(body.arrayMin2Item).to.deep.equal(bodyModel.arrayMin2Item);
          expect(body.arrayUniqueItem).to.deep.equal(bodyModel.arrayUniqueItem);
          expect(body.model).to.deep.equal(bodyModel.model);
          expect(body.mixedUnion).to.deep.equal(bodyModel.mixedUnion);
          expect(body.intersection).to.deep.equal(bodyModel.intersection);
          expect(body.singleBooleanEnum).to.deep.equal(bodyModel.singleBooleanEnum);

          expect(body.nestedObject.floatValue).to.equal(bodyModel.nestedObject.floatValue);
          expect(body.nestedObject.doubleValue).to.equal(bodyModel.nestedObject.doubleValue);
          expect(body.nestedObject.intValue).to.equal(bodyModel.nestedObject.intValue);
          expect(body.nestedObject.longValue).to.equal(bodyModel.nestedObject.longValue);
          expect(body.nestedObject.booleanValue).to.equal(bodyModel.nestedObject.booleanValue);
          expect(body.nestedObject.arrayValue).to.deep.equal(bodyModel.nestedObject.arrayValue);

          expect(new Date(body.nestedObject.dateValue)).to.deep.equal(new Date(bodyModel.nestedObject.dateValue));
          expect(new Date(body.nestedObject.datetimeValue)).to.deep.equal(new Date(bodyModel.nestedObject.datetimeValue));

          expect(body.nestedObject.numberMax10).to.equal(bodyModel.nestedObject.numberMax10);
          expect(body.nestedObject.numberMin5).to.equal(bodyModel.nestedObject.numberMin5);
          expect(body.nestedObject.stringMax10Lenght).to.equal(bodyModel.nestedObject.stringMax10Lenght);
          expect(body.nestedObject.stringMin5Lenght).to.equal(bodyModel.nestedObject.stringMin5Lenght);
          expect(body.nestedObject.stringPatternAZaz).to.equal(bodyModel.nestedObject.stringPatternAZaz);
          expect(body.nestedObject.quotedStringPatternA).to.equal(bodyModel.nestedObject.quotedStringPatternA);

          expect(body.nestedObject.arrayMax5Item).to.deep.equal(bodyModel.nestedObject.arrayMax5Item);
          expect(body.nestedObject.arrayMin2Item).to.deep.equal(bodyModel.nestedObject.arrayMin2Item);
          expect(body.nestedObject.arrayUniqueItem).to.deep.equal(bodyModel.nestedObject.arrayUniqueItem);
          expect(body.nestedObject.model).to.deep.equal(bodyModel.nestedObject.model);
          expect(body.nestedObject.mixedUnion).to.deep.equal(bodyModel.nestedObject.mixedUnion);
          expect(body.nestedObject.intersection).to.deep.equal(bodyModel.nestedObject.intersection);
          expect(body.typeAliases).to.deep.equal(bodyModel.typeAliases);

          expect(body.nullableTypes.numberOrNull).to.equal(null);
          expect(body.nullableTypes.wordOrNull).to.equal(bodyModel.nullableTypes.wordOrNull);
          expect(body.nullableTypes.maybeString).to.equal(bodyModel.nullableTypes.maybeString);
          expect(body.nullableTypes.justNull).to.equal(bodyModel.nullableTypes.justNull);
          expect(body.nullableTypes.nestedNullable.property).to.equal(bodyModel.nullableTypes.nestedNullable.property);
        },
        200,
      );
    });

    it('should invalid model validate', () => {
      const bodyModel = new ValidateModel();
      bodyModel.floatValue = '120a' as any;
      bodyModel.doubleValue = '120a' as any;
      bodyModel.intValue = 1.2;
      bodyModel.longValue = 1.2;
      bodyModel.booleanValue = 'abc' as any;
      bodyModel.dateValue = 'abc' as any;
      bodyModel.datetimeValue = 'abc' as any;

      bodyModel.numberMax10 = 20;
      bodyModel.numberMin5 = 0;
      bodyModel.stringMax10Lenght = 'abcdefghijk';
      bodyModel.stringMin5Lenght = 'abcd';
      bodyModel.stringPatternAZaz = 'ab01234';
      bodyModel.quotedStringPatternA = 'A';

      bodyModel.arrayMax5Item = [0, 1, 2, 3, 4, 6, 7, 8, 9];
      bodyModel.arrayMin2Item = [0];
      bodyModel.arrayUniqueItem = [0, 0, 1, 1];
      bodyModel.model = 1 as any;
      bodyModel.mixedUnion = 123 as any;
      bodyModel.intersection = { value1: 'one' } as any;
      bodyModel.singleBooleanEnum = false as true;

      bodyModel.nestedObject = {
        floatValue: '120a' as any,
        doubleValue: '120a' as any,
        intValue: 1.2,
        longValue: 1.2,
        booleanValue: 'abc' as any,
        dateValue: 'abc' as any,
        datetimeValue: 'abc' as any,

        numberMax10: 20,
        numberMin5: 0,
        stringMax10Lenght: 'abcdefghijk',
        stringMin5Lenght: 'abcd',
        stringPatternAZaz: 'ab01234',
        quotedStringPatternA: 'A@',

        arrayMax5Item: [0, 1, 2, 3, 4, 6, 7, 8, 9],
        arrayMin2Item: [0],
        arrayUniqueItem: [0, 0, 1, 1],
        model: 1 as any,
        mixedUnion: 123 as any,
        intersection: { value1: 'one' } as any,
      } as any;

      bodyModel.typeAliases = {
        word: '',
        fourtyTwo: 41,
        intersectionAlias: { value2: 'value2' },
        unionAlias: {},
        nOLAlias: true,
        genericAlias: new ValidateModel(),
        genericAlias2: {
          id2: 2,
        },
        forwardGenericAlias: 123,
      } as any;

      bodyModel.nullableTypes = {
        // numberOrNull
        wordOrNull: '',
        maybeString: 1,
        justNull: undefined,
      } as any;

      return verifyPostRequest(
        app,
        basePath + `/Validate/body`,
        bodyModel,
        (err, _res) => {
          const body = JSON.parse(err.text);

          expect(body.fields['body.floatValue'].message).to.equal('Invalid float error message.');
          expect(body.fields['body.floatValue'].value).to.be.undefined;
          expect(body.fields['body.doubleValue'].message).to.equal('Invalid double error message.');
          expect(body.fields['body.doubleValue'].value).to.be.undefined;
          expect(body.fields['body.intValue'].message).to.equal('invalid integer number');
          expect(body.fields['body.intValue'].value).to.be.undefined;
          expect(body.fields['body.longValue'].message).to.equal('Custom Required long number.');
          expect(body.fields['body.longValue'].value).to.be.undefined;
          expect(body.fields['body.booleanValue'].message).to.equal('invalid boolean value');
          expect(body.fields['body.booleanValue'].value).to.be.undefined;

          expect(body.fields['body.dateValue'].message).to.equal('invalid ISO 8601 date format, i.e. YYYY-MM-DD');
          expect(body.fields['body.dateValue'].value).to.be.undefined;
          expect(body.fields['body.datetimeValue'].message).to.equal('invalid ISO 8601 datetime format, i.e. YYYY-MM-DDTHH:mm:ss');
          expect(body.fields['body.datetimeValue'].value).to.be.undefined;

          expect(body.fields['body.numberMax10'].message).to.equal('max 10');
          expect(body.fields['body.numberMax10'].value).to.be.undefined;
          expect(body.fields['body.numberMin5'].message).to.equal('min 5');
          expect(body.fields['body.numberMin5'].value).to.be.undefined;
          expect(body.fields['body.stringMax10Lenght'].message).to.equal('maxLength 10');
          expect(body.fields['body.stringMax10Lenght'].value).to.be.undefined;
          expect(body.fields['body.stringMin5Lenght'].message).to.equal('minLength 5');
          expect(body.fields['body.stringMin5Lenght'].value).to.be.undefined;
          expect(body.fields['body.stringPatternAZaz'].message).to.equal("Not match in '^[a-zA-Z]+$'");
          expect(body.fields['body.stringPatternAZaz'].value).to.be.undefined;

          expect(body.fields['body.arrayMax5Item'].message).to.equal('maxItems 5');
          expect(body.fields['body.arrayMax5Item'].value).to.be.undefined;
          expect(body.fields['body.arrayMin2Item'].message).to.equal('minItems 2');
          expect(body.fields['body.arrayMin2Item'].value).to.be.undefined;
          expect(body.fields['body.arrayUniqueItem'].message).to.equal('required unique array');
          expect(body.fields['body.arrayUniqueItem'].value).to.be.undefined;
          expect(body.fields['body.model'].message).to.equal('invalid object');
          expect(body.fields['body.model'].value).to.be.undefined;
          expect(body.fields['body.mixedUnion'].message).to.equal(
            'Could not match the union against any of the items. ' +
              'Issues: [{"body.mixedUnion":{"message":"invalid string value","value":123}},' +
              '{"body.mixedUnion":{"message":"invalid object","value":123}}]',
          );
          expect(body.fields['body.intersection'].message).to.equal('Could not match the intersection against every type. Issues: [{"body.intersection.value2":{"message":"\'value2\' is required"}}]');
          expect(body.fields['body.singleBooleanEnum'].message).to.equal('should be one of the following; [true]');

          expect(body.fields['body.nestedObject.floatValue'].message).to.equal('Invalid float error message.');
          expect(body.fields['body.nestedObject.floatValue'].value).to.be.undefined;
          expect(body.fields['body.nestedObject.doubleValue'].message).to.equal('Invalid double error message.');
          expect(body.fields['body.nestedObject.doubleValue'].value).to.be.undefined;
          expect(body.fields['body.nestedObject.intValue'].message).to.equal('invalid integer number');
          expect(body.fields['body.nestedObject.intValue'].value).to.be.undefined;
          expect(body.fields['body.nestedObject.longValue'].message).to.equal('Custom Required long number.');
          expect(body.fields['body.nestedObject.longValue'].value).to.be.undefined;
          expect(body.fields['body.nestedObject.booleanValue'].message).to.equal('invalid boolean value');
          expect(body.fields['body.nestedObject.booleanValue'].value).to.be.undefined;

          expect(body.fields['body.nestedObject.dateValue'].message).to.equal('invalid ISO 8601 date format, i.e. YYYY-MM-DD');
          expect(body.fields['body.nestedObject.dateValue'].value).to.be.undefined;
          expect(body.fields['body.nestedObject.datetimeValue'].message).to.equal('invalid ISO 8601 datetime format, i.e. YYYY-MM-DDTHH:mm:ss');
          expect(body.fields['body.nestedObject.datetimeValue'].value).to.be.undefined;

          expect(body.fields['body.nestedObject.numberMax10'].message).to.equal('max 10');
          expect(body.fields['body.nestedObject.numberMax10'].value).to.be.undefined;
          expect(body.fields['body.nestedObject.numberMin5'].message).to.equal('min 5');
          expect(body.fields['body.nestedObject.numberMin5'].value).to.be.undefined;
          expect(body.fields['body.nestedObject.stringMax10Lenght'].message).to.equal('maxLength 10');
          expect(body.fields['body.nestedObject.stringMax10Lenght'].value).to.be.undefined;
          expect(body.fields['body.nestedObject.stringMin5Lenght'].message).to.equal('minLength 5');
          expect(body.fields['body.nestedObject.stringMin5Lenght'].value).to.be.undefined;
          expect(body.fields['body.nestedObject.stringPatternAZaz'].message).to.equal("Not match in '^[a-zA-Z]+$'");
          expect(body.fields['body.nestedObject.stringPatternAZaz'].value).to.be.undefined;

          expect(body.fields['body.nestedObject.arrayMax5Item'].message).to.equal('maxItems 5');
          expect(body.fields['body.nestedObject.arrayMax5Item'].value).to.be.undefined;
          expect(body.fields['body.nestedObject.arrayMin2Item'].message).to.equal('minItems 2');
          expect(body.fields['body.nestedObject.arrayMin2Item'].value).to.be.undefined;
          expect(body.fields['body.nestedObject.arrayUniqueItem'].message).to.equal('required unique array');
          expect(body.fields['body.nestedObject.arrayUniqueItem'].value).to.be.undefined;
          expect(body.fields['body.nestedObject.model'].message).to.equal('invalid object');
          expect(body.fields['body.nestedObject.model'].value).to.be.undefined;
          expect(body.fields['body.nestedObject.mixedUnion'].message).to.equal(
            'Could not match the union against any of the items. ' +
              'Issues: [{"body.nestedObject.mixedUnion":{"message":"invalid string value","value":123}},' +
              '{"body.nestedObject.mixedUnion":{"message":"invalid object","value":123}}]',
          );
          expect(body.fields['body.nestedObject.intersection'].message).to.equal(
            'Could not match the intersection against every type. Issues: [{"body.nestedObject.intersection.value2":{"message":"\'value2\' is required"}}]',
          );
          expect(body.fields['body.typeAliases.word'].message).to.equal('minLength 1');
          expect(body.fields['body.typeAliases.fourtyTwo'].message).to.equal('min 42');
          expect(body.fields['body.typeAliases.unionAlias'].message).to.contain('Could not match the union against any of the items');
          expect(body.fields['body.typeAliases.intersectionAlias'].message).to.equal(
            `Could not match the intersection against every type. Issues: [{"body.typeAliases.intersectionAlias.value1":{"message":"'value1' is required"}},{"body.typeAliases.intersectionAlias.value1":{"message":"'value1' is required"}}]`,
          );
          expect(body.fields['body.typeAliases.nOLAlias'].message).to.equal('invalid object');
          expect(body.fields['body.typeAliases.genericAlias'].message).to.equal('invalid string value');
          expect(body.fields['body.typeAliases.genericAlias2.id'].message).to.equal("'id' is required");
          expect(body.fields['body.typeAliases.forwardGenericAlias'].message).to.contain('Could not match the union against any of the items.');
          expect(body.fields['body.nullableTypes.numberOrNull'].message).to.equal("'numberOrNull' is required");
          expect(body.fields['body.nullableTypes.maybeString'].message).to.equal(
            `Could not match the union against any of the items. Issues: [{"body.nullableTypes.maybeString":{"message":"invalid string value","value":1}},{"body.nullableTypes.maybeString":{"message":"should be one of the following; [null]","value":1}}]`,
          );
          expect(body.fields['body.nullableTypes.wordOrNull'].message).to.equal(
            `Could not match the union against any of the items. Issues: [{"body.nullableTypes.wordOrNull":{"message":"minLength 1","value":""}},{"body.nullableTypes.wordOrNull":{"message":"should be one of the following; [null]","value":""}}]`,
          );
          expect(body.fields['body.nullableTypes.justNull'].message).to.equal("'justNull' is required");
        },
        400,
      );
    });

    describe('BodyProp', () => {
      it('should valid body props validate', () => {
        return verifyPostRequest(
          app,
          basePath + `/Validate/body-prop`,
          { name: 'Nick Yang' },
          (_err, res) => {
            const { body } = res;

            expect(body.name).to.equal('Nick Yang-validated');
          },
          200,
        );
      });

      it('should invalid body props missing required field', () => {
        return verifyPostRequest(
          app,
          basePath + `/Validate/body-prop`,
          { 'incorrect-field': 'incorrect' },
          (err, _res) => {
            const body = JSON.parse(err.text);

            expect(body.fields['body.name'].message).to.equal("'name' is required");
            expect(body.fields['body.name'].value).to.be.undefined;
          },
          400,
        );
      });

      it('should invalid body props incorrect type', () => {
        return verifyPostRequest(
          app,
          basePath + `/Validate/body-prop`,
          { name: 1234 },
          (err, _res) => {
            const body = JSON.parse(err.text);

            expect(body.fields['body.name'].message).to.equal('invalid string value');
            expect(body.fields['body.name'].value).to.be.undefined;
          },
          400,
        );
      });
    });

    it('should custom required error message', () => {
      return verifyGetRequest(
        app,
        basePath + `/Validate/parameter/customRequiredErrorMsg`,
        (err, _res) => {
          const body = JSON.parse(err.text);
          expect(body.fields.longValue.message).to.equal('Required long number.');
        },
        400,
      );
    });

    it('should custom invalid datatype error message', () => {
      const value = '112ab';
      return verifyGetRequest(
        app,
        basePath + `/Validate/parameter/customInvalidErrorMsg?longValue=${value}`,
        (err, _res) => {
          const body = JSON.parse(err.text);
          expect(body.fields.longValue.message).to.equal('Invalid long number.');
        },
        400,
      );
    });

    it('should validate string-to-number dictionary body', () => {
      const data: ValidateMapStringToNumber = {
        key1: 0,
        key2: 1,
        key3: -1,
      };
      return verifyPostRequest(app, basePath + '/Validate/map', data, (_err, res) => {
        const response = res.body as number[];
        expect(response.sort()).to.eql([-1, 0, 1]);
      });
    });

    it('should reject string-to-string dictionary body', () => {
      const data: object = {
        key1: 'val0',
        key2: 'val1',
        key3: '-val1',
      };
      return verifyPostRequest(
        app,
        basePath + '/Validate/map',
        data,
        (err, _res) => {
          const body = JSON.parse(err.text);
          expect(body.fields['map.key1'].message).to.eql('No matching model found in additionalProperties to validate key1');
        },
        400,
      );
    });

    it('should validate string-to-any dictionary body', () => {
      const data: ValidateMapStringToAny = {
        key1: '0',
        key2: 1,
        key3: -1,
      };
      return verifyPostRequest(app, basePath + '/Validate/mapAny', data, (_err, res) => {
        const response = res.body as any[];
        expect(response.sort()).to.eql([-1, '0', 1]);
      });
    });

    it('should validate string-to-any dictionary body with falsy values', () => {
      const data: ValidateMapStringToAny = {
        array: [],
        false: false,
        null: null,
        string: '',
        zero: 0,
      };
      return verifyPostRequest(app, basePath + '/Validate/mapAny', data, (_err, res) => {
        const response = res.body as any[];
        expect(response.sort()).to.eql([[], '', 0, false, null]);
      });
    });
  });
}
