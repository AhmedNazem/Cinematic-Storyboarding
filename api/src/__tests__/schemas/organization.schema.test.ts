import { describe, it, expect } from "vitest";
import { updateOrganizationSchema } from "../../schemas/organization.schema";

describe("updateOrganizationSchema", () => {
  // ─── Valid ──────────────────────────────────────────────────────────────────

  it("accepts a valid organization name", () => {
    const result = updateOrganizationSchema.parse({ name: "AXIOM Studio" });
    expect(result.name).toBe("AXIOM Studio");
  });

  it("accepts name at boundary lengths (1 and 100 chars)", () => {
    expect(() => updateOrganizationSchema.parse({ name: "X" })).not.toThrow();
    expect(() => updateOrganizationSchema.parse({ name: "X".repeat(100) })).not.toThrow();
  });

  // ─── Invalid ────────────────────────────────────────────────────────────────

  it("rejects empty name", () => {
    expect(() => updateOrganizationSchema.parse({ name: "" })).toThrow();
  });

  it("rejects name over 100 characters", () => {
    expect(() => updateOrganizationSchema.parse({ name: "X".repeat(101) })).toThrow();
  });

  it("rejects missing name field", () => {
    expect(() => updateOrganizationSchema.parse({})).toThrow();
  });

  it("rejects non-string name", () => {
    expect(() => updateOrganizationSchema.parse({ name: 42 })).toThrow();
  });

  it("rejects unknown fields (strict mode)", () => {
    expect(() => updateOrganizationSchema.parse({ name: "Studio", plan: "pro" })).toThrow();
  });
});
