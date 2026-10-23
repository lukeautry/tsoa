import { Body, Post, Route } from 'tsoa';
import { z } from 'zod';

const IndexValuesSchema = z.object({
  values: z.record(z.string(), z.any()),
});

@Route('IndexValues')
export class TypeContextIndexValuesController {
  @Post('values')
  public accept(@Body() value: z.infer<typeof IndexValuesSchema>): z.infer<typeof IndexValuesSchema> {
    return value;
  }
}
