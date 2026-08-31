import { Controller, Get, Route } from '@tsoa/runtime';
import { ConflictingModelHolderA } from '../duplicateModels/conflictingModel';
import { ConflictingModelHolderB } from '../duplicateModels/conflictingModelDuplicate';

@Route('ConflictingModels')
export class ConflictingModelsController extends Controller {
  @Get('a')
  public async getA(): Promise<ConflictingModelHolderA> {
    return { model: { valueA: 'a' } };
  }

  @Get('b')
  public async getB(): Promise<ConflictingModelHolderB> {
    return { model: { valueB: 1 } };
  }
}
