import { expect } from 'chai';
import 'mocha';
import * as request from 'supertest';
import { app } from '../fixtures/express-openapi3/server';
import { TestModel, ValidateModel } from '../fixtures/testModel';
import TestAgent = require('supertest/lib/agent');

const basePath = '/v1';

describe('OpenAPI3 Express Server', () => {
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
      intersectionAlias2: { value1: 'value1', value2: 'value2', value3: 'string' },
      unionIntersectionAlias1: { value1: 'one', value3: 'three' },
      unionIntersectionAlias2: { value1: 'one', value4: 'four' },
      unionIntersectionAlias3: { value2: 'two', value3: 'three' },
      unionIntersectionAlias4: { value2: 'two', value4: 'four' },
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
      basePath + `/Validate/body`,
      bodyModel,
      (err, res) => {
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

        expect(body.fields).to.equal(undefined);
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
    bodyModel.intersection = { value1: '' } as any;
    bodyModel.intersectionNoAdditional = { value1: '', value2: '', value3: 123, value4: 123 } as any;
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
      intersectionAlias2: { value1: 'value1', value2: 'value2', value4: 'test' },
      unionIntersectionAlias1: { value1: 'one', value2: 'two', value3: 'three' },
      unionIntersectionAlias2: { value1: 'one' },
      unionIntersectionAlias3: { value1: 'one', value2: 'two', value3: 'three' },
      unionIntersectionAlias4: { value2: 2, value4: 'four' },
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
      basePath + `/Validate/body`,
      bodyModel,
      (err, _res) => {
        const body = JSON.parse(err.text);

        expect(body.fields['body.floatValue'].message).to.equal('Invalid float error message.');
        expect(body.fields['body.floatValue'].value).to.equal(bodyModel.floatValue);
        expect(body.fields['body.doubleValue'].message).to.equal('Invalid double error message.');
        expect(body.fields['body.doubleValue'].value).to.equal(bodyModel.doubleValue);
        expect(body.fields['body.intValue'].message).to.equal('invalid integer number');
        expect(body.fields['body.intValue'].value).to.equal(bodyModel.intValue);
        expect(body.fields['body.longValue'].message).to.equal('Custom Required long number.');
        expect(body.fields['body.longValue'].value).to.equal(bodyModel.longValue);
        expect(body.fields['body.booleanValue'].message).to.equal('invalid boolean value');
        expect(body.fields['body.booleanValue'].value).to.equal(bodyModel.booleanValue);

        expect(body.fields['body.dateValue'].message).to.equal('invalid ISO 8601 date format, i.e. YYYY-MM-DD');
        expect(body.fields['body.dateValue'].value).to.equal(bodyModel.dateValue);
        expect(body.fields['body.datetimeValue'].message).to.equal('invalid ISO 8601 datetime format, i.e. YYYY-MM-DDTHH:mm:ss');
        expect(body.fields['body.datetimeValue'].value).to.equal(bodyModel.datetimeValue);

        expect(body.fields['body.numberMax10'].message).to.equal('max 10');
        expect(body.fields['body.numberMax10'].value).to.equal(bodyModel.numberMax10);
        expect(body.fields['body.numberMin5'].message).to.equal('min 5');
        expect(body.fields['body.numberMin5'].value).to.equal(bodyModel.numberMin5);
        expect(body.fields['body.stringMax10Lenght'].message).to.equal('maxLength 10');
        expect(body.fields['body.stringMax10Lenght'].value).to.equal(bodyModel.stringMax10Lenght);
        expect(body.fields['body.stringMin5Lenght'].message).to.equal('minLength 5');
        expect(body.fields['body.stringMin5Lenght'].value).to.equal(bodyModel.stringMin5Lenght);
        expect(body.fields['body.stringPatternAZaz'].message).to.equal("Not match in '^[a-zA-Z]+$'");
        expect(body.fields['body.stringPatternAZaz'].value).to.equal(bodyModel.stringPatternAZaz);

        expect(body.fields['body.arrayMax5Item'].message).to.equal('maxItems 5');
        expect(body.fields['body.arrayMax5Item'].value).to.deep.equal(bodyModel.arrayMax5Item);
        expect(body.fields['body.arrayMin2Item'].message).to.equal('minItems 2');
        expect(body.fields['body.arrayMin2Item'].value).to.deep.equal(bodyModel.arrayMin2Item);
        expect(body.fields['body.arrayUniqueItem'].message).to.equal('required unique array');
        expect(body.fields['body.arrayUniqueItem'].value).to.deep.equal(bodyModel.arrayUniqueItem);
        expect(body.fields['body.intersection'].message).to.deep.equal(
          'Could not match the intersection against every type. Issues: [{"body.intersection.value2":{"message":"\'value2\' is required"}}]',
        );
        expect(body.fields['body.intersection'].value).to.deep.equal(bodyModel.intersection);
        expect(body.fields['body.intersectionNoAdditional'].message).to.deep.equal('Could not match intersection against any of the possible combinations: [["value1","value2"]]');
        expect(body.fields['body.intersectionNoAdditional'].value).to.deep.equal(bodyModel.intersectionNoAdditional);
        expect(body.fields['body.mixedUnion'].message).to.equal(
          'Could not match the union against any of the items. ' +
            'Issues: [{"body.mixedUnion":{"message":"invalid string value","value":123}},' +
            '{"body.mixedUnion":{"message":"invalid object","value":123}}]',
        );
        expect(body.fields['body.intersection'].message).to.equal('Could not match the intersection against every type. Issues: [{"body.intersection.value2":{"message":"\'value2\' is required"}}]');
        expect(body.fields['body.singleBooleanEnum'].message).to.equal('should be one of the following; [true]');

        expect(body.fields['body.nestedObject.floatValue'].message).to.equal('Invalid float error message.');
        expect(body.fields['body.nestedObject.floatValue'].value).to.equal(bodyModel.floatValue);
        expect(body.fields['body.nestedObject.doubleValue'].message).to.equal('Invalid double error message.');
        expect(body.fields['body.nestedObject.doubleValue'].value).to.equal(bodyModel.doubleValue);
        expect(body.fields['body.nestedObject.intValue'].message).to.equal('invalid integer number');
        expect(body.fields['body.nestedObject.intValue'].value).to.equal(bodyModel.intValue);
        expect(body.fields['body.nestedObject.longValue'].message).to.equal('Custom Required long number.');
        expect(body.fields['body.nestedObject.longValue'].value).to.equal(bodyModel.longValue);
        expect(body.fields['body.nestedObject.booleanValue'].message).to.equal('invalid boolean value');
        expect(body.fields['body.nestedObject.booleanValue'].value).to.equal(bodyModel.booleanValue);

        expect(body.fields['body.nestedObject.dateValue'].message).to.equal('invalid ISO 8601 date format, i.e. YYYY-MM-DD');
        expect(body.fields['body.nestedObject.dateValue'].value).to.equal(bodyModel.dateValue);
        expect(body.fields['body.nestedObject.datetimeValue'].message).to.equal('invalid ISO 8601 datetime format, i.e. YYYY-MM-DDTHH:mm:ss');
        expect(body.fields['body.nestedObject.datetimeValue'].value).to.equal(bodyModel.datetimeValue);

        expect(body.fields['body.nestedObject.numberMax10'].message).to.equal('max 10');
        expect(body.fields['body.nestedObject.numberMax10'].value).to.equal(bodyModel.numberMax10);
        expect(body.fields['body.nestedObject.numberMin5'].message).to.equal('min 5');
        expect(body.fields['body.nestedObject.numberMin5'].value).to.equal(bodyModel.numberMin5);
        expect(body.fields['body.nestedObject.stringMax10Lenght'].message).to.equal('maxLength 10');
        expect(body.fields['body.nestedObject.stringMax10Lenght'].value).to.equal(bodyModel.stringMax10Lenght);
        expect(body.fields['body.nestedObject.stringMin5Lenght'].message).to.equal('minLength 5');
        expect(body.fields['body.nestedObject.stringMin5Lenght'].value).to.equal(bodyModel.stringMin5Lenght);
        expect(body.fields['body.nestedObject.stringPatternAZaz'].message).to.equal("Not match in '^[a-zA-Z]+$'");
        expect(body.fields['body.nestedObject.stringPatternAZaz'].value).to.equal(bodyModel.stringPatternAZaz);

        expect(body.fields['body.nestedObject.arrayMax5Item'].message).to.equal('maxItems 5');
        expect(body.fields['body.nestedObject.arrayMax5Item'].value).to.deep.equal(bodyModel.arrayMax5Item);
        expect(body.fields['body.nestedObject.arrayMin2Item'].message).to.equal('minItems 2');
        expect(body.fields['body.nestedObject.arrayMin2Item'].value).to.deep.equal(bodyModel.arrayMin2Item);
        expect(body.fields['body.nestedObject.arrayUniqueItem'].message).to.equal('required unique array');
        expect(body.fields['body.nestedObject.arrayUniqueItem'].value).to.deep.equal(bodyModel.arrayUniqueItem);
        expect(body.fields['body.nestedObject.model'].message).to.equal('invalid object');
        expect(body.fields['body.nestedObject.model'].value).to.deep.equal(bodyModel.model);
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
        expect(body.fields['body.typeAliases.genericAlias2.id2'].message).to.equal('"id2" is an excess property and therefore is not allowed');
        expect(body.fields['body.typeAliases.forwardGenericAlias'].message).to.contain('Could not match the union against any of the items.');
        expect(body.fields['body.typeAliases.intersectionAlias2'].message).to.equal(
          `Could not match the intersection against every type. Issues: [{"body.typeAliases.intersectionAlias2.value3":{"message":"'value3' is required"}}]`,
        );
        expect(body.fields['body.typeAliases.intersectionAlias2'].message).to.equal(
          `Could not match the intersection against every type. Issues: [{"body.typeAliases.intersectionAlias2.value3":{"message":"'value3' is required"}}]`,
        );
        expect(body.fields['body.typeAliases.unionIntersectionAlias1'].message).to.equal(
          'Could not match intersection against any of the possible combinations: [["value1","value3"],["value1","value4"],["value2","value3"],["value2","value4"]]',
        );
        expect(body.fields['body.typeAliases.unionIntersectionAlias2'].message).to.equal(
          `Could not match the intersection against every type. Issues: [{"body.typeAliases.unionIntersectionAlias2":{"message":"Could not match the union against any of the items. Issues: [{\\"body.typeAliases.unionIntersectionAlias2.value3\\":{\\"message\\":\\"'value3' is required\\"}},{\\"body.typeAliases.unionIntersectionAlias2.value4\\":{\\"message\\":\\"'value4' is required\\"}}]","value":{"value1":"one"}}}]`,
        );
        expect(body.fields['body.typeAliases.unionIntersectionAlias3'].message).to.equal(
          'Could not match intersection against any of the possible combinations: [["value1","value3"],["value1","value4"],["value2","value3"],["value2","value4"]]',
        );
        expect(body.fields['body.typeAliases.unionIntersectionAlias4'].message).to.equal(
          `Could not match the intersection against every type. Issues: [{"body.typeAliases.unionIntersectionAlias4":{"message":"Could not match the union against any of the items. Issues: [{\\"body.typeAliases.unionIntersectionAlias4.value1\\":{\\"message\\":\\"'value1' is required\\"}},{\\"body.typeAliases.unionIntersectionAlias4.value2\\":{\\"message\\":\\"invalid string value\\",\\"value\\":2}}]","value":{"value2":2,"value4":"four"}}}]`,
        );
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

  describe('@Res', () => {
    it('Should return on @Res', () => {
      return verifyGetRequest(
        basePath + '/GetTest/Res',
        (_err, res) => {
          const model = res.body as TestModel;
          expect(model.id).to.equal(1);
          expect(res.get('custom-header')).to.eq('hello');
        },
        400,
      );
    });

    it('Should return on @Res with alias', () => {
      return verifyGetRequest(
        basePath + '/GetTest/Res_Alias',
        (_err, res) => {
          const model = res.body as TestModel;
          expect(model.id).to.equal(1);
          expect(res.get('name')).to.equal('some_thing');
        },
        400,
      );
    });

    [400, 500].forEach(statusCode => {
      it('Should support multiple status codes with the same @Res structure', () => {
        return verifyGetRequest(
          basePath + `/GetTest/MultipleStatusCodeRes?statusCode=${statusCode}`,
          (_err, res) => {
            const model = res.body as TestModel;
            expect(model.id).to.equal(1);
            expect(res.get('custom-header')).to.eq('hello');
          },
          statusCode,
        );
      });

      it('Should support multiple status codes with the same @Res structure with alias', () => {
        return verifyGetRequest(
          basePath + `/GetTest/MultipleStatusCodeRes_Alias?statusCode=${statusCode}`,
          (_err, res) => {
            const model = res.body as TestModel;
            expect(model.id).to.equal(1);
            expect(res.get('name')).to.eq('combine');
          },
          statusCode,
        );
      });
    });

    it('Should not modify the response after headers sent', () => {
      return verifyGetRequest(
        basePath + '/GetTest/MultipleRes',
        (_err, res) => {
          const model = res.body as TestModel;
          expect(model.id).to.equal(1);
          expect(res.get('custom-header')).to.eq('hello');
        },
        400,
      );
    });

    it('Should not modify the response after headers sent with alias', () => {
      return verifyGetRequest(
        basePath + '/GetTest/MultipleRes_Alias',
        (_err, res) => {
          const model = res.body as TestModel;
          expect(model.id).to.equal(1);
          expect(res.get('name')).to.eq('some_thing');
        },
        400,
      );
    });
  });

  function verifyGetRequest(path: string, verifyResponse: (err: any, res: request.Response) => any, expectedStatus?: number) {
    return verifyRequest(verifyResponse, request => request.get(path), expectedStatus);
  }

  function verifyPostRequest(path: string, data: any, verifyResponse: (err: any, res: request.Response) => any, expectedStatus?: number) {
    return verifyRequest(verifyResponse, request => request.post(path).send(data), expectedStatus);
  }

  function verifyRequest(verifyResponse: (err: any, res: request.Response) => any, methodOperation: (request: TestAgent<request.Test>) => request.Test, expectedStatus = 200) {
    return new Promise<void>((resolve, reject) => {
      methodOperation(request(app))
        .expect(expectedStatus)
        .end((err: any, res: any) => {
          let parsedError: any;
          try {
            parsedError = JSON.parse(res.error);
          } catch (err) {
            parsedError = res?.error;
          }

          if (err) {
            reject({
              error: err,
              response: parsedError,
            });
            return;
          }

          verifyResponse(parsedError, res);
          resolve();
        });
    });
  }
});
