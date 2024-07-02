import { ExtendedSpecConfig } from '@tsoa/cli/cli';
import { MetadataGenerator } from '@tsoa/cli/metadataGeneration/metadataGenerator';
import { SpecGenerator3 } from '@tsoa/cli/swagger/specGenerator3';
import { Swagger, Tsoa } from '@tsoa/runtime';
import { expect } from 'chai';
import 'mocha';
import * as os from 'os';
import { versionMajorMinor } from 'typescript';
import { getDefaultExtendedOptions } from '../../fixtures/defaultOptions';
import { EnumDynamicPropertyKey, TestModel } from '../../fixtures/testModel';

describe('upload file generation for OpenAPI 3.0.0', () => {
  const metadataPost = new MetadataGenerator('./fixtures/controllers/postUploadFileController.ts').Generate();

  describe('uploadedFiles', () => {
    /**
     * Tests according to openapi v3 specs
     * @link http://spec.openapis.org/oas/v3.0.0
     * Validated and tested GUI with swagger.io
     * @link https://editor.swagger.io/
     */
    it('uploadFile with object params', () => {
      // Act
      const specPost = new SpecGenerator3(metadataPost, getDefaultExtendedOptions()).GetSpec();
      const pathPost = specPost.paths['/PostTest/WithObjectParamsFields'].post;
      if (!pathPost) {
        throw new Error('PostTest file method not defined');
      }
      if (!pathPost.requestBody) {
        throw new Error('PostTest file method has no requestBody');
      }
      // Assert
      expect(pathPost.parameters).to.have.length(0);
    });
  });
});
