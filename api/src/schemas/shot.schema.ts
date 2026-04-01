import { z } from "zod";

export const createShotSchema = z
  .object({
    name: z.string().min(1).max(150),
    orderIndex: z.number().int().min(0).optional().default(0),
    durationSec: z.number().positive().max(300).optional().default(5.0),
    sceneData: z.record(z.unknown()).optional().nullable(),
  })
  .strict();

export const updateShotSchema = z
  .object({
    name: z.string().min(1).max(150).optional(),
    orderIndex: z.number().int().min(0).optional(),
    durationSec: z.number().positive().max(300).optional(),
    sceneData: z.record(z.unknown()).optional().nullable(),
  })
  .strict();

export type CreateShotInput = z.infer<typeof createShotSchema>;
export type UpdateShotInput = z.infer<typeof updateShotSchema>;
