import { Get, Route } from '@tsoa/runtime';
import { Sibling } from './models';

@Route('type-context-heritage')
export class SiblingController {
  @Get()
  public get(): Sibling {
    return { shared: 'own', extra: true };
  }
}
