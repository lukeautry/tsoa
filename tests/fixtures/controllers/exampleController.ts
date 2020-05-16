import { Post, Route, Body, Path } from '../../../src';

/**
 * @example {
 *  "contry": "123",
 *  "city": "456"
 * }
 */
export interface Location {
  contry: string;
  city: string;
}

@Route('ExampleTest')
export class ExampleTestController {
  /**
   * @example location {
   *  "contry": "1",
   *  "city": "1"
   * }
   * @example location {
   *  "contry": "2",
   *  "city": "2"
   * }
   * @example s "aa0"
   * @example s "aa1"
   * @example s "aa2"
   */
  @Post('Example/{s}')
  public async example(@Body() location: Location, @Path() s: string): Promise<Location> {
    return {
      contry: '123',
      city: '456',
    };
  }
}
