import { expect } from 'chai';
import 'mocha';
import { MetadataGenerator } from '../../../../src/metadataGeneration/metadataGenerator';
import { SpecGenerator } from '../../../../src/swagger/specGenerator';
import { getDefaultOptions } from '../../../fixtures/defaultOptions';
import { VerifyPath } from '../../utilities/verifyPath';

function verifyPath(spec, route: string, isCollection?: boolean, isNoContent?: boolean) {
  return VerifyPath(spec, route, path => path.get, isCollection, isNoContent);
}

function hasNoPath(spec, route: string) {
  const path = spec.paths[route];
  expect(path, `Path object for ${route} route wasn\'t generated.`).to.not.exist;
}

describe('Internal controller route generation', () => {
  const internalControllerMetadata = new MetadataGenerator('./tests/fixtures/controllers/internalController.ts').Generate();
  const icSpec = new SpecGenerator(internalControllerMetadata, getDefaultOptions()).GetSpec();
  const icInternalSpec = new SpecGenerator(internalControllerMetadata, getDefaultOptions()).GetSpec(true);

  const route = (path: string) => '/InternalControllerTest' + path;

  it('should generate paths in internal spec', () => {
    verifyPath(icInternalSpec, route('/NotInternal'));
    verifyPath(icInternalSpec, route('/Internal'));
    verifyPath(icInternalSpec, route('/InternalParameters'));
  });

  it('should NOT generate paths in regular spec', () => {
    hasNoPath(icSpec, route('/NotInternal'));
    hasNoPath(icSpec, route('/Internal'));
    hasNoPath(icSpec, route('/InternalParameters'));
  });
});

describe('Internal methods and parameters generation', () => {

  const internalMethodsMetadata = new MetadataGenerator('./tests/fixtures/controllers/internalMethodsController.ts').Generate();
  const imSpec = new SpecGenerator(internalMethodsMetadata, getDefaultOptions()).GetSpec();
  const imInternalSpec = new SpecGenerator(internalMethodsMetadata, getDefaultOptions()).GetSpec(true);

  const route = (path: string) => '/InternalMethodsTest' + path;

  it('should generate paths in internal spec', () => {
    verifyPath(imInternalSpec, route('/Internal'));
    verifyPath(imInternalSpec, route('/InternalParameters'));
  });

  it('should generate paths in regular spec', () => {
    verifyPath(imSpec, route('/NotInternal'));
    verifyPath(imSpec, route('/InternalParameters'));
  });

  it('should NOT generate paths in internal spec', () => {
    hasNoPath(imInternalSpec, route('/NotInternal'));
  });

  it('should NOT generate paths in regular spec', () => {
    hasNoPath(imSpec, route('/Internal'));
  });

  it('should generate path WITH internal parameters in internal spec', () => {
    const params = getVerifiedParameters(imInternalSpec, route('/InternalParameters'));
    const expectedParams = [
      'internalQueryParameter',
      'internalHeaderParameter',
      'notInternalQueryParameter',
      'notInternalHeaderParameter',
    ];
    expect(params.map(p => p.name)).to.deep.equal(expectedParams);
  });

  it('should generate path WITHOUT internal parameters in regular spec', () => {
    const params = getVerifiedParameters(imSpec, route('/InternalParameters'));
    const expectedParams = [
      'notInternalQueryParameter',
      'notInternalHeaderParameter',
    ];
    expect(params.map(p => p.name)).to.deep.equal(expectedParams);
  });

  function getVerifiedParameters(spec, actionRoute: string) {
    const path = verifyPath(spec, actionRoute);
    if (!path.get) { throw new Error('No get operation.'); }
    if (!path.get.parameters) { throw new Error('No operation parameters.'); }

    return path.get.parameters as any;
  }
});
