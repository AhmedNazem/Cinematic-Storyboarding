import { z } from "zod";

// ─── Client → Server ───

export const joinProjectRoomSchema = z
  .object({ projectId: z.string().uuid() })
  .strict();

export const leaveProjectRoomSchema = z
  .object({ projectId: z.string().uuid() })
  .strict();

export const shotUpdateSchema = z
  .object({
    shotId: z.string().uuid(),
    projectId: z.string().uuid(),
    sceneData: z.record(z.unknown()),
    // clientVersion is the shot's updatedAt epoch (ms) when the client last fetched it.
    // Used for optimistic reconciliation: server compares against DB updatedAt.
    clientVersion: z.number().int().min(0),
  })
  .strict();

// ─── Inferred Types ───

export type JoinProjectRoomPayload = z.infer<typeof joinProjectRoomSchema>;
export type LeaveProjectRoomPayload = z.infer<typeof leaveProjectRoomSchema>;
export type ShotUpdatePayload = z.infer<typeof shotUpdateSchema>;
