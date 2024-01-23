import { Get } from '@tsoa/runtime/decorators/methods';
import { Route } from '@tsoa/runtime/decorators/route';


interface InvalidExtension {
  /**
   * @extension {"key-1": "value-1"}
   */
  invalidExtension: number;
}

@Route('BadExtensionTest')
export class InvalidExtensionModelController {
  // Vendor extensions must start with 'x-'
  @Get('badExtension')
  public async badExtensionMethod(): Promise<InvalidExtension> {
    return {
      invalidExtension: 1,
    };
  }
}
