import { Get, Route } from '@tsoa/runtime';

export interface Annotated {
  /** @isInt */
  n: number;
  /** @pattern ^a$ */
  s: string;
  /** @default 3 */
  d?: number;
  /** @deprecated */
  old: string;
  /** @ignore */
  hidden: string;
  /**
   * A day
   * @isDate
   */
  day: Date;
  at: Date;
  data: Buffer;
  // eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
  boxed: String;
}

@Route('annotations')
export class AnnotationsController {
  @Get()
  public async m(): Promise<Annotated> {
    return null as any;
  }
}
