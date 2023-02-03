import { AbstractRouteGenerator } from '@tsoa/cli';

export class DummyRouteGenerator extends AbstractRouteGenerator<any> {
  private static CALL_COUNT = 0;

  GenerateCustomRoutes(): Promise<void> {
    DummyRouteGenerator.CALL_COUNT += 1;
    return Promise.resolve(undefined);
  }

  public static getCallCount(): number {
    return this.CALL_COUNT;
  }
}
