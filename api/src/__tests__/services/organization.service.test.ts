import { vi, describe, it, expect, beforeEach } from "vitest";
import * as orgRepo from "../../repositories/organization.repository";
import { getOrganization, updateOrganization } from "../../services/organization.service";

vi.mock("../../repositories/organization.repository");

const ORG = "org-1";

const mockOrg = {
  id: ORG,
  name: "AXIOM Studio",
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

describe("organization.service", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // ─── getOrganization ──────────────────────────────────────────────────────

  describe("getOrganization", () => {
    it("returns org when found", async () => {
      vi.mocked(orgRepo.findById).mockResolvedValue(mockOrg);
      const result = await getOrganization(ORG);
      expect(result).toEqual(mockOrg);
      expect(orgRepo.findById).toHaveBeenCalledWith(ORG);
    });

    it("throws 404 when org not found", async () => {
      vi.mocked(orgRepo.findById).mockResolvedValue(null);
      await expect(getOrganization(ORG)).rejects.toMatchObject({
        statusCode: 404,
        code: "NOT_FOUND",
      });
    });
  });

  // ─── updateOrganization ───────────────────────────────────────────────────

  describe("updateOrganization", () => {
    it("updates org name when found", async () => {
      const updated = { ...mockOrg, name: "New Studio Name" };
      vi.mocked(orgRepo.findById).mockResolvedValue(mockOrg);
      vi.mocked(orgRepo.update).mockResolvedValue(updated);
      const result = await updateOrganization(ORG, { name: "New Studio Name" });
      expect(result.name).toBe("New Studio Name");
      expect(orgRepo.update).toHaveBeenCalledWith(ORG, { name: "New Studio Name" });
    });

    it("throws 404 when org not found", async () => {
      vi.mocked(orgRepo.findById).mockResolvedValue(null);
      await expect(updateOrganization(ORG, { name: "x" }))
        .rejects.toMatchObject({ statusCode: 404 });
      expect(orgRepo.update).not.toHaveBeenCalled();
    });
  });
});
