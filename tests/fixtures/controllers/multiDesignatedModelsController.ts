import { Controller, Get, Route } from '@tsoa/runtime';
import { MultiDesignatedHolderA } from '../duplicateModels/multiDesignatedModel';
import { MultiDesignatedHolderB } from '../duplicateModels/multiDesignatedModelDuplicate';

@Route('MultiDesignatedModels')
export class MultiDesignatedModelsController extends Controller {
  @Get('a')
  public async getA(): Promise<MultiDesignatedHolderA> {
    return { model: { a: 'a' } };
  }

  @Get('b')
  public async getB(): Promise<MultiDesignatedHolderB> {
    return { model: { b: 1 } };
  }
}
