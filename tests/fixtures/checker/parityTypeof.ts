import { Get, Route } from '@tsoa/runtime';

// Legacy throws `Unknown type: TypeQuery` here, so this lives apart from parity.ts.
const shape = { id: 'x', count: 1 };
export type Shape = typeof shape;

@Route('parityTypeof')
export class ParityTypeofController {
  @Get('shape')
  public async shape(): Promise<Shape> {
    return null as any;
  }
}
