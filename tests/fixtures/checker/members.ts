import { Get, Route } from '@tsoa/runtime';

/** @pattern ^[0-9a-f-]{36}$ */
export type UUID = string;

export interface User {
  id: string;
  name: string;
  email?: string;
  age: number;
}

export interface WithUuid {
  id: UUID;
  label: string;
}

export type OnlyRequire<T, K extends keyof T> = Partial<T> & Required<Pick<T, K>>;
export type Getters<T> = { [K in keyof T as `get${Capitalize<string & K>}`]: T[K] };

export interface Page<T> {
  items: T[];
  total: number;
}

export interface Envelope<T> {
  data: T;
  meta: { at: string };
}

export class Account {
  public id!: string;
  private secret!: string;
  public static count: number;
  public readonly kind = 'a';

  constructor(
    public owner: string,
    private hidden: string,
    readonly tier: number,
  ) {}

  public method() {
    return this.secret + this.hidden;
  }
}

export class Jsonable {
  public a = 1;

  public toJSON(): { a: string } {
    return { a: String(this.a) };
  }
}

export interface Dict {
  [k: string]: string | null;
}

export interface Tree {
  children: Tree[];
  label: string;
}

export type RecursivePartial<T> = { [K in keyof T]?: RecursivePartial<T[K]> };

@Route('members')
export class MembersController {
  @Get('omit')
  public async omit(): Promise<Omit<WithUuid, 'label'>> {
    return null as any;
  }

  @Get('only')
  public async only(): Promise<OnlyRequire<User, 'id'>> {
    return null as any;
  }

  @Get('getters')
  public async getters(): Promise<Getters<Pick<User, 'id' | 'age'>>> {
    return null as any;
  }

  @Get('env')
  public async env(): Promise<Envelope<Page<Partial<User>>>> {
    return null as any;
  }

  @Get('account')
  public async account(): Promise<Account> {
    return null as any;
  }

  @Get('omitAccount')
  public async omitAccount(): Promise<Omit<Account, 'id'>> {
    return null as any;
  }

  @Get('jsonable')
  public async jsonable(): Promise<Jsonable> {
    return null as any;
  }

  @Get('dict')
  public async dict(): Promise<Dict> {
    return null as any;
  }

  @Get('tree')
  public async tree(): Promise<RecursivePartial<Tree>> {
    return null as any;
  }

  @Get('inferred')
  public async inferred() {
    return Promise.resolve({ ok: true, count: 1 });
  }

  @Get('literal')
  public async literal(): Promise<{ b: string; a?: number }> {
    return null as any;
  }
}
