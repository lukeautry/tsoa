import { Route, Get, QueryParam, Controller } from '@tsoa/runtime';

@Route('TagTest')
export class InvalidTagController extends Controller {
  /**
   * @isInt
   * @param {number} index
   */
  @Get('OrphanTag')
  public async OrphanTagWithNoName(@QueryParam() index: number): Promise<void> {
    return;
  }
}
