import { FormField, Post, Route } from '@tsoa/runtime';

@Route('fields')
export class FastifyFieldsController {
  @Post()
  public submit(@FormField('a') value: string): string {
    return value;
  }
}
