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

// z.infer<> expands correctly only when TypeScript reads the .ts source.
// Compiled .d.ts files lose the schema's generic structure, causing the
// inferred type to collapse to {} — the core bug this fix addresses.
export type ZodWidget = z.infer<typeof ZodWidgetSchema>;
