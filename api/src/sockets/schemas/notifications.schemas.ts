import { z } from "zod";

// ─── Client → Server ───

// No extra fields needed — orgId is derived from socket.data.user.orgId (JWT).
export const subscribeNotificationsSchema = z.object({}).strict();

// ─── Inferred Types ───

export type SubscribeNotificationsPayload = z.infer<typeof subscribeNotificationsSchema>;
