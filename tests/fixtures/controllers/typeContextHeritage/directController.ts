import { Get, Route } from '@tsoa/runtime';
import { Base, Left, Right } from './models';

@Route('type-context-heritage')
export class DirectController {
  @Get('left')
  public left(): Base<Left> {
    return {};
  }

  @Get('right')
  public right(): Base<Right> {
    return {};
  }
}
