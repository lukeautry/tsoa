import { z } from 'zod';

export interface Widget {
  id: number;
  name: string;
  active: boolean;
}

const ZodWidgetSchema = z.object({
  id: z.number(),
  label: z.string(),
  enabled: z.boolean(),
});

export type ZodWidget = z.infer<typeof ZodWidgetSchema>;
