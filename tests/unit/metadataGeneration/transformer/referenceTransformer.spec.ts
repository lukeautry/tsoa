import { expect } from 'chai';
import 'mocha';
import { ReferenceTransformer } from '@tsoa/cli/metadataGeneration/transformer/referenceTransformer';
import { GenerateMetadataError } from '@tsoa/cli/metadataGeneration/exceptions';
import { Tsoa } from '@tsoa/runtime';

// Helper function to create Property objects with minimal required fields
function createProperty(name: string, type: Tsoa.Type, required: boolean = true): any {
  return {
    name,
    type,
    required,
  };
}

describe('ReferenceTransformer - Empty Array Handling', () => {
  describe('merge method', () => {
    it('should throw error when merging empty array', () => {
      expect(() => {
        ReferenceTransformer.merge([]);
      }).to.throw(GenerateMetadataError, 'Cannot merge empty reference types array');
    });

    it('should return single reference type when array has one element', () => {
      const singleRef: Tsoa.ReferenceType = {
        dataType: 'refObject',
        refName: 'TestObject',
        properties: [],
        additionalProperties: false as any,
        description: 'Test object',
        deprecated: false,
      };

      const result = ReferenceTransformer.merge([singleRef]);

      expect(result).to.deep.equal(singleRef);
    });

    it('should merge multiple refEnum types correctly', () => {
      const refEnums: Tsoa.RefEnumType[] = [
        {
          dataType: 'refEnum',
          refName: 'TestEnum',
          enums: ['value1'],
          enumVarnames: ['VALUE1'],
          description: 'First enum',
          deprecated: false,
        },
        {
          dataType: 'refEnum',
          refName: 'TestEnum',
          enums: ['value2'],
          enumVarnames: ['VALUE2'],
          description: 'Second enum',
          deprecated: false,
        },
      ];

      const result = ReferenceTransformer.merge(refEnums);

      expect(result).to.deep.equal({
        dataType: 'refEnum',
        refName: 'TestEnum',
        enums: ['value1', 'value2'],
        enumVarnames: ['VALUE1', 'VALUE2'],
        description: 'First enum\nSecond enum',
        deprecated: false,
        example: undefined,
      });
    });

    it('should merge multiple refObject types correctly', () => {
      const refObjects: Tsoa.RefObjectType[] = [
        {
          dataType: 'refObject',
          refName: 'TestObject',
          properties: [createProperty('id', { dataType: 'string' })],
          additionalProperties: false as any,
          description: 'First object',
          deprecated: false,
        },
        {
          dataType: 'refObject',
          refName: 'TestObject',
          properties: [createProperty('name', { dataType: 'string' })],
          additionalProperties: false as any,
          description: 'Second object',
          deprecated: false,
        },
      ];

      const result = ReferenceTransformer.merge(refObjects);

      expect(result).to.deep.equal({
        dataType: 'refObject',
        refName: 'TestObject',
        properties: [createProperty('id', { dataType: 'string' }), createProperty('name', { dataType: 'string' })],
        additionalProperties: false as any,
        description: 'First object\nSecond object',
        deprecated: false,
        example: undefined,
        title: undefined,
      });
    });

    it('should throw error for mixed reference types', () => {
      const mixedRefs: Tsoa.ReferenceType[] = [
        {
          dataType: 'refEnum',
          refName: 'TestEnum',
          enums: ['value1'],
          enumVarnames: ['VALUE1'],
          description: 'Test enum',
          deprecated: false,
        },
        {
          dataType: 'refObject',
          refName: 'TestObject',
          properties: [],
          additionalProperties: false as any,
          description: 'Test object',
          deprecated: false,
        },
      ];

      expect(() => {
        ReferenceTransformer.merge(mixedRefs);
      }).to.throw(GenerateMetadataError, 'These resolved type merge rules are not defined');
    });

    it('should handle refObject with additionalProperties', () => {
      const refObjects: Tsoa.RefObjectType[] = [
        {
          dataType: 'refObject',
          refName: 'TestObject',
          properties: [createProperty('id', { dataType: 'string' })],
          additionalProperties: { dataType: 'string' },
          description: 'First object',
          deprecated: false,
        },
        {
          dataType: 'refObject',
          refName: 'TestObject',
          properties: [createProperty('name', { dataType: 'string' })],
          additionalProperties: { dataType: 'double' },
          description: 'Second object',
          deprecated: false,
        },
      ];

      const result = ReferenceTransformer.merge(refObjects);

      expect(result).to.deep.equal({
        dataType: 'refObject',
        refName: 'TestObject',
        properties: [createProperty('id', { dataType: 'string' }), createProperty('name', { dataType: 'string' })],
        additionalProperties: {
          dataType: 'union',
          types: [{ dataType: 'string' }, { dataType: 'double' }],
        },
        description: 'First object\nSecond object',
        deprecated: false,
        title: undefined,
        example: undefined,
      });
    });

    it('should handle refObject with example property', () => {
      const refObjects: Tsoa.RefObjectType[] = [
        {
          dataType: 'refObject',
          refName: 'TestObject',
          properties: [createProperty('id', { dataType: 'string' })],
          additionalProperties: false as any,
          description: 'First object',
          deprecated: false,
          example: 'example1',
        },
        {
          dataType: 'refObject',
          refName: 'TestObject',
          properties: [createProperty('name', { dataType: 'string' })],
          additionalProperties: false as any,
          description: 'Second object',
          deprecated: false,
          example: 'example2',
        },
      ];

      const result = ReferenceTransformer.merge(refObjects);

      expect(result).to.deep.equal({
        dataType: 'refObject',
        refName: 'TestObject',
        properties: [
          {
            name: 'id',
            type: { dataType: 'string' },
            required: true,
          },
          {
            name: 'name',
            type: { dataType: 'string' },
            required: true,
          },
        ],
        additionalProperties: false as any,
        description: 'First object\nSecond object',
        deprecated: false,
        title: undefined,
        example: 'example1', // First example should be used
      });
    });

    it('should handle refObject with deprecated property', () => {
      const refObjects: Tsoa.RefObjectType[] = [
        {
          dataType: 'refObject',
          refName: 'TestObject',
          properties: [createProperty('id', { dataType: 'string' })],
          additionalProperties: false as any,
          description: 'First object',
          deprecated: false,
        },
        {
          dataType: 'refObject',
          refName: 'TestObject',
          properties: [createProperty('name', { dataType: 'string' })],
          additionalProperties: false as any,
          description: 'Second object',
          deprecated: true,
        },
      ];

      const result = ReferenceTransformer.merge(refObjects);

      expect(result).to.deep.equal({
        dataType: 'refObject',
        refName: 'TestObject',
        properties: [
          {
            name: 'id',
            type: { dataType: 'string' },
            required: true,
          },
          {
            name: 'name',
            type: { dataType: 'string' },
            required: true,
          },
        ],
        additionalProperties: false as any,
        description: 'First object\nSecond object',
        deprecated: true, // Should be true if any is deprecated
        title: undefined,
        example: undefined,
      });
    });
  });

  describe('mergeManyRefObj method', () => {
    it('should merge title field from refObjects', () => {
      const refObjects: Tsoa.RefObjectType[] = [
        {
          dataType: 'refObject',
          refName: 'TestObject',
          properties: [createProperty('id', { dataType: 'string' })],
          additionalProperties: false as any,
          description: 'First object',
          deprecated: false,
          title: 'FirstTitle',
        },
        {
          dataType: 'refObject',
          refName: 'TestObject',
          properties: [createProperty('name', { dataType: 'string' })],
          additionalProperties: false as any,
          description: 'Second object',
          deprecated: false,
          title: 'SecondTitle',
        },
      ];

      const result = ReferenceTransformer.mergeManyRefObj(refObjects);

      expect(result.title).to.equal('FirstTitle');
      expect(result).to.include({
        dataType: 'refObject',
        refName: 'TestObject',
        description: 'First object\nSecond object',
        deprecated: false,
        example: undefined,
      });
      expect(result.properties).to.deep.include.members([
        { name: 'id', type: { dataType: 'string' }, required: true },
        { name: 'name', type: { dataType: 'string' }, required: true },
      ]);
    });
    it('should handle single refObject', () => {
      const refObject: Tsoa.RefObjectType = {
        dataType: 'refObject',
        refName: 'TestObject',
        properties: [createProperty('id', { dataType: 'string' })],
        additionalProperties: false as any,
        description: 'Test object',
        deprecated: false,
      };

      // mergeManyRefObj requires at least 2 elements, so we'll test with 2 identical objects
      const result = ReferenceTransformer.mergeManyRefObj([refObject, refObject]);

      expect(result).to.deep.equal({
        ...refObject,
        description: 'Test object\nTest object',
        title: undefined,
        example: undefined,
      });
    });

    it('should merge multiple refObjects correctly', () => {
      const refObjects: Tsoa.RefObjectType[] = [
        {
          dataType: 'refObject',
          refName: 'TestObject',
          properties: [createProperty('id', { dataType: 'string' })],
          additionalProperties: false as any,
          description: 'First object',
          deprecated: false,
        },
        {
          dataType: 'refObject',
          refName: 'TestObject',
          properties: [createProperty('name', { dataType: 'string' })],
          additionalProperties: false as any,
          description: 'Second object',
          deprecated: false,
        },
        {
          dataType: 'refObject',
          refName: 'TestObject',
          properties: [createProperty('email', { dataType: 'string' })],
          additionalProperties: false as any,
          description: 'Third object',
          deprecated: true,
        },
      ];

      const result = ReferenceTransformer.mergeManyRefObj(refObjects);

      expect(result).to.deep.equal({
        dataType: 'refObject',
        refName: 'TestObject',
        properties: [
          {
            name: 'id',
            type: { dataType: 'string' },
            required: true,
          },
          {
            name: 'name',
            type: { dataType: 'string' },
            required: true,
          },
          {
            name: 'email',
            type: { dataType: 'string' },
            required: true,
          },
        ],
        additionalProperties: false as any,
        description: 'First object\nSecond object\nThird object',
        deprecated: true,
        title: undefined,
        example: undefined,
      });
    });
  });
});
