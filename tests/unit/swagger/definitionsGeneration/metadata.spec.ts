import 'mocha';
import { MetadataGenerator } from '../../../../src/metadataGeneration/metadataGenerator';
import * as chai from 'chai';

const expect = chai.expect;

describe('Metadata generation', () => {
  const metadata = new MetadataGenerator('./tests/fixtures/controllers/getController.ts').Generate();

  describe('MetadataGenerator', () => {
    it('should generate one controller', () => {
      expect(metadata.Controllers.length).to.equal(1);
      expect(metadata.Controllers[0].name).to.equal('GetTestController');
      expect(metadata.Controllers[0].path).to.equal('GetTest');
    });
  });

  describe('MethodGenerator', () => {
    const controller = metadata.Controllers[0];
    const definedMethods = ['getModel', 'getCurrentModel',
      'getClassModel', 'getMultipleModels', 'getModelByParams',
      'getResponseWithUnionTypeProperty', 'getUnionTypeResponse',
      'getInjectedRequest', 'getInjectedValue', 'getByDataParam',
      'getThrowsError', 'getGeneratesTags', 'getBuffer',
      'getDefaultResponse', 'getResponse', 'getApiSecurity', 'getOauthSecurity'];

    it('should only generate the defined methods', () => {
      expect(controller.methods.filter(m => definedMethods.indexOf(m.name) === -1).length).to.equal(0);
    });

    it('should generate the defined methods', () => {
      expect(definedMethods.filter(methodName =>
        controller.methods.map(m => m.name).indexOf(methodName) === -1).length).to.equal(0);
    });

    it('should generate an injected request parameter', () => {
      const method = controller.methods.find(m => m.name === 'getInjectedRequest');
      if (!method) {
        throw new Error('Method getInjectedRequest not defined!');
      }
      expect(method.parameters.length).to.equal(1);
      const requestParameter = method.parameters[0];
      expect(requestParameter.description).to.equal('');
      expect(requestParameter.in).to.equal('inject');
      expect(requestParameter.injected).to.equal('request');
      expect(requestParameter.name).to.equal('request');
      expect(requestParameter.required).to.be.true;
      expect(requestParameter.type).to.equal('object');
    });

    it('should generate an injected value parameter', () => {
      const method = controller.methods.find(m => m.name === 'getInjectedValue');
      if (!method) {
        throw new Error('Method getInjectedValue not defined!');
      }
      expect(method.parameters.length).to.equal(1);
      const requestParameter = method.parameters[0];
      expect(requestParameter.description).to.equal('');
      expect(requestParameter.in).to.equal('inject');
      expect(requestParameter.injected).to.equal('inject');
      expect(requestParameter.name).to.equal('someValue');
      expect(requestParameter.required).to.be.true;
      expect(requestParameter.type).to.equal('object');
    });
  });
});
