import { Controller, Route, Get, Query } from '../../../src';

/**
 * @isInt
 */
export type num = number;

@Route('Tag')
export class TagController extends Controller {
  /**
   *
   * @example index2
   */
  @Get()
  public async get(@Query() index: num, @Query() index2: number): Promise<void> {
    return;
  }
}
