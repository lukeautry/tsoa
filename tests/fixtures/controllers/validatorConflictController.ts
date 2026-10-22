import { Controller, Get, Route } from '@tsoa/runtime';
import { ValidatedModelHolderA } from '../duplicateModels/validatedModel';
import { ValidatedModelHolderB } from '../duplicateModels/validatedModelDuplicate';

@Route('ValidatorConflict')
export class ValidatorConflictController extends Controller {
  @Get('a')
  public async getA(): Promise<ValidatedModelHolderA> {
    return { model: { code: 'ab' } };
  }

  @Get('b')
  public async getB(): Promise<ValidatedModelHolderB> {
    return { model: { code: 'b' } };
  }
}
