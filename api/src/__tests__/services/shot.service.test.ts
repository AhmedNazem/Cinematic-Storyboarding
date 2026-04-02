import { vi, describe, it, expect, beforeEach } from "vitest";
import * as shotRepo from "../../repositories/shot.repository";
import * as seqRepo from "../../repositories/sequence.repository";
import {
  listShots,
  getShot,
  createShot,
  updateShot,
  deleteShot,
} from "../../services/shot.service";

vi.mock("../../repositories/shot.repository");
vi.mock("../../repositories/sequence.repository");

const ORG = "org-1";
const SEQ_ID = "seq-1";
const SHOT_ID = "shot-1";

const mockShot = {
  id: SHOT_ID,
  sequenceId: SEQ_ID,
  sequence: { project: { orgId: ORG } },
  name: "Wide Establishing",
  orderIndex: 0,
  durationSec: 5.0,
  sceneData: {},
};

describe("shot.service", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // ─── listShots ────────────────────────────────────────────────────────────

  describe("listShots", () => {
    it("returns shots when org owns the sequence", async () => {
      vi.mocked(seqRepo.verifyOwnership).mockResolvedValue(true);
      vi.mocked(shotRepo.findBySequence).mockResolvedValue([mockShot]);
      const result = await listShots(SEQ_ID, ORG);
      expect(result).toHaveLength(1);
      expect(shotRepo.findBySequence).toHaveBeenCalledWith(SEQ_ID);
    });

    it("throws 404 when sequence not owned by org", async () => {
      vi.mocked(seqRepo.verifyOwnership).mockResolvedValue(false);
      await expect(listShots(SEQ_ID, ORG)).rejects.toMatchObject({ statusCode: 404 });
      expect(shotRepo.findBySequence).not.toHaveBeenCalled();
    });
  });

  // ─── getShot ──────────────────────────────────────────────────────────────

  describe("getShot", () => {
    it("returns shot when org ownership chain is valid", async () => {
      vi.mocked(shotRepo.findById).mockResolvedValue(mockShot);
      const result = await getShot(SHOT_ID, ORG);
      expect(result).toEqual(mockShot);
    });

    it("throws 404 when shot not found", async () => {
      vi.mocked(shotRepo.findById).mockResolvedValue(null);
      await expect(getShot(SHOT_ID, ORG)).rejects.toMatchObject({ statusCode: 404 });
    });

    it("throws 404 when shot belongs to different org", async () => {
      vi.mocked(shotRepo.findById).mockResolvedValue({
        ...mockShot,
        sequence: { project: { orgId: "other-org" } },
      });
      await expect(getShot(SHOT_ID, ORG)).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  // ─── createShot ───────────────────────────────────────────────────────────

  describe("createShot", () => {
    it("creates shot when org owns the sequence", async () => {
      const input = { name: "Close-Up", orderIndex: 1, durationSec: 3.0 };
      vi.mocked(seqRepo.verifyOwnership).mockResolvedValue(true);
      vi.mocked(shotRepo.create).mockResolvedValue({ ...mockShot, ...input });
      const result = await createShot(SEQ_ID, ORG, input);
      expect(shotRepo.create).toHaveBeenCalledWith(SEQ_ID, input);
      expect(result.name).toBe("Close-Up");
    });

    it("throws 404 when sequence not owned by org", async () => {
      vi.mocked(seqRepo.verifyOwnership).mockResolvedValue(false);
      await expect(createShot(SEQ_ID, ORG, { name: "x", orderIndex: 0 }))
        .rejects.toMatchObject({ statusCode: 404 });
      expect(shotRepo.create).not.toHaveBeenCalled();
    });
  });

  // ─── updateShot ───────────────────────────────────────────────────────────

  describe("updateShot", () => {
    it("updates when org owns the shot", async () => {
      vi.mocked(shotRepo.verifyOwnership).mockResolvedValue(true);
      vi.mocked(shotRepo.update).mockResolvedValue({ ...mockShot, name: "Crane Shot" });
      const result = await updateShot(SHOT_ID, ORG, { name: "Crane Shot" });
      expect(shotRepo.update).toHaveBeenCalledWith(SHOT_ID, { name: "Crane Shot" });
      expect(result.name).toBe("Crane Shot");
    });

    it("throws 404 when ownership check fails", async () => {
      vi.mocked(shotRepo.verifyOwnership).mockResolvedValue(false);
      await expect(updateShot(SHOT_ID, ORG, { name: "x" }))
        .rejects.toMatchObject({ statusCode: 404 });
      expect(shotRepo.update).not.toHaveBeenCalled();
    });
  });

  // ─── deleteShot ───────────────────────────────────────────────────────────

  describe("deleteShot", () => {
    it("removes shot when ownership verified", async () => {
      vi.mocked(shotRepo.verifyOwnership).mockResolvedValue(true);
      vi.mocked(shotRepo.remove).mockResolvedValue(mockShot);
      await deleteShot(SHOT_ID, ORG);
      expect(shotRepo.remove).toHaveBeenCalledWith(SHOT_ID);
    });

    it("throws 404 when ownership check fails", async () => {
      vi.mocked(shotRepo.verifyOwnership).mockResolvedValue(false);
      await expect(deleteShot(SHOT_ID, ORG)).rejects.toMatchObject({ statusCode: 404 });
      expect(shotRepo.remove).not.toHaveBeenCalled();
    });
  });
});
