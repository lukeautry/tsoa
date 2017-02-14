import 'mocha';
import { MetadataGenerator } from '../../../../src/metadataGeneration/metadataGenerator';
import * as chai from 'chai';

const expect = chai.expect;

describe('Metadata generation', () => {
  const metadata = new MetadataGenerator('./tests/fixtures/controllers/getController.ts').Generate();

  describe('ControllerGenerator', () => {
    it('should generate one controller', () => {
      expect(metadata.Controllers.length).to.equal(1);
      expect(metadata.Controllers[0].name).to.equal('GetTestController');
      expect(metadata.Controllers[0].path).to.equal('GetTest');
    });
  });

  describe('MethodGenerator', () => {
    const parameterMetadata = new MetadataGenerator('./tests/fixtures/controllers/methodController.ts').Generate();
    const controller = parameterMetadata.Controllers[0];
    const definedMethods = [
      'getMethod', 'postMethod', 'patchMethod', 'putMethod', 'deleteMethod',
      'description', 'tags', 'multiResponse', 'successResponse',
      'apiSecurity', 'oauthSecurity'];

    it('should only generate the defined methods', () => {
      expect(controller.methods.filter(m => definedMethods.indexOf(m.name) === -1).length).to.equal(0);
    });

    it('should generate the defined methods', () => {
      expect(definedMethods.filter(methodName =>
        controller.methods.map(m => m.name).indexOf(methodName) === -1).length).to.equal(0);
    });

    it('should generate get method', () => {
      const method = controller.methods.find(m => m.name === 'getMethod');
      if (!method) {
        throw new Error('Method getMethod not defined!');
      }

      expect(method.method).to.equal('get');
      expect(method.path).to.equal('/Get');
    });

    it('should generate post method', () => {
      const method = controller.methods.find(m => m.name === 'postMethod');
      if (!method) {
        throw new Error('Method postMethod not defined!');
      }

      expect(method.method).to.equal('post');
      expect(method.path).to.equal('/Post');
    });

    it('should generate patch method', () => {
      const method = controller.methods.find(m => m.name === 'patchMethod');
      if (!method) {
        throw new Error('Method patchMethod not defined!');
      }

      expect(method.method).to.equal('patch');
      expect(method.path).to.equal('/Patch');
    });

    it('should generate put method', () => {
      const method = controller.methods.find(m => m.name === 'putMethod');
      if (!method) {
        throw new Error('Method putMethod not defined!');
      }

      expect(method.method).to.equal('put');
      expect(method.path).to.equal('/Put');
    });

    it('should generate delete method', () => {
      const method = controller.methods.find(m => m.name === 'deleteMethod');
      if (!method) {
        throw new Error('Method deleteMethod not defined!');
      }

      expect(method.method).to.equal('delete');
      expect(method.path).to.equal('/Delete');
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

      const successResponse = method.responses[0];
      expect(successResponse.name).to.equal('200');
      expect(successResponse.description).to.equal('Ok');

      const badResponse = method.responses[1];
      expect(badResponse.name).to.equal('400');
      expect(badResponse.description).to.equal('Bad Request');

      const unauthResponse = method.responses[2];
      expect(unauthResponse.name).to.equal('401');
      expect(unauthResponse.description).to.equal('Unauthorized');

      const defaultResponse = method.responses[3];
      expect(defaultResponse.name).to.equal('default');
      expect(defaultResponse.description).to.equal('Unexpected error');
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

    it('should generate api security', () => {
      const method = controller.methods.find(m => m.name === 'apiSecurity');
      if (!method) {
        throw new Error('Method apiSecurity not defined!');
      }

      if (!method.security) {
        throw new Error('Security decorator not defined!');
      }

      expect(method.security.name).to.equal('api_key');
    });

    it('should generate oauth2 security', () => {
      const method = controller.methods.find(m => m.name === 'oauthSecurity');
      if (!method) {
        throw new Error('Method oauthSecurity not defined!');
      }

      if (!method.security) {
        throw new Error('Security decorator not defined!');
      }
      expect(method.security.name).to.equal('tsoa_auth');
      expect(method.security.scopes).to.deep.equal(['write:pets', 'read:pets']);
    });
  });

  describe('ParameterGenerator', () => {
    const parameterMetadata = new MetadataGenerator('./tests/fixtures/controllers/parameterController.ts').Generate();
    const controller = parameterMetadata.Controllers[0];

    it('should generate an query parameter', () => {
      const method = controller.methods.find(m => m.name === 'getQuery');
      if (!method) {
        throw new Error('Method getQuery not defined!');
      }

      expect(method.parameters.length).to.equal(4);

      const firstnameParam = method.parameters[0];
      expect(firstnameParam.in).to.equal('query');
      expect(firstnameParam.name).to.equal('firstname');
      expect(firstnameParam.argumentName).to.equal('firstname');
      expect(firstnameParam.description).to.equal('Firstname description');
      expect(firstnameParam.required).to.be.true;
      expect(firstnameParam.type).to.equal('string');

      const lastnameParam = method.parameters[1];
      expect(lastnameParam.in).to.equal('query');
      expect(lastnameParam.name).to.equal('last_name');
      expect(lastnameParam.argumentName).to.equal('lastname');
      expect(lastnameParam.description).to.equal('Lastname description');
      expect(lastnameParam.required).to.be.true;
      expect(lastnameParam.type).to.equal('string');

      const ageParam = method.parameters[2];
      expect(ageParam.in).to.equal('query');
      expect(ageParam.name).to.equal('age');
      expect(ageParam.argumentName).to.equal('age');
      expect(ageParam.description).to.equal('Age description');
      expect(ageParam.required).to.be.true;
      expect(ageParam.type).to.equal('number');

      const humanParam = method.parameters[3];
      expect(humanParam.in).to.equal('query');
      expect(humanParam.name).to.equal('human');
      expect(humanParam.argumentName).to.equal('human');
      expect(humanParam.description).to.equal('Human description');
      expect(humanParam.required).to.be.true;
      expect(humanParam.type).to.equal('boolean');
    });

    it('should generate an path parameter', () => {
      const method = controller.methods.find(m => m.name === 'getPath');
      if (!method) {
        throw new Error('Method getPath not defined!');
      }

      expect(method.parameters.length).to.equal(4);

      const firstnameParam = method.parameters[0];
      expect(firstnameParam.in).to.equal('path');
      expect(firstnameParam.name).to.equal('firstname');
      expect(firstnameParam.argumentName).to.equal('firstname');
      expect(firstnameParam.description).to.equal('Firstname description');
      expect(firstnameParam.required).to.be.true;
      expect(firstnameParam.type).to.equal('string');

      const lastnameParam = method.parameters[1];
      expect(lastnameParam.in).to.equal('path');
      expect(lastnameParam.name).to.equal('last_name');
      expect(lastnameParam.argumentName).to.equal('lastname');
      expect(lastnameParam.description).to.equal('Lastname description');
      expect(lastnameParam.required).to.be.true;
      expect(lastnameParam.type).to.equal('string');

      const ageParam = method.parameters[2];
      expect(ageParam.in).to.equal('path');
      expect(ageParam.name).to.equal('age');
      expect(ageParam.argumentName).to.equal('age');
      expect(ageParam.description).to.equal('Age description');
      expect(ageParam.required).to.be.true;
      expect(ageParam.type).to.equal('number');

      const humanParam = method.parameters[3];
      expect(humanParam.in).to.equal('path');
      expect(humanParam.name).to.equal('human');
      expect(humanParam.argumentName).to.equal('human');
      expect(humanParam.description).to.equal('Human description');
      expect(humanParam.required).to.be.true;
      expect(humanParam.type).to.equal('boolean');
    });

    it('should generate an header parameter', () => {
      const method = controller.methods.find(m => m.name === 'getHeader');
      if (!method) {
        throw new Error('Method getHeader not defined!');
      }

      expect(method.parameters.length).to.equal(4);

      const firstnameParam = method.parameters[0];
      expect(firstnameParam.in).to.equal('header');
      expect(firstnameParam.name).to.equal('firstname');
      expect(firstnameParam.argumentName).to.equal('firstname');
      expect(firstnameParam.description).to.equal('Firstname description');
      expect(firstnameParam.required).to.be.true;
      expect(firstnameParam.type).to.equal('string');

      const lastnameParam = method.parameters[1];
      expect(lastnameParam.in).to.equal('header');
      expect(lastnameParam.name).to.equal('last_name');
      expect(lastnameParam.argumentName).to.equal('lastname');
      expect(lastnameParam.description).to.equal('Lastname description');
      expect(lastnameParam.required).to.be.true;
      expect(lastnameParam.type).to.equal('string');

      const ageParam = method.parameters[2];
      expect(ageParam.in).to.equal('header');
      expect(ageParam.name).to.equal('age');
      expect(ageParam.argumentName).to.equal('age');
      expect(ageParam.description).to.equal('Age description');
      expect(ageParam.required).to.be.true;
      expect(ageParam.type).to.equal('number');

      const humanParam = method.parameters[3];
      expect(humanParam.in).to.equal('header');
      expect(humanParam.name).to.equal('human');
      expect(humanParam.argumentName).to.equal('human');
      expect(humanParam.description).to.equal('Human description');
      expect(humanParam.required).to.be.true;
      expect(humanParam.type).to.equal('boolean');
    });

    it('should generate an request parameter', () => {
      const method = controller.methods.find(m => m.name === 'getRequest');
      if (!method) {
        throw new Error('Method getRequest not defined!');
      }
      const parameter = method.parameters.find(param => param.argumentName === 'request');
      if (!parameter) {
        throw new Error('Parameter request not defined!');
      }

      expect(method.parameters.length).to.equal(1);
      const queryParamater = method.parameters[0];
      expect(queryParamater.description).to.equal('Request description');
      expect(queryParamater.in).to.equal('request');
      expect(queryParamater.name).to.equal('request');
      expect(queryParamater.argumentName).to.equal('request');
      expect(queryParamater.required).to.be.true;
      expect(queryParamater.type).to.equal('object');
    });

    it('should generate an body parameter', () => {
      const method = controller.methods.find(m => m.name === 'getBody');
      if (!method) {
        throw new Error('Method getBody not defined!');
      }
      const parameter = method.parameters.find(param => param.argumentName === 'body');
      if (!parameter) {
        throw new Error('Parameter body not defined!');
      }

      expect(method.parameters.length).to.equal(1);
      const queryParamater = method.parameters[0];
      expect(queryParamater.description).to.equal('Body description');
      expect(queryParamater.in).to.equal('body');
      expect(queryParamater.name).to.equal('body');
      expect(queryParamater.argumentName).to.equal('body');
      expect(queryParamater.required).to.be.true;
    });
  });
});
