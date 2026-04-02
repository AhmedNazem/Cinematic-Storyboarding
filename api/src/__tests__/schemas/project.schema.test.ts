import { describe, it, expect } from "vitest";
import { createProjectSchema, updateProjectSchema } from "../../schemas/project.schema";

describe("createProjectSchema", () => {
  // ─── Valid ──────────────────────────────────────────────────────────────────

  it("accepts name and defaults aspectRatio to 2.39:1", () => {
    const result = createProjectSchema.parse({ name: "My Film" });
    expect(result.name).toBe("My Film");
    expect(result.aspectRatio).toBe("2.39:1");
  });

  it("accepts all valid aspect ratios", () => {
    for (const ratio of ["2.39:1", "1.85:1", "16:9", "4:3", "1:1"] as const) {
      const result = createProjectSchema.parse({ name: "Film", aspectRatio: ratio });
      expect(result.aspectRatio).toBe(ratio);
    }
  });

  it("accepts name at boundary lengths (1 and 150 chars)", () => {
    expect(() => createProjectSchema.parse({ name: "A" })).not.toThrow();
    expect(() => createProjectSchema.parse({ name: "A".repeat(150) })).not.toThrow();
  });

  // ─── Invalid ────────────────────────────────────────────────────────────────

  it("rejects empty name", () => {
    expect(() => createProjectSchema.parse({ name: "" })).toThrow();
  });

  it("rejects name over 150 characters", () => {
    expect(() => createProjectSchema.parse({ name: "A".repeat(151) })).toThrow();
  });

  it("rejects missing name", () => {
    expect(() => createProjectSchema.parse({})).toThrow();
  });

  it("rejects unknown aspect ratio", () => {
    expect(() => createProjectSchema.parse({ name: "Film", aspectRatio: "9:16" })).toThrow();
  });

  it("rejects unknown fields (strict mode)", () => {
    expect(() => createProjectSchema.parse({ name: "Film", genre: "horror" })).toThrow();
  });
});

describe("updateProjectSchema", () => {
  // ─── Valid ──────────────────────────────────────────────────────────────────

  it("accepts empty object (all fields optional)", () => {
    const result = updateProjectSchema.parse({});
    expect(result).toEqual({});
  });

  it("accepts partial update with only name", () => {
    const result = updateProjectSchema.parse({ name: "New Title" });
    expect(result.name).toBe("New Title");
  });

  it("accepts partial update with only aspectRatio", () => {
    const result = updateProjectSchema.parse({ aspectRatio: "16:9" });
    expect(result.aspectRatio).toBe("16:9");
  });

  // ─── Invalid ────────────────────────────────────────────────────────────────

  it("rejects empty string name", () => {
    expect(() => updateProjectSchema.parse({ name: "" })).toThrow();
  });

  it("rejects name over 150 characters", () => {
    expect(() => updateProjectSchema.parse({ name: "X".repeat(151) })).toThrow();
  });

  it("rejects unknown fields (strict mode)", () => {
    expect(() => updateProjectSchema.parse({ name: "Film", hack: true })).toThrow();
  });
});
