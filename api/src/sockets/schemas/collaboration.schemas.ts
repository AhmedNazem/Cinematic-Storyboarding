import { z } from "zod";

// ─── Client → Server ───

export const presenceUpdateSchema = z
  .object({
    projectId: z.string().uuid(),
    cursorPosition: z
      .object({ x: z.number(), y: z.number(), z: z.number() })
      .optional(),
    selectedObjectId: z.string().uuid().nullable().optional(),
  })
  .strict();

export const timelineSyncSchema = z
  .object({
    projectId: z.string().uuid(),
    // GSAP globalTimeline.progress() — 0 (start) to 1 (end)
    progress: z.number().min(0).max(1),
    isPlaying: z.boolean(),
  })
  .strict();

// ─── Inferred Types ───

export type PresenceUpdatePayload = z.infer<typeof presenceUpdateSchema>;
export type TimelineSyncPayload = z.infer<typeof timelineSyncSchema>;
