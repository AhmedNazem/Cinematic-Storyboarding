import type { Socket } from "socket.io";

// ─── Authenticated Socket ───
// Mirrors AuthenticatedRequest on the HTTP side.
// socket.data.user is populated by authenticateSocket middleware after JWT verification.
export interface SocketUser {
  id: string;
  orgId: string;
  role: string;
}

export interface AuthenticatedSocket extends Socket {
  data: {
    user: SocketUser;
  };
}

// ─── Socket Error Payload ───
// Shape of every `error` event emitted to clients.
export interface SocketErrorPayload {
  code: string;
  message: string;
}

// ─── Outbound Event Payloads (server → client) ───

export interface StudioJoinedPayload {
  projectId: string;
  roomSize: number;
}

export interface ShotUpdatedPayload {
  shotId: string;
  sceneData: Record<string, unknown>;
  updatedBy: string;
  serverVersion: number;
}

export interface ShotReconcilePayload {
  shotId: string;
  authoritative: Record<string, unknown>;
  serverVersion: number;
}

export interface NotificationPayload {
  id: string;
  type: "project.created" | "project.deleted" | "member.invited" | "shot.updated";
  message: string;
  resourceId: string;
  createdAt: string;
}

export interface PeerPresencePayload {
  userId: string;
  cursorPosition?: { x: number; y: number; z: number };
  selectedObjectId?: string | null;
}

export interface TimelineProgressPayload {
  userId: string;
  progress: number;
  isPlaying: boolean;
}

export interface PeerLeftPayload {
  userId: string;
}
