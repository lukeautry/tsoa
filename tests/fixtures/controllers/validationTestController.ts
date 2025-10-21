import { Body, Post, Route } from '@tsoa/runtime';

// Models for testing validation error sizes

export interface UnionTypeA {
  type: 'typeA';
  valueA: string;
}

export interface UnionTypeB {
  type: 'typeB';
  valueB: number;
}

export interface UnionTypeC {
  type: 'typeC';
  valueC: boolean;
}

export type UnionProperty = UnionTypeA | UnionTypeB | UnionTypeC;

export interface UnionTypeModel {
  unionProperty: UnionProperty;
}

export interface DeepLevel5 {
  shouldBeString: string;
}

export interface DeepLevel4 {
  level5: DeepLevel5;
}

export interface DeepLevel3 {
  level4: DeepLevel4;
}

export interface DeepLevel2 {
  level3: DeepLevel3;
}

export interface DeepLevel1 {
  level2: DeepLevel2;
}

export interface DeepModel {
  level1: DeepLevel1;
}

export interface SubType1 {
  type: 'subType1';
  value: {
    level1: {
      level2: {
        shouldBeNumber: number;
      };
    };
  };
}

export interface SubType2 {
  type: 'subType2';
  otherValue: string;
}

export interface DeepUnion {
  nested: {
    deepUnion: SubType1 | SubType2;
  };
}

export interface TypeA {
  type: 'typeA';
  nested: DeepUnion;
}

export interface TypeB {
  type: 'typeB';
  simpleValue: string;
}

export interface ComplexUnionModel {
  type: 'complex' | 'simple';
  nested: TypeA | TypeB;
}

export interface LargeUnionType1 {
  type: 'type1';
  value1: string;
}

export interface LargeUnionType2 {
  type: 'type2';
  value2: string;
}

export interface LargeUnionType3 {
  type: 'type3';
  value3: string;
}

export interface LargeUnionType4 {
  type: 'type4';
  value4: string;
}

export interface LargeUnionType5 {
  type: 'type5';
  value5: string;
}

export interface LargeUnionType6 {
  type: 'type6';
  value6: string;
}

export interface LargeUnionType7 {
  type: 'type7';
  value7: string;
}

export interface LargeUnionType8 {
  type: 'type8';
  value8: string;
}

export type LargeUnion = LargeUnionType1 | LargeUnionType2 | LargeUnionType3 | LargeUnionType4 | LargeUnionType5 | LargeUnionType6 | LargeUnionType7 | LargeUnionType8;

export interface LargeUnionModel {
  largeUnion: LargeUnion;
}

@Route('ValidationTest')
export class ValidationTestController {
  @Post('UnionType')
  public async testUnionType(@Body() body: UnionTypeModel): Promise<void> {
    // This endpoint is for testing validation errors
    return Promise.resolve();
  }

  @Post('DeepModel')
  public async testDeepModel(@Body() body: DeepModel): Promise<void> {
    // This endpoint is for testing validation errors on deeply nested models
    return Promise.resolve();
  }

  @Post('ComplexUnionModel')
  public async testComplexUnionModel(@Body() body: ComplexUnionModel): Promise<void> {
    // This endpoint is for testing validation errors on complex nested unions
    return Promise.resolve();
  }

  @Post('LargeUnion')
  public async testLargeUnion(@Body() body: LargeUnionModel): Promise<void> {
    // This endpoint is for testing validation errors on large union types
    return Promise.resolve();
  }
}
