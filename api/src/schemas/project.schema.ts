import { z } from "zod";

const ASPECT_RATIOS = ["2.39:1", "1.85:1", "16:9", "4:3", "1:1"] as const;

export const createProjectSchema = z
  .object({
    name: z.string().min(1).max(150),
    aspectRatio: z.enum(ASPECT_RATIOS).optional().default("2.39:1"),
  })
  .strict();

export const updateProjectSchema = z
  .object({
    name: z.string().min(1).max(150).optional(),
    aspectRatio: z.enum(ASPECT_RATIOS).optional(),
  })
  .strict();

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
