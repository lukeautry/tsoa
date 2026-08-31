import { Controller, Get, Route } from '@tsoa/runtime';
import { MergedConstConflictHolderA } from '../duplicateModels/mergedConstConflict';
import { MergedConstConflictHolderB } from '../duplicateModels/mergedConstConflictDuplicate';

@Route('MergedConstConflict')
export class MergedConstConflictController extends Controller {
  @Get('a')
  public async getA(): Promise<MergedConstConflictHolderA> {
    return { value: 'ON' };
  }

  @Get('b')
  public async getB(): Promise<MergedConstConflictHolderB> {
    return { value: 'IDLE' };
  }
}
