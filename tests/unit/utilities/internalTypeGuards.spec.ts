import { expect } from 'chai';
import 'mocha';
import { Tsoa } from '@tsoa/runtime';
import { hasBinaryBody, isBinaryBodyParameter, isRefType } from '@tsoa/cli/utils/internalTypeGuards';

describe('internalTypeGuards', () => {
  describe('isRefType', () => {
    it('should return true for refEnum, refObject, refAlias', () => {
      expect(isRefType({ dataType: 'refEnum', refName: 'Status' } as Tsoa.ReferenceType)).to.be.true;
      expect(isRefType({ dataType: 'refObject', refName: 'User', properties: [], deprecated: false } as Tsoa.ReferenceType)).to.be.true;
      expect(isRefType({ dataType: 'refAlias', refName: 'Id', type: { dataType: 'string' } } as Tsoa.ReferenceType)).to.be.true;
    });

    it('should return false for primitive and other types', () => {
      expect(isRefType({ dataType: 'string' })).to.be.false;
      expect(isRefType({ dataType: 'binary' })).to.be.false;
      expect(isRefType({ dataType: 'integer' })).to.be.false;
      expect(isRefType({ dataType: 'array', elementType: { dataType: 'string' } })).to.be.false;
    });
  });

  describe('isBinaryBodyParameter', () => {
    it('should return true when in is body and type dataType is binary', () => {
      const param: Tsoa.Parameter = {
        in: 'body',
        name: 'stream',
        parameterName: 'stream',
        type: { dataType: 'binary' },
        validators: {},
        deprecated: false,
      };
      expect(isBinaryBodyParameter(param)).to.be.true;
    });

    it('should return false when in is not body even if type is binary', () => {
      const param: Tsoa.Parameter = {
        in: 'formData',
        name: 'file',
        parameterName: 'file',
        type: { dataType: 'binary' },
        validators: {},
        deprecated: false,
      };
      expect(isBinaryBodyParameter(param)).to.be.false;
    });

    it('should return false when in is body but type is not binary', () => {
      const param: Tsoa.Parameter = {
        in: 'body',
        name: 'payload',
        parameterName: 'payload',
        type: { dataType: 'object' },
        validators: {},
        deprecated: false,
      };
      expect(isBinaryBodyParameter(param)).to.be.false;
    });
  });

  describe('hasBinaryBody', () => {
    it('should return true if any parameter is a binary body', () => {
      const params: Tsoa.Parameter[] = [
        {
          in: 'query',
          name: 'filter',
          parameterName: 'filter',
          type: { dataType: 'string' },
          validators: {},
          deprecated: false,
        },
        {
          in: 'body',
          name: 'fileStream',
          parameterName: 'fileStream',
          type: { dataType: 'binary' },
          validators: {},
          deprecated: false,
        },
      ];
      expect(hasBinaryBody(params)).to.be.true;
    });

    it('should return false if no parameters are binary bodies', () => {
      const params: Tsoa.Parameter[] = [
        {
          in: 'query',
          name: 'filter',
          parameterName: 'filter',
          type: { dataType: 'string' },
          validators: {},
          deprecated: false,
        },
        {
          in: 'body',
          name: 'payload',
          parameterName: 'payload',
          type: { dataType: 'object' },
          validators: {},
          deprecated: false,
        },
      ];
      expect(hasBinaryBody(params)).to.be.false;
    });

    it('should return false for empty parameters', () => {
      expect(hasBinaryBody([])).to.be.false;
    });
  });
});
