import { inject, injectable } from 'inversify';

@injectable()
export class ManagedService {
  constructor(@inject(Symbol.for('requestPath')) private readonly path: string) {}

  public getPath(): string {
    return this.path;
  }
}
