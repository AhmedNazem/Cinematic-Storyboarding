import { vi, describe, it, expect, beforeEach } from "vitest";
import * as projectRepo from "../../repositories/project.repository";
import * as seqRepo from "../../repositories/sequence.repository";
import * as shotRepo from "../../repositories/shot.repository";
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} from "../../services/project.service";

vi.mock("../../repositories/project.repository");
vi.mock("../../repositories/sequence.repository");
vi.mock("../../repositories/shot.repository");

const ORG = "org-1";
const PROJECT_ID = "proj-1";

const mockProject = {
  id: PROJECT_ID,
  orgId: ORG,
  name: "Test Project",
  aspectRatio: "2.39:1",
  sequences: [{ id: "seq-1" }, { id: "seq-2" }],
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

describe("project.service", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // ─── listProjects ──────────────────────────────────────────────────────────

  describe("listProjects", () => {
    it("returns paginated result with correct metadata", async () => {
      vi.mocked(projectRepo.findByOrg).mockResolvedValue({ data: [mockProject], total: 1 });
      const result = await listProjects(ORG, { page: 1, pageSize: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.pagination).toEqual({ total: 1, page: 1, pageSize: 20, totalPages: 1 });
      expect(projectRepo.findByOrg).toHaveBeenCalledWith(ORG, 0, 20);
    });

    it("calculates totalPages correctly for multiple pages", async () => {
      vi.mocked(projectRepo.findByOrg).mockResolvedValue({ data: [], total: 45 });
      const result = await listProjects(ORG, { page: 2, pageSize: 20 });
      expect(result.pagination.totalPages).toBe(3);
      expect(projectRepo.findByOrg).toHaveBeenCalledWith(ORG, 20, 20);
    });
  });

  // ─── getProject ───────────────────────────────────────────────────────────

  describe("getProject", () => {
    it("returns project when found in org", async () => {
      vi.mocked(projectRepo.findById).mockResolvedValue(mockProject);
      const result = await getProject(PROJECT_ID, ORG);
      expect(result).toEqual(mockProject);
      expect(projectRepo.findById).toHaveBeenCalledWith(PROJECT_ID, ORG);
    });

    it("throws 404 when project not found", async () => {
      vi.mocked(projectRepo.findById).mockResolvedValue(null);
      await expect(getProject(PROJECT_ID, ORG)).rejects.toMatchObject({
        statusCode: 404,
        code: "NOT_FOUND",
      });
    });
  });

  // ─── createProject ────────────────────────────────────────────────────────

  describe("createProject", () => {
    it("delegates creation to repo with orgId and input", async () => {
      const input = { name: "New Film", aspectRatio: "16:9" };
      vi.mocked(projectRepo.create).mockResolvedValue({ ...mockProject, ...input });
      const result = await createProject(ORG, input);
      expect(projectRepo.create).toHaveBeenCalledWith(ORG, input);
      expect(result.name).toBe("New Film");
    });
  });

  // ─── updateProject ────────────────────────────────────────────────────────

  describe("updateProject", () => {
    it("updates project when it exists in org", async () => {
      const update = { name: "Updated Title" };
      vi.mocked(projectRepo.findById).mockResolvedValue(mockProject);
      vi.mocked(projectRepo.update).mockResolvedValue({ ...mockProject, ...update });
      const result = await updateProject(PROJECT_ID, ORG, update);
      expect(result.name).toBe("Updated Title");
      expect(projectRepo.update).toHaveBeenCalledWith(PROJECT_ID, ORG, update);
    });

    it("throws 404 when project not found", async () => {
      vi.mocked(projectRepo.findById).mockResolvedValue(null);
      await expect(updateProject(PROJECT_ID, ORG, { name: "x" })).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  // ─── deleteProject ────────────────────────────────────────────────────────

  describe("deleteProject", () => {
    it("cascades soft-delete: shots → sequences → project", async () => {
      vi.mocked(projectRepo.findById).mockResolvedValue(mockProject);
      vi.mocked(shotRepo.softDeleteBySequence).mockResolvedValue(undefined);
      vi.mocked(seqRepo.softDeleteByProject).mockResolvedValue(undefined);
      vi.mocked(projectRepo.remove).mockResolvedValue(mockProject);

      await deleteProject(PROJECT_ID, ORG);

      expect(shotRepo.softDeleteBySequence).toHaveBeenCalledWith("seq-1");
      expect(shotRepo.softDeleteBySequence).toHaveBeenCalledWith("seq-2");
      expect(seqRepo.softDeleteByProject).toHaveBeenCalledWith(PROJECT_ID);
      expect(projectRepo.remove).toHaveBeenCalledWith(PROJECT_ID, ORG);
    });

    it("throws 404 when project not found", async () => {
      vi.mocked(projectRepo.findById).mockResolvedValue(null);
      await expect(deleteProject(PROJECT_ID, ORG)).rejects.toMatchObject({ statusCode: 404 });
      expect(projectRepo.remove).not.toHaveBeenCalled();
    });
  });
});
