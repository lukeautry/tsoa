import { Controller, Get, Route } from '@tsoa/runtime';
import type { Widget, ZodWidget } from 'external-pkg';

@Route('CrossPackage')
export class CrossPackageController extends Controller {
  @Get('widget')
  public getWidget(): Widget {
    return { id: 1, name: 'test', active: true };
  }

  @Get('zod-widget')
  public getZodWidget(): ZodWidget {
    return { id: 1, label: 'test', enabled: true };
  }
}
