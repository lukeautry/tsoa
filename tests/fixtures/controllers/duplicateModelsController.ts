import { Controller, Get, Route } from '@tsoa/runtime';
import { DesignatedModelHolder } from '../duplicateModels/designatedModel';
import { DuplicateDesignatedModelHolder } from '../duplicateModels/designatedModelDuplicate';
import { CopiedModelHolderA } from '../duplicateModels/copiedModelHolderA';
import { CopiedModelHolderB } from '../duplicateModels/copiedModelHolderB';
import { BuiltModelSourceHolder } from '../duplicateModels/builtModelHolderSource';
import { BuiltModelBuiltHolder } from '../duplicateModels/builtModelHolderBuilt';
import { VerbatimModelHolderA } from '../duplicateModels/verbatimModel';
import { VerbatimModelHolderB } from '../duplicateModels/verbatimModelDuplicate';
import { MergedConstHolderA } from '../duplicateModels/mergedConstModel';
import { MergedConstHolderB } from '../duplicateModels/mergedConstModelDuplicate';
import { ValueSetHolderA } from '../duplicateModels/valueSetEnum';
import { ValueSetHolderB } from '../duplicateModels/valueSetEnumClientStyle';
import { ShapeModelHolderA } from '../duplicateModels/shapeInterface';
import { ShapeModelHolderB } from '../duplicateModels/shapeInterfaceCopy';
import { NamespacedModelHolderA, NamespacedModelHolderB } from '../duplicateModels/namespacedModel';

@Route('DuplicateModels')
export class DuplicateModelsController extends Controller {
  @Get('designated')
  public async getDesignated(): Promise<DesignatedModelHolder> {
    return { model: { canonicalValue: 'canonical' } };
  }

  @Get('designatedDuplicate')
  public async getDesignatedDuplicate(): Promise<DuplicateDesignatedModelHolder> {
    return { model: { wrongValue: 1 } };
  }

  @Get('copiedA')
  public async getCopiedA(): Promise<CopiedModelHolderA> {
    return { model: { id: 'a' } };
  }

  @Get('copiedB')
  public async getCopiedB(): Promise<CopiedModelHolderB> {
    return { model: { id: 'b' } };
  }

  @Get('builtSource')
  public async getBuiltSource(): Promise<BuiltModelSourceHolder> {
    return { model: { value: 'source' } };
  }

  @Get('builtOutput')
  public async getBuiltOutput(): Promise<BuiltModelBuiltHolder> {
    return { model: { value: 'built' } };
  }

  @Get('verbatimA')
  public async getVerbatimA(): Promise<VerbatimModelHolderA> {
    return { value: 'A' as VerbatimModelHolderA['value'] };
  }

  @Get('verbatimB')
  public async getVerbatimB(): Promise<VerbatimModelHolderB> {
    return { value: 'B' as VerbatimModelHolderB['value'] };
  }

  @Get('mergedConstA')
  public async getMergedConstA(): Promise<MergedConstHolderA> {
    return { value: 'ON' };
  }

  @Get('mergedConstB')
  public async getMergedConstB(): Promise<MergedConstHolderB> {
    return { value: 'OFF' };
  }

  @Get('valueSetA')
  public async getValueSetA(): Promise<ValueSetHolderA> {
    return { value: 'ALPHA' as ValueSetHolderA['value'] };
  }

  @Get('valueSetB')
  public async getValueSetB(): Promise<ValueSetHolderB> {
    return { value: 'BETA' };
  }

  @Get('shapeA')
  public async getShapeA(): Promise<ShapeModelHolderA> {
    return { model: { id: 'a' } };
  }

  @Get('shapeB')
  public async getShapeB(): Promise<ShapeModelHolderB> {
    return { model: { id: 'b' } };
  }

  @Get('namespacedA')
  public async getNamespacedA(): Promise<NamespacedModelHolderA> {
    return { model: { canonical: 'canonical' } };
  }

  @Get('namespacedB')
  public async getNamespacedB(): Promise<NamespacedModelHolderB> {
    return { model: { nested: 1 } };
  }
}
