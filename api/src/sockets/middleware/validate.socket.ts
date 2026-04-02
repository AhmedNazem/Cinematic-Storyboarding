import type { ZodSchema } from "zod";
import type { AuthenticatedSocket, SocketErrorPayload } from "../types";

/** Max bytes per socket message payload (64 KB) */
export const MAX_SOCKET_PAYLOAD_BYTES = 64 * 1024;

/**
 * Factory that wraps a socket event handler with Zod validation + size enforcement.
 *
 * Usage:
 *   socket.on("shot:update", withValidation(shotUpdateSchema, onShotUpdate));
 *
 * On oversized payload → emits `error` event, handler is not called.
 * On schema failure   → emits `error` event with Zod details, handler is not called.
 * On valid payload    → calls handler with typed, parsed result.
 */
export function withValidation<T>(
  schema: ZodSchema<T>,
  handler: (socket: AuthenticatedSocket, payload: T) => void | Promise<void>,
): (socket: AuthenticatedSocket, raw: unknown) => void {
  return (socket: AuthenticatedSocket, raw: unknown): void => {
    // ─── Size check ───
    const payloadSize = Buffer.byteLength(JSON.stringify(raw ?? ""), "utf8");
    if (payloadSize > MAX_SOCKET_PAYLOAD_BYTES) {
      const err: SocketErrorPayload = {
        code: "PAYLOAD_TOO_LARGE",
        message: `Message exceeds ${MAX_SOCKET_PAYLOAD_BYTES / 1024} KB limit`,
      };
      socket.emit("error", err);
      return;
    }

    // ─── Schema validation ───
    const result = schema.safeParse(raw);
    if (!result.success) {
      const err: SocketErrorPayload = {
        code: "VALIDATION_ERROR",
        message: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "),
      };
      socket.emit("error", err);
      return;
    }

    // ─── Dispatch ───
    void handler(socket, result.data);
  };
}
