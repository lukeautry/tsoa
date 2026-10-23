import { Get, Route } from '@tsoa/runtime';
import { OptionalClass, OptionalValues } from './models';

@Route('optional-presence')
export class SourceFirstController {
  @Get('source')
  public source(): OptionalValues<string> {
    return {};
  }

  @Get('inferred')
  public inferred() {
    const result: OptionalValues<string> = {};
    return result;
  }

  @Get('defaults')
  public defaults(): OptionalValues {
    return {};
  }

  @Get('class')
  public instance() {
    return new OptionalClass();
  }

  @Get('local')
  public async local() {
    interface LocalOptional {
      value?: string;
    }
    const result: LocalOptional = {};
    return result;
  }
}
