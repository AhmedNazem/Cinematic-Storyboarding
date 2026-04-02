import { vi, describe, it, expect, beforeEach } from "vitest";
import * as seqRepo from "../../repositories/sequence.repository";
import * as projectRepo from "../../repositories/project.repository";
import {
  listSequences,
  getSequence,
  createSequence,
  updateSequence,
  deleteSequence,
} from "../../services/sequence.service";

vi.mock("../../repositories/sequence.repository");
vi.mock("../../repositories/project.repository");

const ORG = "org-1";
const PROJECT_ID = "proj-1";
const SEQ_ID = "seq-1";

const mockProject = { id: PROJECT_ID, orgId: ORG, name: "Test Project" };
const mockSequence = {
  id: SEQ_ID,
  projectId: PROJECT_ID,
  project: { orgId: ORG },
  name: "Scene 1",
  orderIndex: 0,
};

describe("sequence.service", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // ─── listSequences ────────────────────────────────────────────────────────

  describe("listSequences", () => {
    it("returns sequences when project belongs to org", async () => {
      vi.mocked(projectRepo.findById).mockResolvedValue(mockProject);
      vi.mocked(seqRepo.findByProject).mockResolvedValue([mockSequence]);
      const result = await listSequences(PROJECT_ID, ORG);
      expect(result).toHaveLength(1);
      expect(seqRepo.findByProject).toHaveBeenCalledWith(PROJECT_ID);
    });

    it("throws 404 when project not found in org", async () => {
      vi.mocked(projectRepo.findById).mockResolvedValue(null);
      await expect(listSequences(PROJECT_ID, ORG)).rejects.toMatchObject({ statusCode: 404 });
      expect(seqRepo.findByProject).not.toHaveBeenCalled();
    });
  });

  // ─── getSequence ──────────────────────────────────────────────────────────

  describe("getSequence", () => {
    it("returns sequence owned by org", async () => {
      vi.mocked(seqRepo.findById).mockResolvedValue(mockSequence);
      const result = await getSequence(SEQ_ID, ORG);
      expect(result).toEqual(mockSequence);
    });

    it("throws 404 when sequence not found", async () => {
      vi.mocked(seqRepo.findById).mockResolvedValue(null);
      await expect(getSequence(SEQ_ID, ORG)).rejects.toMatchObject({ statusCode: 404 });
    });

    it("throws 404 when sequence belongs to different org", async () => {
      vi.mocked(seqRepo.findById).mockResolvedValue({
        ...mockSequence,
        project: { orgId: "other-org" },
      });
      await expect(getSequence(SEQ_ID, ORG)).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  // ─── createSequence ───────────────────────────────────────────────────────

  describe("createSequence", () => {
    it("creates sequence when project belongs to org", async () => {
      const input = { name: "Act II", orderIndex: 1 };
      vi.mocked(projectRepo.findById).mockResolvedValue(mockProject);
      vi.mocked(seqRepo.create).mockResolvedValue({ ...mockSequence, ...input });
      const result = await createSequence(PROJECT_ID, ORG, input);
      expect(seqRepo.create).toHaveBeenCalledWith(PROJECT_ID, input);
      expect(result.name).toBe("Act II");
    });

    it("throws 404 when project not found in org", async () => {
      vi.mocked(projectRepo.findById).mockResolvedValue(null);
      await expect(createSequence(PROJECT_ID, ORG, { name: "x", orderIndex: 0 }))
        .rejects.toMatchObject({ statusCode: 404 });
      expect(seqRepo.create).not.toHaveBeenCalled();
    });
  });

  // ─── updateSequence ───────────────────────────────────────────────────────

  describe("updateSequence", () => {
    it("updates when org owns the sequence", async () => {
      vi.mocked(seqRepo.verifyOwnership).mockResolvedValue(true);
      vi.mocked(seqRepo.update).mockResolvedValue({ ...mockSequence, name: "Updated" });
      const result = await updateSequence(SEQ_ID, ORG, { name: "Updated" });
      expect(seqRepo.update).toHaveBeenCalledWith(SEQ_ID, { name: "Updated" });
      expect(result.name).toBe("Updated");
    });

    it("throws 404 when ownership check fails", async () => {
      vi.mocked(seqRepo.verifyOwnership).mockResolvedValue(false);
      await expect(updateSequence(SEQ_ID, ORG, { name: "x" }))
        .rejects.toMatchObject({ statusCode: 404 });
      expect(seqRepo.update).not.toHaveBeenCalled();
    });
  });

  // ─── deleteSequence ───────────────────────────────────────────────────────

  describe("deleteSequence", () => {
    it("removes sequence when ownership verified", async () => {
      vi.mocked(seqRepo.verifyOwnership).mockResolvedValue(true);
      vi.mocked(seqRepo.remove).mockResolvedValue(mockSequence);
      await deleteSequence(SEQ_ID, ORG);
      expect(seqRepo.remove).toHaveBeenCalledWith(SEQ_ID);
    });

    it("throws 404 when ownership check fails", async () => {
      vi.mocked(seqRepo.verifyOwnership).mockResolvedValue(false);
      await expect(deleteSequence(SEQ_ID, ORG)).rejects.toMatchObject({ statusCode: 404 });
      expect(seqRepo.remove).not.toHaveBeenCalled();
    });
  });
});
