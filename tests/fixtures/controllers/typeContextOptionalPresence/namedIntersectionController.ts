import { Get, Route } from '@tsoa/runtime';
import { OptionalKeys } from './captureModels';

@Route('optional-capture/namedIntersection')
export class NamedIntersectionController {
  @Get()
  public get() {
    interface LocalLeft {
      left: string;
    }
    interface LocalRight {
      right: number;
    }
    const result: OptionalKeys<LocalLeft & LocalRight> = {};
    return result;
  }
}
