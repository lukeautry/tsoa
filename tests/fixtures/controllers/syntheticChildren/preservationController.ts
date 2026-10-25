import { Get, Route } from '@tsoa/runtime';
import { Keep } from './models';

enum Color {
  Red = 'red',
  Blue = 'blue',
}

interface Shape {
  width: number;
  height: number;
}

type Pair = [string, number];

interface Holder {
  key: keyof Shape;
  mixed: keyof Shape | 'other';
}

@Route('synthetic-children')
export class PreservationController {
  @Get('mapped')
  public mapped(): Keep<{ flag: boolean; maybeFlag: boolean | null; color: Color; maybeColor: Color | undefined; side: 'width' | 'height' | undefined; pair: Pair | string }> {
    return { flag: true, maybeFlag: null, color: Color.Red, maybeColor: undefined, side: 'width', pair: 'x' };
  }

  @Get('source')
  public source(): Holder {
    return { key: 'width', mixed: 'other' };
  }
}
