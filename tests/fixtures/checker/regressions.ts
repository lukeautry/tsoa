// Type constructs that the legacy resolver rejects or resolves incorrectly (see repros in the design doc).
import { Get, Route } from '@tsoa/runtime';
import { z } from 'zod';

const cfg = { mode: 'a', retries: 3 } as const;
export type Cfg = typeof cfg;

export enum Kind {
  A = 'a',
  B = 'b',
}
export interface Params {
  [Kind.A]: { foo: string };
  [Kind.B]: { bar: number };
}

export type Shout = Uppercase<'abc' | 'def'>;
export type UserId = `user_${string}`;

export type Event = { type: 'a'; a: string } | { type: 'b'; b: number } | { type: 'c' };

const ROLES = { admin: 1, user: 2 } as const;
export type Role = keyof typeof ROLES;
export type RoleValue = (typeof ROLES)[Role];

const UserSchema = z.object({ id: z.string(), age: z.number().optional() });
export type ZodUser = z.infer<typeof UserSchema>;

@Route('regressions')
export class RegressionsController {
  @Get('typeofConst')
  public async typeofConst(): Promise<Cfg> {
    return null as any;
  }

  @Get('indexedByEnum')
  public async indexedByEnum(): Promise<Params[Kind.A]> {
    return null as any;
  }

  @Get('intrinsic')
  public async intrinsic(): Promise<{ v: Shout }> {
    return null as any;
  }

  @Get('template')
  public async template(): Promise<{ id: UserId }> {
    return null as any;
  }

  @Get('exclude')
  public async exclude(): Promise<Exclude<Event, { type: 'c' }>> {
    return null as any;
  }

  @Get('keysAndValues')
  public async keysAndValues(): Promise<{ r: Role; v: RoleValue }> {
    return null as any;
  }

  @Get('zod')
  public async zod(): Promise<ZodUser> {
    return null as any;
  }
}
