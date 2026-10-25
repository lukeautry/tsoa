import { Controller, Get, Query, Route } from '@tsoa/runtime';

/** A compiler fixture. */
export interface BackendModel {
  /** A label.
   * @minLength 2
   * @example hello
   */
  label: string;
}
interface First {
  value: string;
}
interface Second {
  count: number;
}
type Choice = First | Second;
type WithoutFirst = Exclude<Choice, First>;

@Route('compiler')
export class BackendController extends Controller {
  /** Read a model.
   * @param id The model identifier.
   * @isInt id
   */
  @Get('{id}')
  public get(id: number, @Query() search: string): BackendModel {
    return { label: `${id}${search}` };
  }

  @Get('exclude')
  public exclude(): WithoutFirst {
    return { count: 1 };
  }
}
