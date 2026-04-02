import { vi, describe, it, expect, beforeEach } from "vitest";
import * as userRepo from "../../repositories/user.repository";
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  removeUser,
} from "../../services/user.service";

vi.mock("../../repositories/user.repository");

const ORG = "org-1";
const USER_ID = "user-1";
const CALLER_ID = "caller-1";

const mockUser = {
  id: USER_ID,
  orgId: ORG,
  email: "member@example.com",
  role: "editor" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

describe("user.service", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // ─── listUsers ────────────────────────────────────────────────────────────

  describe("listUsers", () => {
    it("returns all users scoped to org", async () => {
      vi.mocked(userRepo.findByOrg).mockResolvedValue([mockUser]);
      const result = await listUsers(ORG);
      expect(result).toHaveLength(1);
      expect(userRepo.findByOrg).toHaveBeenCalledWith(ORG);
    });
  });

  // ─── getUser ──────────────────────────────────────────────────────────────

  describe("getUser", () => {
    it("returns user when found", async () => {
      vi.mocked(userRepo.findById).mockResolvedValue(mockUser);
      const result = await getUser(USER_ID, ORG);
      expect(result).toEqual(mockUser);
      expect(userRepo.findById).toHaveBeenCalledWith(USER_ID, ORG);
    });

    it("throws 404 when user not found in org", async () => {
      vi.mocked(userRepo.findById).mockResolvedValue(null);
      await expect(getUser(USER_ID, ORG)).rejects.toMatchObject({
        statusCode: 404,
        code: "NOT_FOUND",
      });
    });
  });

  // ─── createUser ───────────────────────────────────────────────────────────

  describe("createUser", () => {
    it("delegates to repo with orgId and input", async () => {
      const input = { email: "new@example.com", role: "viewer" as const };
      vi.mocked(userRepo.create).mockResolvedValue({ ...mockUser, ...input });
      const result = await createUser(ORG, input);
      expect(userRepo.create).toHaveBeenCalledWith(ORG, input);
      expect(result.email).toBe("new@example.com");
    });
  });

  // ─── updateUser ───────────────────────────────────────────────────────────

  describe("updateUser", () => {
    it("updates role when caller is not the target user", async () => {
      vi.mocked(userRepo.findById).mockResolvedValue(mockUser);
      vi.mocked(userRepo.update).mockResolvedValue({ ...mockUser, role: "admin" });
      const result = await updateUser(USER_ID, ORG, CALLER_ID, { role: "admin" });
      expect(result.role).toBe("admin");
      expect(userRepo.update).toHaveBeenCalledWith(USER_ID, ORG, { role: "admin" });
    });

    it("throws 400 when caller tries to change their own role", async () => {
      await expect(updateUser(CALLER_ID, ORG, CALLER_ID, { role: "viewer" }))
        .rejects.toMatchObject({ statusCode: 400, code: "BAD_REQUEST" });
      expect(userRepo.findById).not.toHaveBeenCalled();
    });

    it("throws 404 when target user not found", async () => {
      vi.mocked(userRepo.findById).mockResolvedValue(null);
      await expect(updateUser(USER_ID, ORG, CALLER_ID, { role: "admin" }))
        .rejects.toMatchObject({ statusCode: 404 });
    });
  });

  // ─── removeUser ───────────────────────────────────────────────────────────

  describe("removeUser", () => {
    it("removes user when caller is not the target", async () => {
      vi.mocked(userRepo.findById).mockResolvedValue(mockUser);
      vi.mocked(userRepo.remove).mockResolvedValue(mockUser);
      await removeUser(USER_ID, ORG, CALLER_ID);
      expect(userRepo.remove).toHaveBeenCalledWith(USER_ID, ORG);
    });

    it("throws 400 when caller tries to remove themselves", async () => {
      await expect(removeUser(CALLER_ID, ORG, CALLER_ID))
        .rejects.toMatchObject({ statusCode: 400, code: "BAD_REQUEST" });
      expect(userRepo.findById).not.toHaveBeenCalled();
    });

    it("throws 404 when user not found in org", async () => {
      vi.mocked(userRepo.findById).mockResolvedValue(null);
      await expect(removeUser(USER_ID, ORG, CALLER_ID))
        .rejects.toMatchObject({ statusCode: 404 });
      expect(userRepo.remove).not.toHaveBeenCalled();
    });
  });
});
