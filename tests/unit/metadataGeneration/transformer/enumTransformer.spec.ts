import { expect } from 'chai';
import 'mocha';
import { EnumTransformer } from '@tsoa/cli/metadataGeneration/transformer/enumTransformer';
import { Tsoa } from '@tsoa/runtime';

describe('EnumTransformer - Null Safety', () => {
  describe('merge method', () => {
    it('should return second enum when first is null', () => {
      const first: Tsoa.RefEnumType | null = null;
      const second: Tsoa.RefEnumType = {
        dataType: 'refEnum',
        refName: 'TestEnum',
        enums: ['value1', 'value2'],
        enumVarnames: ['VALUE1', 'VALUE2'],
        description: 'Test enum',
        deprecated: false,
      };

      const result = EnumTransformer.merge(first as any, second);

      expect(result).to.deep.equal(second);
    });

    it('should return first enum when second is null', () => {
      const first: Tsoa.RefEnumType = {
        dataType: 'refEnum',
        refName: 'TestEnum',
        enums: ['value1', 'value2'],
        enumVarnames: ['VALUE1', 'VALUE2'],
        description: 'Test enum',
        deprecated: false,
      };
      const second: Tsoa.RefEnumType | null = null;

      const result = EnumTransformer.merge(first, second as any);

      expect(result).to.deep.equal(first);
    });

    it('should return first enum when both are null', () => {
      const first: Tsoa.RefEnumType | null = null;
      const second: Tsoa.RefEnumType | null = null;

      const result = EnumTransformer.merge(first as any, second as any);

      expect(result).to.be.null;
    });

    it('should merge two valid enums correctly', () => {
      const first: Tsoa.RefEnumType = {
        dataType: 'refEnum',
        refName: 'TestEnum',
        enums: ['value1'],
        enumVarnames: ['VALUE1'],
        description: 'First enum',
        deprecated: false,
      };

      const second: Tsoa.RefEnumType = {
        dataType: 'refEnum',
        refName: 'TestEnum',
        enums: ['value2'],
        enumVarnames: ['VALUE2'],
        description: 'Second enum',
        deprecated: true,
      };

      const result = EnumTransformer.merge(first, second);

      expect(result).to.deep.equal({
        dataType: 'refEnum',
        refName: 'TestEnum',
        enums: ['value1', 'value2'],
        enumVarnames: ['VALUE1', 'VALUE2'],
        description: 'First enum\nSecond enum',
        deprecated: true,
        example: undefined,
      });
    });

    it('should handle enums with undefined properties', () => {
      const first: Tsoa.RefEnumType = {
        dataType: 'refEnum',
        refName: 'TestEnum',
        enums: ['value1'],
        enumVarnames: ['VALUE1'],
        description: undefined,
        deprecated: false,
      };

      const second: Tsoa.RefEnumType = {
        dataType: 'refEnum',
        refName: 'TestEnum',
        enums: ['value2'],
        enumVarnames: ['VALUE2'],
        description: 'Second enum',
        deprecated: false,
      };

      const result = EnumTransformer.merge(first, second);

      expect(result).to.deep.equal({
        dataType: 'refEnum',
        refName: 'TestEnum',
        enums: ['value1', 'value2'],
        enumVarnames: ['VALUE1', 'VALUE2'],
        description: 'Second enum',
        deprecated: false,
        example: undefined,
      });
    });

    it('should handle enums with undefined enumVarnames', () => {
      const first: Tsoa.RefEnumType = {
        dataType: 'refEnum',
        refName: 'TestEnum',
        enums: ['value1'],
        enumVarnames: undefined,
        description: 'First enum',
        deprecated: false,
      };

      const second: Tsoa.RefEnumType = {
        dataType: 'refEnum',
        refName: 'TestEnum',
        enums: ['value2'],
        enumVarnames: ['VALUE2'],
        description: 'Second enum',
        deprecated: false,
      };

      const result = EnumTransformer.merge(first, second);

      expect(result).to.deep.equal({
        dataType: 'refEnum',
        refName: 'TestEnum',
        enums: ['value1', 'value2'],
        enumVarnames: ['VALUE2'],
        description: 'First enum\nSecond enum',
        deprecated: false,
        example: undefined,
      });
    });

    it('should handle enums with undefined enums', () => {
      const first: Tsoa.RefEnumType = {
        dataType: 'refEnum',
        refName: 'TestEnum',
        enums: undefined as any,
        enumVarnames: ['VALUE1'],
        description: 'First enum',
        deprecated: false,
      };

      const second: Tsoa.RefEnumType = {
        dataType: 'refEnum',
        refName: 'TestEnum',
        enums: ['value2'],
        enumVarnames: ['VALUE2'],
        description: 'Second enum',
        deprecated: false,
      };

      const result = EnumTransformer.merge(first, second);

      expect(result).to.deep.equal({
        dataType: 'refEnum',
        refName: 'TestEnum',
        enums: ['value2'],
        enumVarnames: ['VALUE1', 'VALUE2'],
        description: 'First enum\nSecond enum',
        deprecated: false,
        example: undefined,
      });
    });

    it('should handle example property correctly', () => {
      const first: Tsoa.RefEnumType = {
        dataType: 'refEnum',
        refName: 'TestEnum',
        enums: ['value1'],
        enumVarnames: ['VALUE1'],
        description: 'First enum',
        deprecated: false,
        example: 'example1',
      };

      const second: Tsoa.RefEnumType = {
        dataType: 'refEnum',
        refName: 'TestEnum',
        enums: ['value2'],
        enumVarnames: ['VALUE2'],
        description: 'Second enum',
        deprecated: false,
        example: 'example2',
      };

      const result = EnumTransformer.merge(first, second);

      expect(result).to.deep.equal({
        dataType: 'refEnum',
        refName: 'TestEnum',
        enums: ['value1', 'value2'],
        enumVarnames: ['VALUE1', 'VALUE2'],
        description: 'First enum\nSecond enum',
        deprecated: false,
        example: 'example1', // First example should be used
      });
    });

    it('should merge title property correctly', () => {
      const first: Tsoa.RefEnumType = {
        dataType: 'refEnum',
        refName: 'TestEnum',
        enums: ['value1'],
        enumVarnames: ['VALUE1'],
        description: 'First enum',
        deprecated: false,
        title: 'First Title',
      };

      const second: Tsoa.RefEnumType = {
        dataType: 'refEnum',
        refName: 'TestEnum',
        enums: ['value2'],
        enumVarnames: ['VALUE2'],
        description: 'Second enum',
        deprecated: false,
        title: 'Second Title',
      };

      const result = EnumTransformer.merge(first, second);

      expect(result.title).to.equal('First Title'); // First title should be used
    });

    it('should use second title if first is undefined', () => {
      const first: Tsoa.RefEnumType = {
        dataType: 'refEnum',
        refName: 'TestEnum',
        enums: ['value1'],
        enumVarnames: ['VALUE1'],
        description: 'First enum',
        deprecated: false,
      };

      const second: Tsoa.RefEnumType = {
        dataType: 'refEnum',
        refName: 'TestEnum',
        enums: ['value2'],
        enumVarnames: ['VALUE2'],
        description: 'Second enum',
        deprecated: false,
        title: 'Second Title',
      };

      const result = EnumTransformer.merge(first, second);

      expect(result.title).to.equal('Second Title');
    });
  });

  describe('mergeMany method', () => {
    it('should handle empty array', () => {
      const result = EnumTransformer.mergeMany([]);
      expect(result).to.be.undefined;
    });

    it('should handle single enum', () => {
      const enumType: Tsoa.RefEnumType = {
        dataType: 'refEnum',
        refName: 'TestEnum',
        enums: ['value1'],
        enumVarnames: ['VALUE1'],
        description: 'Test enum',
        deprecated: false,
      };

      const result = EnumTransformer.mergeMany([enumType]);
      expect(result).to.deep.equal(enumType);
    });

    it('should merge multiple enums correctly', () => {
      const enums: Tsoa.RefEnumType[] = [
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
        {
          dataType: 'refEnum',
          refName: 'TestEnum',
          enums: ['value3'],
          enumVarnames: ['VALUE3'],
          description: 'Third enum',
          deprecated: true,
        },
      ];

      const result = EnumTransformer.mergeMany(enums);

      expect(result).to.deep.equal({
        dataType: 'refEnum',
        refName: 'TestEnum',
        enums: ['value1', 'value2', 'value3'],
        enumVarnames: ['VALUE1', 'VALUE2', 'VALUE3'],
        description: 'First enum\nSecond enum\nThird enum',
        deprecated: true,
        example: undefined,
      });
    });
  });
});
