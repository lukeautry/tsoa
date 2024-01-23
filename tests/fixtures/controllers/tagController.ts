import { Query } from '@tsoa/runtime/decorators/parameter';
import { Get } from '@tsoa/runtime/decorators/methods';
import { Route } from '@tsoa/runtime/decorators/route';
import { Controller } from '@tsoa/runtime/interfaces/controller';


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
  public async get(@Query() index: NumType, @Query() index2: number): Promise<void> {
    return;
  }
}
