import { Get, Route } from '@tsoa/runtime';
import { Keep } from './models';

/** Integer description.
 * @isInt
 * @default 3
 */
type IntegerView = number;

/** Float description.
 * @isFloat
 * @default 4.5
 */
type FloatView = number;

interface Box<T> {
  value: T;
}

type Boxes<T, U> = Box<T> | Box<U>;
type ErasedBoxes = Boxes<IntegerView, FloatView>;

interface Left {
  left: string;
}

interface Right {
  right: number;
}

type Pair = Left | Right;

interface Target {
  value: number | Pair | null;
}

@Route('type-context-boundaries')
export class PreservationController {
  @Get('boxes')
  public boxes(): ErasedBoxes {
    return { value: 3 };
  }

  @Get('pair')
  public pair(): Keep<Target> {
    return { value: null };
  }
}
