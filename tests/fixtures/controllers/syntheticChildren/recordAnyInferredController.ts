import { Body, Post, Route } from '@tsoa/runtime';
import { z } from 'zod';

const ValuesSchema = z.object({
  values: z.record(z.string(), z.any()),
});

@Route('synthetic-children')
export class RecordAnyInferredController {
  @Post()
  public post(@Body() value: z.infer<typeof ValuesSchema>): z.infer<typeof ValuesSchema> {
    return value;
  }
}
