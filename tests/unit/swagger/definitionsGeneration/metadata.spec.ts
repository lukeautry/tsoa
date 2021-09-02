import { expect } from 'chai';
import 'mocha';
import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { Tsoa } from '@tsoa/runtime';
import { SpecGenerator2 } from '@tsoa/cli/swagger/specGenerator2';
import { getDefaultExtendedOptions } from '../../../fixtures/defaultOptions';

describe('Metadata generation', () => {
  const metadata = new MetadataGenerator('./fixtures/controllers/getController.ts').Generate();

  describe('ControllerGenerator', () => {
    it('should generate one controller', () => {
      expect(metadata.controllers.length).to.equal(1);
      expect(metadata.controllers[0].name).to.equal('GetTestController');
      expect(metadata.controllers[0].path).to.equal('GetTest');
    });
  });

  describe('InvalidExtensionControllerGenerator', () => {
    it('should throw an Error when an attribute is not prefixed with "x-"', () => {
      expect(() => {
        new MetadataGenerator('./fixtures/controllers/invalidExtensionController.ts').Generate();
      }).to.throw('Extensions must begin with "x-" to be valid. Please see the following link for more information: https://swagger.io/docs/specification/openapi-extensions/');
    });
  });

  describe('DynamicControllerGenerator', () => {
    it("should should throw 'globs found 0 controllers.'", () => {
      expect(() => {
        // Non existing controllers folder to get 0 controllers found error
        const NON_CONTROLLER_EXISTS_GLOB = './unit/swagger';
        new MetadataGenerator('./fixtures/express-dynamic-controllers/server.ts', undefined, [], [NON_CONTROLLER_EXISTS_GLOB]).Generate();
      }).to.throw(/globs found 0 controllers./);
    });
  });

  describe('MethodGenerator', () => {
    const parameterMetadata = new MetadataGenerator('./fixtures/controllers/methodController.ts').Generate();
    const controller = parameterMetadata.controllers[0];
    const definedMethods = [
      'optionsMethod',
      'getMethod',
      'postMethod',
      'patchMethod',
      'putMethod',
      'deleteMethod',
      'description',
      'tags',
      'multiResponse',
      'decoratorVariousValues',
      'successResponse',
      'oauthOrAPIkeySecurity',
      'apiSecurity',
      'oauthSecurity',
      'extension',
      'deprecatedMethod',
      'summaryMethod',
      'oauthAndAPIkeySecurity',
      'returnAnyType',
      'returnAliasedVoidType',
    ];

    it('should only generate the defined methods', () => {
      expect(controller.methods.filter(m => definedMethods.indexOf(m.name) === -1).length).to.equal(0);
    });

    it('should generate the defined methods', () => {
      expect(definedMethods.filter(methodName => controller.methods.map(m => m.name).indexOf(methodName) === -1).length).to.equal(0);
    });

    it('should generate options method', () => {
      const method = controller.methods.find(m => m.name === 'optionsMethod');
      if (!method) {
        throw new Error('Method optionsMethod no detined!');
      }

      expect(method.method).to.equal('options');
      expect(method.path).to.equal('Options');
    });

    it('should generate get method', () => {
      const method = controller.methods.find(m => m.name === 'getMethod');
      if (!method) {
        throw new Error('Method getMethod not defined!');
      }

      expect(method.method).to.equal('get');
      expect(method.path).to.equal('Get');
    });

    it('should generate post method', () => {
      const method = controller.methods.find(m => m.name === 'postMethod');
      if (!method) {
        throw new Error('Method postMethod not defined!');
      }

      expect(method.method).to.equal('post');
      expect(method.path).to.equal('Post');
    });

    it('should generate patch method', () => {
      const method = controller.methods.find(m => m.name === 'patchMethod');
      if (!method) {
        throw new Error('Method patchMethod not defined!');
      }

      expect(method.method).to.equal('patch');
      expect(method.path).to.equal('Patch');
    });

    it('should generate put method', () => {
      const method = controller.methods.find(m => m.name === 'putMethod');
      if (!method) {
        throw new Error('Method putMethod not defined!');
      }

      expect(method.method).to.equal('put');
      expect(method.path).to.equal('Put');
    });

    it('should generate delete method', () => {
      const method = controller.methods.find(m => m.name === 'deleteMethod');
      if (!method) {
        throw new Error('Method deleteMethod not defined!');
      }

      expect(method.method).to.equal('delete');
      expect(method.path).to.equal('Delete');
    });

    it('should generate method description', () => {
      const method = controller.methods.find(m => m.name === 'description');
      if (!method) {
        throw new Error('Method description not defined!');
      }

      expect(method.description).to.equal('method description');
    });

    it('should generate tags', () => {
      const method = controller.methods.find(m => m.name === 'tags');
      if (!method) {
        throw new Error('Method tags not defined!');
      }

      expect(method.tags).to.deep.equal(['Tag1', 'Tag2', 'Tag3']);
    });

    it('should generate multi response', () => {
      const method = controller.methods.find(m => m.name === 'multiResponse');
      if (!method) {
        throw new Error('Method multiResponse not defined!');
      }

      expect(method.responses.length).to.equal(4);

      const badResponse = method.responses[0];
      expect(badResponse.name).to.equal('400');
      expect(badResponse.description).to.equal('Bad Request');

      const unauthResponse = method.responses[1];
      expect(unauthResponse.name).to.equal('401');
      expect(unauthResponse.description).to.equal('Unauthorized');

      const defaultResponse = method.responses[2];
      expect(defaultResponse.name).to.equal('default');
      expect(defaultResponse.description).to.equal('Unexpected error');
      expect(defaultResponse.examples).to.deep.equal([{ status: 500, message: 'Something went wrong!' }]);

      const successResponse = method.responses[3];
      expect(successResponse.name).to.equal('200');
      expect(successResponse.description).to.equal('Ok');
    });

    it('should get decorator values passed by different ways', () => {
      const method = controller.methods.find(m => m.name === 'decoratorVariousValues');
      if (!method) {
        throw new Error('Method decoratorVariousValues not defined!');
      }

      expect(method.responses.length).to.equal(4);

      const valuesFromObject = method.responses[0];
      expect(valuesFromObject.name).to.equal('401');
      expect(valuesFromObject.description).to.equal('Unauthorized');

      const enumNumber = method.responses[1];
      expect(enumNumber.name).to.equal(400);
      expect(enumNumber.description).to.equal('Bad Request');

      const enumString = method.responses[2];
      expect(enumString.name).to.equal('404');
      expect(enumString.description).to.equal('Not Found');

      const success = method.responses[3];
      expect(success.name).to.equal(201);
      expect(success.description).to.equal('Created');

      if (!method.security) {
        throw new Error('Security decorator not defined!');
      }

      const security = method.security[0];
      expect(security).to.haveOwnProperty('JWT2');
      expect(security.JWT2).to.deep.equal(['permission:admin', 'permission:owner']);

      const objSecurity = method.security[1];
      expect(objSecurity).to.deep.equal({
        firstSec: [],
        secondSec: ['permission:admin', 'permission:owner'],
      });

      expect(method.tags).to.deep.equal(['EnumTag1']);
    });

    it('should generate success response', () => {
      const method = controller.methods.find(m => m.name === 'successResponse');
      if (!method) {
        throw new Error('Method successResponse not defined!');
      }

      expect(method.responses.length).to.equal(1);

      const mainResponse = method.responses[0];
      expect(mainResponse.name).to.equal('201');
      expect(mainResponse.description).to.equal('Created');
    });

    it('should generate 204 response on aliased voids', () => {
      const method = controller.methods.find(m => m.name === 'returnAliasedVoidType');
      if (!method) {
        throw new Error('Method returnAliasedVoidType not defined!');
      }

      expect(method.responses.length).to.equal(1);

      const mainResponse = method.responses[0];
      expect(mainResponse.name).to.equal('204');
    });

    it('should generate api security', () => {
      const method = controller.methods.find(m => m.name === 'apiSecurity');
      if (!method) {
        throw new Error('Method apiSecurity not defined!');
      }
      if (!method.security) {
        throw new Error('Security decorator not defined!');
      }
      expect(method.security[0].api_key).to.deep.equal([]);
    });

    it('should generate oauth2 security', () => {
      const method = controller.methods.find(m => m.name === 'oauthSecurity');
      if (!method) {
        throw new Error('Method oauthSecurity not defined!');
      }
      if (!method.security) {
        throw new Error('Security decorator not defined!');
      }
      expect(method.security[0].tsoa_auth).to.deep.equal(['write:pets', 'read:pets']);
    });

    it('should generate oauth2 or api key security', () => {
      const method = controller.methods.find(m => m.name === 'oauthOrAPIkeySecurity');
      if (!method) {
        throw new Error('Method OauthOrApiKeySecurity not defined!');
      }
      if (!method.security) {
        throw new Error('Security decorator not defined!');
      }
      expect(method.security[0].tsoa_auth).to.deep.equal(['write:pets', 'read:pets']);
      expect(method.security[1].api_key).to.deep.equal([]);
    });

    it('should generate oauth2 and api key security', () => {
      const method = controller.methods.find(m => m.name === 'oauthAndAPIkeySecurity');
      if (!method) {
        throw new Error('Method OauthAndApiKeySecurity not defined!');
      }
      if (!method.security) {
        throw new Error('Security decorator not defined!');
      }
      expect(method.security[0].tsoa_auth).to.deep.equal(['write:pets', 'read:pets']);
      expect(method.security[0].api_key).to.deep.equal([]);
    });

    it('should generate all extensions', () => {
      const method = controller.methods.find(m => m.name === 'extension');
      if (!method) {
        throw new Error('Method extension not defined!');
      }
      if (!method.extensions || method.extensions.length <= 0) {
        throw new Error('No extension decorators defined!');
      }

      const expectedExtensions = [
        { key: 'x-attKey', value: 'attValue' },
        { key: 'x-attKey1', value: 123 },
        { key: 'x-attKey2', value: true },
        { key: 'x-attKey3', value: null },
        { key: 'x-attKey4', value: { test: 'testVal' } },
        { key: 'x-attKey5', value: ['y0', 'y1', 123, true, null] },
        { key: 'x-attKey6', value: [{ y0: 'yt0', y1: 'yt1', y2: 123, y3: true, y4: null }, { y2: 'yt2' }] },
        { key: 'x-attKey7', value: { test: ['testVal', 123, true, null] } },
        { key: 'x-attKey8', value: { test: { testArray: ['testVal1', true, null, ['testVal2', 'testVal3', 123, true, null]] } } },
      ];

      expect(method.extensions).to.deep.equal(expectedExtensions);
    });

    it('should generate deprecated method true', () => {
      const method = controller.methods.find(m => m.name === 'deprecatedMethod');
      if (!method) {
        throw new Error('Method deprecatedMethod not defined!');
      }

      expect(method.deprecated).to.equal(true);
    });

    it('should generate deprecated method false', () => {
      const method = controller.methods.find(m => m.name === 'oauthSecurity');
      if (!method) {
        throw new Error('Method oauthSecurity not defined!');
      }

      expect(method.deprecated).to.equal(false);
    });

    it('should generate summary method', () => {
      const method = controller.methods.find(m => m.name === 'summaryMethod');
      if (!method) {
        throw new Error('Method summaryMethod not defined!');
      }

      expect(method.summary).to.equal('simple summary');
    });
  });

  describe('ParameterGenerator', () => {
    const parameterMetadata = new MetadataGenerator('./fixtures/controllers/parameterController.ts').Generate();
    const controller = parameterMetadata.controllers[0];

    it('should generate single and multiple examples', () => {
      const method = controller.methods.find(m => m.name === 'example');
      if (!method) {
        throw new Error('Method example not defined!');
      }

      expect(method.parameters.length).to.equal(4);

      const firstnameParam = method.parameters[0];
      expect(firstnameParam.example).not.to.be.undefined;
      expect(firstnameParam.example).to.deep.equal(['name1', 'name2']);
      expect((firstnameParam.example as unknown[]).length).to.be.equal(2);

      const lastnameParam = method.parameters[1];
      expect(lastnameParam.example).not.to.be.undefined;
      expect(lastnameParam.example).to.deep.equal(['lastname']);
      expect((lastnameParam.example as unknown[]).length).to.be.equal(1);

      const genderParam = method.parameters[2];
      expect(genderParam.example).not.to.be.undefined;
      expect(genderParam.example).to.deep.equal([
        { MALE: 'MALE', FEMALE: 'FEMALE' },
        { MALE: 'MALE2', FEMALE: 'FEMALE2' },
      ]);
      expect((genderParam.example as unknown[]).length).to.be.equal(2);

      const nicknamesParam = method.parameters[3];
      expect(nicknamesParam.example).not.to.be.undefined;
      expect(nicknamesParam.example).to.deep.equal([
        ['name1', 'name2'],
        ['name2_1', 'name2_2'],
      ]);
      expect((nicknamesParam.example as unknown[]).length).to.be.equal(2);
    });

    it('should generate a query parameter', () => {
      const method = controller.methods.find(m => m.name === 'getQuery');
      if (!method) {
        throw new Error('Method getQuery not defined!');
      }

      expect(method.parameters.length).to.equal(7);

      const firstnameParam = method.parameters[0];
      expect(firstnameParam.in).to.equal('query');
      expect(firstnameParam.name).to.equal('firstname');
      expect(firstnameParam.parameterName).to.equal('firstname');
      expect(firstnameParam.description).to.equal('Firstname description');
      expect(firstnameParam.required).to.be.true;
      expect(firstnameParam.type.dataType).to.equal('string');
      expect(firstnameParam.example).to.be.undefined;

      const lastnameParam = method.parameters[1];
      expect(lastnameParam.in).to.equal('query');
      expect(lastnameParam.name).to.equal('last_name');
      expect(lastnameParam.parameterName).to.equal('lastname');
      expect(lastnameParam.description).to.equal('Lastname description');
      expect(lastnameParam.required).to.be.true;
      expect(lastnameParam.type.dataType).to.equal('string');
      expect(lastnameParam.example).not.to.be.undefined;
      expect(lastnameParam.example).to.deep.equal(['name1', 'name2']);
      expect((lastnameParam.example as unknown[]).length).to.be.equal(2);

      const ageParam = method.parameters[2];
      expect(ageParam.in).to.equal('query');
      expect(ageParam.name).to.equal('age');
      expect(ageParam.parameterName).to.equal('age');
      expect(ageParam.description).to.equal('Age description');
      expect(ageParam.required).to.be.true;
      expect(ageParam.type.dataType).to.equal('integer');
      expect(ageParam.example).to.be.undefined;

      const weightParam = method.parameters[3];
      expect(weightParam.in).to.equal('query');
      expect(weightParam.name).to.equal('weight');
      expect(weightParam.parameterName).to.equal('weight');
      expect(weightParam.description).to.equal('Weight description');
      expect(weightParam.required).to.be.true;
      expect(weightParam.type.dataType).to.equal('float');
      expect(weightParam.example).to.be.undefined;

      const humanParam = method.parameters[4];
      expect(humanParam.in).to.equal('query');
      expect(humanParam.name).to.equal('human');
      expect(humanParam.parameterName).to.equal('human');
      expect(humanParam.description).to.equal('Human description');
      expect(humanParam.required).to.be.true;
      expect(humanParam.type.dataType).to.equal('boolean');
      expect(humanParam.example).to.be.undefined;

      const genderParam = method.parameters[5];
      expect(genderParam.in).to.equal('query');
      expect(genderParam.name).to.equal('gender');
      expect(genderParam.parameterName).to.equal('gender');
      expect(genderParam.description).to.equal('Gender description');
      expect(genderParam.required).to.be.true;
      expect(genderParam.type.dataType).to.equal('refEnum');
      expect(genderParam.example).to.be.undefined;

      const nicknamesParam = method.parameters[6] as Tsoa.ArrayParameter;
      expect(nicknamesParam.in).to.equal('query');
      expect(nicknamesParam.name).to.equal('nicknames');
      expect(nicknamesParam.parameterName).to.equal('nicknames');
      expect(nicknamesParam.description).to.equal('Nicknames description');
      expect(nicknamesParam.required).to.be.true;
      expect(nicknamesParam.type.dataType).to.equal('array');
      expect(nicknamesParam.collectionFormat).to.equal('multi');
      expect(nicknamesParam.type.elementType).to.deep.equal({ dataType: 'string' });
      expect(nicknamesParam.example).to.be.undefined;
    });

    it('should generate an path parameter', () => {
      const method = controller.methods.find(m => m.name === 'getPath');
      if (!method) {
        throw new Error('Method getPath not defined!');
      }

      expect(method.parameters.length).to.equal(6);

      const firstnameParam = method.parameters[0];
      expect(firstnameParam.in).to.equal('path');
      expect(firstnameParam.name).to.equal('firstname');
      expect(firstnameParam.parameterName).to.equal('firstname');
      expect(firstnameParam.description).to.equal('Firstname description');
      expect(firstnameParam.required).to.be.true;
      expect(firstnameParam.type.dataType).to.equal('string');

      const lastnameParam = method.parameters[1];
      expect(lastnameParam.in).to.equal('path');
      expect(lastnameParam.name).to.equal('last_name');
      expect(lastnameParam.parameterName).to.equal('lastname');
      expect(lastnameParam.description).to.equal('Lastname description');
      expect(lastnameParam.required).to.be.true;
      expect(lastnameParam.type.dataType).to.equal('string');
      expect(lastnameParam.example).not.to.be.undefined;
      expect(lastnameParam.example).to.deep.equal(['name1', 'name2']);
      expect((lastnameParam.example as unknown[]).length).to.be.equal(2);

      const ageParam = method.parameters[2];
      expect(ageParam.in).to.equal('path');
      expect(ageParam.name).to.equal('age');
      expect(ageParam.parameterName).to.equal('age');
      expect(ageParam.description).to.equal('Age description');
      expect(ageParam.required).to.be.true;
      expect(ageParam.type.dataType).to.equal('integer');

      const weightParam = method.parameters[3];
      expect(weightParam.in).to.equal('path');
      expect(weightParam.name).to.equal('weight');
      expect(weightParam.parameterName).to.equal('weight');
      expect(weightParam.description).to.equal('Weight description');
      expect(weightParam.required).to.be.true;
      expect(weightParam.type.dataType).to.equal('float');

      const humanParam = method.parameters[4];
      expect(humanParam.in).to.equal('path');
      expect(humanParam.name).to.equal('human');
      expect(humanParam.parameterName).to.equal('human');
      expect(humanParam.description).to.equal('Human description');
      expect(humanParam.required).to.be.true;
      expect(humanParam.type.dataType).to.equal('boolean');

      const genderParam = method.parameters[5];
      expect(genderParam.in).to.equal('path');
      expect(genderParam.name).to.equal('gender');
      expect(genderParam.parameterName).to.equal('gender');
      expect(genderParam.description).to.equal('Gender description');
      expect(genderParam.required).to.be.true;
      expect(genderParam.type.dataType).to.equal('refEnum');
    });

    it('should generate an path parameter from colon delimiter path params', () => {
      const method = controller.methods.find(m => m.name === 'getPathColonDelimiter');
      if (!method) {
        throw new Error('Method getPathColonDelimiter not defined!');
      }

      expect(method.parameters.length).to.equal(6);

      const firstnameParam = method.parameters[0];
      expect(firstnameParam.in).to.equal('path');
      expect(firstnameParam.name).to.equal('firstname');
      expect(firstnameParam.parameterName).to.equal('firstname');
      expect(firstnameParam.description).to.equal('Firstname description');
      expect(firstnameParam.required).to.be.true;
      expect(firstnameParam.type.dataType).to.equal('string');

      const lastnameParam = method.parameters[1];
      expect(lastnameParam.in).to.equal('path');
      expect(lastnameParam.name).to.equal('last_name');
      expect(lastnameParam.parameterName).to.equal('lastname');
      expect(lastnameParam.description).to.equal('Lastname description');
      expect(lastnameParam.required).to.be.true;
      expect(lastnameParam.type.dataType).to.equal('string');

      const ageParam = method.parameters[2];
      expect(ageParam.in).to.equal('path');
      expect(ageParam.name).to.equal('age');
      expect(ageParam.parameterName).to.equal('age');
      expect(ageParam.description).to.equal('Age description');
      expect(ageParam.required).to.be.true;
      expect(ageParam.type.dataType).to.equal('integer');

      const weightParam = method.parameters[3];
      expect(weightParam.in).to.equal('path');
      expect(weightParam.name).to.equal('weight');
      expect(weightParam.parameterName).to.equal('weight');
      expect(weightParam.description).to.equal('Weight description');
      expect(weightParam.required).to.be.true;
      expect(weightParam.type.dataType).to.equal('float');

      const humanParam = method.parameters[4];
      expect(humanParam.in).to.equal('path');
      expect(humanParam.name).to.equal('human');
      expect(humanParam.parameterName).to.equal('human');
      expect(humanParam.description).to.equal('Human description');
      expect(humanParam.required).to.be.true;
      expect(humanParam.type.dataType).to.equal('boolean');

      const genderParam = method.parameters[5];
      expect(genderParam.in).to.equal('path');
      expect(genderParam.name).to.equal('gender');
      expect(genderParam.parameterName).to.equal('gender');
      expect(genderParam.description).to.equal('Gender description');
      expect(genderParam.required).to.be.true;
      expect(genderParam.type.dataType).to.equal('refEnum');
    });

    it('should generate an header parameter', () => {
      const method = controller.methods.find(m => m.name === 'getHeader');
      if (!method) {
        throw new Error('Method getHeader not defined!');
      }

      expect(method.parameters.length).to.equal(6);

      const firstnameParam = method.parameters[0];
      expect(firstnameParam.in).to.equal('header');
      expect(firstnameParam.name).to.equal('firstname');
      expect(firstnameParam.parameterName).to.equal('firstname');
      expect(firstnameParam.description).to.equal('Firstname description');
      expect(firstnameParam.required).to.be.true;
      expect(firstnameParam.type.dataType).to.equal('string');

      const lastnameParam = method.parameters[1];
      expect(lastnameParam.in).to.equal('header');
      expect(lastnameParam.name).to.equal('last_name');
      expect(lastnameParam.parameterName).to.equal('lastname');
      expect(lastnameParam.description).to.equal('Lastname description');
      expect(lastnameParam.required).to.be.true;
      expect(lastnameParam.type.dataType).to.equal('string');
      expect(lastnameParam.example).not.to.be.undefined;
      expect(lastnameParam.example).to.deep.equal(['name1', 'name2']);
      expect((lastnameParam.example as unknown[]).length).to.be.equal(2);

      const ageParam = method.parameters[2];
      expect(ageParam.in).to.equal('header');
      expect(ageParam.name).to.equal('age');
      expect(ageParam.parameterName).to.equal('age');
      expect(ageParam.description).to.equal('Age description');
      expect(ageParam.required).to.be.true;
      expect(ageParam.type.dataType).to.equal('integer');

      const weightParam = method.parameters[3];
      expect(weightParam.in).to.equal('header');
      expect(weightParam.name).to.equal('weight');
      expect(weightParam.parameterName).to.equal('weight');
      expect(weightParam.description).to.equal('Weight description');
      expect(weightParam.required).to.be.true;
      expect(weightParam.type.dataType).to.equal('float');

      const humanParam = method.parameters[4];
      expect(humanParam.in).to.equal('header');
      expect(humanParam.name).to.equal('human');
      expect(humanParam.parameterName).to.equal('human');
      expect(humanParam.description).to.equal('Human description');
      expect(humanParam.required).to.be.true;
      expect(humanParam.type.dataType).to.equal('boolean');

      const genderParam = method.parameters[5];
      expect(genderParam.in).to.equal('header');
      expect(genderParam.name).to.equal('gender');
      expect(genderParam.parameterName).to.equal('gender');
      expect(genderParam.description).to.equal('Gender description');
      expect(genderParam.required).to.be.true;
      expect(genderParam.type.dataType).to.equal('refEnum');
    });

    it('should generate an request parameter', () => {
      const method = controller.methods.find(m => m.name === 'getRequest');
      if (!method) {
        throw new Error('Method getRequest not defined!');
      }
      const parameter = method.parameters.find(param => param.parameterName === 'request');
      if (!parameter) {
        throw new Error('Parameter request not defined!');
      }

      expect(method.parameters.length).to.equal(1);
      expect(parameter.description).to.equal('Request description');
      expect(parameter.in).to.equal('request');
      expect(parameter.name).to.equal('request');
      expect(parameter.parameterName).to.equal('request');
      expect(parameter.required).to.be.true;
      expect(parameter.type.dataType).to.equal('object');
    });

    it('should generate an body parameter', () => {
      const method = controller.methods.find(m => m.name === 'getBody');
      if (!method) {
        throw new Error('Method getBody not defined!');
      }
      const parameter = method.parameters.find(param => param.parameterName === 'body');
      if (!parameter) {
        throw new Error('Parameter body not defined!');
      }

      expect(method.parameters.length).to.equal(1);
      expect(parameter.description).to.equal('Body description');
      expect(parameter.in).to.equal('body');
      expect(parameter.name).to.equal('body');
      expect(parameter.parameterName).to.equal('body');
      expect(parameter.required).to.be.true;
      expect(parameter.example).not.to.be.undefined;
      expect(parameter.example).to.deep.equal([
        {
          firstname: 'first1',
          lastname: 'last1',
          age: 1,
        },
        {
          firstname: 'first2',
          lastname: 'last2',
          age: 2,
        },
      ]);
      expect((parameter.example as unknown[]).length).to.be.equal(2);
    });

    it('should generate an body props parameter', () => {
      const method = controller.methods.find(m => m.name === 'getBodyProps');
      if (!method) {
        throw new Error('Method getBodyProps not defined!');
      }
      const parameter = method.parameters.find(param => param.parameterName === 'firstname');
      if (!parameter) {
        throw new Error('Parameter firstname not defined!');
      }

      expect(method.parameters.length).to.equal(6);
      expect(parameter.description).to.equal('firstname description');
      expect(parameter.in).to.equal('body-prop');
      expect(parameter.name).to.equal('firstname');
      expect(parameter.parameterName).to.equal('firstname');
      expect(parameter.required).to.be.true;
      expect(parameter.example).not.to.be.undefined;
      expect(parameter.example).to.deep.equal(['name1', 'name2']);
      expect((parameter.example as unknown[]).length).to.be.equal(2);
    });

    it('should generate a res parameter and the corresponding additional response', () => {
      const method = controller.methods.find(m => m.name === 'getRes');
      if (!method) {
        throw new Error('Method getRes not defined!');
      }
      const parameter = method.parameters.find(param => param.parameterName === 'res');
      if (!parameter) {
        throw new Error('Parameter firstname not defined!');
      }
      const additionalResponse = method.responses[1];

      expect(method.parameters.length).to.equal(1);
      expect(parameter.description).to.equal('The alternate response');
      expect(parameter.in).to.equal('res');
      expect(parameter.name).to.equal('400');
      expect(parameter.parameterName).to.equal('res');
      expect(parameter.required).to.be.true;

      expect(additionalResponse.description).to.equal('The alternate response');
      expect(additionalResponse.name).to.equal('400');
    });

    it('Should inline enums for TS Enums in path, query and header when using Swagger', () => {
      const spec = new SpecGenerator2(parameterMetadata, getDefaultExtendedOptions()).GetSpec();
      const method = spec.paths['/ParameterTest/Path/{firstname}/{last_name}/{age}/{weight}/{human}/{gender}'].get;

      if (!method || !method.parameters) {
        throw new Error("Method or it's parameters are not defined!");
      }

      const genderParam = method.parameters.find(p => p.name === 'gender');

      if (!genderParam) {
        throw new Error('genderParam not defined!');
      }

      expect(genderParam.in).to.equal('path');
      expect(genderParam.name).to.equal('gender');
      expect(genderParam.description).to.equal('Gender description');
      expect(genderParam.required).to.be.true;
      expect(genderParam.enum).to.deep.equal(['MALE', 'FEMALE']);
    });

    it('should mark deprecated params as deprecated', () => {
      const method = controller.methods.find(m => m.name === 'postDeprecated');
      if (!method) {
        throw new Error('Method postDeprecated not defined!');
      }

      const supportedParam = method.parameters[0];
      expect(supportedParam.deprecated).to.be.false;

      const deprecatedParam = method.parameters[1];
      expect(deprecatedParam.deprecated).to.be.true;

      const deprecatedParam2 = method.parameters[2];
      expect(deprecatedParam2.deprecated).to.be.true;
    });
  });

  describe('HiddenMethodGenerator', () => {
    const parameterMetadata = new MetadataGenerator('./fixtures/controllers/hiddenMethodController.ts').Generate();
    const controller = parameterMetadata.controllers[0];

    it('should mark methods as visible by default', () => {
      const method = controller.methods.find(m => m.name === 'normalGetMethod');
      if (!method) {
        throw new Error('Method normalGetMethod not defined!');
      }

      expect(method.method).to.equal('get');
      expect(method.path).to.equal('normalGetMethod');
      expect(method.isHidden).to.equal(false);
    });

    it('should mark methods as hidden', () => {
      const method = controller.methods.find(m => m.name === 'hiddenGetMethod');
      if (!method) {
        throw new Error('Method hiddenGetMethod not defined!');
      }

      expect(method.method).to.equal('get');
      expect(method.path).to.equal('hiddenGetMethod');
      expect(method.isHidden).to.equal(true);
    });

    it('should mark query params as hidden', () => {
      const method = controller.methods.find(m => m.name === 'hiddenQueryMethod');
      if (!method) {
        throw new Error('Method hiddenQueryMethod not defined!');
      }

      const defaultSecret = method.parameters.find(p => p.name === 'defaultSecret');
      expect(defaultSecret).to.be.undefined;

      const optionalSecret = method.parameters.find(p => p.name === 'optionalSecret');
      expect(optionalSecret).to.be.undefined;

      expect(method.parameters.length).to.equal(1);

      const normalParam = method.parameters[0];
      expect(normalParam.in).to.equal('query');
      expect(normalParam.name).to.equal('normalParam');
      expect(normalParam.parameterName).to.equal('normalParam');
      expect(normalParam.required).to.be.true;
      expect(normalParam.type.dataType).to.equal('string');
    });
  });

  describe('HiddenControllerGenerator', () => {
    const parameterMetadata = new MetadataGenerator('./fixtures/controllers/hiddenController.ts').Generate();
    const controller = parameterMetadata.controllers[0];

    it('should mark all methods as hidden', () => {
      expect(controller.methods).to.have.lengthOf(2);
      controller.methods.forEach(method => {
        expect(method.isHidden).to.equal(true);
      });
    });
  });

  describe('ControllerWithCommonResponsesGenerator', () => {
    const parameterMetadata = new MetadataGenerator('./fixtures/controllers/controllerWithCommonResponses.ts').Generate();
    const controller = parameterMetadata.controllers[0];

    it('should add common responses to every method', () => {
      expect(controller.methods).to.have.lengthOf(2);
      controller.methods.forEach(method => {
        expect(method.responses.length).to.equal(2);

        let response = method.responses[0];
        expect(response.name).to.equal('401');
        expect(response.description).to.equal('Unauthorized');

        response = method.responses[1];
        expect(response.name).to.equal('200');
        expect(response.description).to.equal('Ok');
      });
    });
  });

  describe('DeprecatedMethodGenerator', () => {
    const parameterMetadata = new MetadataGenerator('./fixtures/controllers/deprecatedController.ts').Generate();
    const controller = parameterMetadata.controllers[0];

    it('should generate normal method', () => {
      const method = controller.methods.find(m => m.name === 'normalGetMethod');
      if (!method) {
        throw new Error('Method normalGetMethod not defined!');
      }

      expect(method.method).to.equal('get');
      expect(method.path).to.equal('normalGetMethod');
      expect(method.deprecated).to.equal(false);
    });

    it('should generate deprecated method', () => {
      const method = controller.methods.find(m => m.name === 'deprecatedGetMethod');
      if (!method) {
        throw new Error('Method deprecatedGetMethod not defined!');
      }

      expect(method.method).to.equal('get');
      expect(method.path).to.equal('deprecatedGetMethod');
      expect(method.deprecated).to.equal(true);
    });
  });

  describe('TypeInferenceController', () => {
    const metadata = new MetadataGenerator('./fixtures/controllers/typeInferenceController.ts').Generate();
    const controller = metadata.controllers.find(controller => controller.name === 'TypeInferenceController');

    if (!controller) {
      throw new Error('TypeInferenceController not defined!');
    }

    it('should generate multiKeysInterfaceInference method', () => {
      const method = controller.methods.find(method => method.name === 'multiKeysInterfaceInference');
      if (!method) {
        throw new Error('Method multiKeysInterfaceInference not defined!');
      }

      expect(method.method).to.equal('get');
      expect(method.path).to.equal('keys-interface-inference');
      const [response] = method.responses;
      expect(response.schema?.dataType).to.eq('refAlias');
      expect((response.schema as Tsoa.RefAliasType)?.refName).to.eq('Partial_TruncationTestModel_');
      const properties = ((response.schema as Tsoa.RefAliasType).type as Tsoa.NestedObjectLiteralType).properties;
      expect(properties.map(prop => prop.name)).to.have.members([
        'demo01',
        'demo02',
        'demo03',
        'demo04',
        'demo05',
        'demo06',
        'demo07',
        'demo08',
        'demo09',
        'demo10',
        'demo11',
        'demo12',
        'demo13',
        'demo14',
        'demo15',
        'demo16',
        'demo17',
        'd',
      ]);
    });

    it('should generate multiKeysPropertyInference method', () => {
      const method = controller.methods.find(method => method.name === 'multiKeysPropertyInference');
      if (!method) {
        throw new Error('Method multiKeysPropertyInference not defined!');
      }

      expect(method.method).to.equal('get');
      expect(method.path).to.equal('keys-property-inference');
      const [response] = method.responses;
      expect(response.schema?.dataType).to.eq('nestedObjectLiteral');
      const properties = (response.schema as Tsoa.NestedObjectLiteralType).properties;
      expect(properties.map(prop => prop.name)).to.have.members([
        'demo01',
        'demo02',
        'demo03',
        'demo04',
        'demo05',
        'demo06',
        'demo07',
        'demo08',
        'demo09',
        'demo10',
        'demo11',
        'demo12',
        'demo13',
        'demo14',
        'demo15',
        'demo16',
        'demo17',
        'demo18',
        'demo19',
        'demo20',
        'demo21',
      ]);
    });
  });

  describe('controllerWithJsDocResponseDescriptionGeneration', () => {
    const metadata = new MetadataGenerator('./fixtures/controllers/controllerWithJsDocResponseDescription.ts').Generate();
    const controller = metadata.controllers[0];

    it('has success response description', () => {
      const description = 'SuccessResponse description';
      const method = controller.methods.find(m => m.name === 'descriptionWithSuccessResponse');
      if (!method) {
        throw new Error('method descriptionWithSuccessResponse not defined');
      }
      expect(method.responses[0].name).to.equal(200);
      expect(method.responses[0].description).to.equal(description);
    });

    it('has a custom description when @returns is used on response 200', () => {
      const description = 'custom description with jsdoc annotation';
      const method = controller.methods.find(m => m.name === 'descriptionWithJsDocAnnotation');
      if (!method) {
        throw new Error('method descriptionWithJsDocAnnotation not defined');
      }
      expect(method.responses[0].name).to.equal('200');
      expect(method.responses[0].description).to.equal(description);
    });
    it("should not override @SuccessResponse's description even if @returns is present", () => {
      const description = 'Success Response description';
      const method = controller.methods.find(m => m.name === 'successResponseAndJsDocAnnotation');
      if (!method) {
        throw new Error('method successResponseAndJsDocAnnotation not defined');
      }
      expect(method.responses[0].name).to.equal(200);
      expect(method.responses[0].description).to.equal(description);
    });
  });
});
