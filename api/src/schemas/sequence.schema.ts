import { z } from "zod";

export const createSequenceSchema = z
  .object({
    name: z.string().min(1).max(150),
    orderIndex: z.number().int().min(0).optional().default(0),
  })
  .strict();

export const updateSequenceSchema = z
  .object({
    name: z.string().min(1).max(150).optional(),
    orderIndex: z.number().int().min(0).optional(),
  })
  .strict();

export type CreateSequenceInput = z.infer<typeof createSequenceSchema>;
export type UpdateSequenceInput = z.infer<typeof updateSequenceSchema>;
