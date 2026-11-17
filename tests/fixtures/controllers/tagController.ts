import { Route, Controller, Get, QueryParam } from '@tsoa/runtime';

/**
 * @isLong
 */
export type NumType = number;

@Route('TagTest')
export class TagController extends Controller {
  /**
   * @isInt index
   * @param {number} index
   */
  @Get()
  public async get(@QueryParam() index: NumType, @QueryParam() index2: number): Promise<void> {
    return;
  }
}
