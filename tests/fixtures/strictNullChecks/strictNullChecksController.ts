declare function Route(path: string): (...args: unknown[]) => void;
declare function Get(path: string): (...args: unknown[]) => void;

@Route('strict-null-checks')
export class StrictNullChecksController {
  private value: string | null = null;

  @Get('')
  public get() {
    return this.value;
  }
}
