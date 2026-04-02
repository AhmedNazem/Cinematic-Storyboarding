import { describe, it, expect } from "vitest";
import { createSequenceSchema, updateSequenceSchema } from "../../schemas/sequence.schema";

describe("createSequenceSchema", () => {
  // ─── Valid ──────────────────────────────────────────────────────────────────

  it("accepts name and defaults orderIndex to 0", () => {
    const result = createSequenceSchema.parse({ name: "Act I" });
    expect(result.name).toBe("Act I");
    expect(result.orderIndex).toBe(0);
  });

  it("accepts explicit orderIndex", () => {
    const result = createSequenceSchema.parse({ name: "Act II", orderIndex: 5 });
    expect(result.orderIndex).toBe(5);
  });

  it("accepts name at boundary lengths (1 and 150 chars)", () => {
    expect(() => createSequenceSchema.parse({ name: "A" })).not.toThrow();
    expect(() => createSequenceSchema.parse({ name: "A".repeat(150) })).not.toThrow();
  });

  // ─── Invalid ────────────────────────────────────────────────────────────────

  it("rejects empty name", () => {
    expect(() => createSequenceSchema.parse({ name: "" })).toThrow();
  });

  it("rejects name over 150 characters", () => {
    expect(() => createSequenceSchema.parse({ name: "A".repeat(151) })).toThrow();
  });

  it("rejects negative orderIndex", () => {
    expect(() => createSequenceSchema.parse({ name: "Act I", orderIndex: -1 })).toThrow();
  });

  it("rejects float orderIndex (must be int)", () => {
    expect(() => createSequenceSchema.parse({ name: "Act I", orderIndex: 1.5 })).toThrow();
  });

  it("rejects unknown fields (strict mode)", () => {
    expect(() => createSequenceSchema.parse({ name: "Act I", color: "red" })).toThrow();
  });
});

describe("updateSequenceSchema", () => {
  // ─── Valid ──────────────────────────────────────────────────────────────────

  it("accepts empty object (all fields optional)", () => {
    const result = updateSequenceSchema.parse({});
    expect(result).toEqual({});
  });

  it("accepts partial update with only name", () => {
    const result = updateSequenceSchema.parse({ name: "Finale" });
    expect(result.name).toBe("Finale");
  });

  it("accepts orderIndex update to 0", () => {
    const result = updateSequenceSchema.parse({ orderIndex: 0 });
    expect(result.orderIndex).toBe(0);
  });

  // ─── Invalid ────────────────────────────────────────────────────────────────

  it("rejects empty string name", () => {
    expect(() => updateSequenceSchema.parse({ name: "" })).toThrow();
  });

  it("rejects negative orderIndex", () => {
    expect(() => updateSequenceSchema.parse({ orderIndex: -1 })).toThrow();
  });

  it("rejects unknown fields (strict mode)", () => {
    expect(() => updateSequenceSchema.parse({ name: "Act I", extra: true })).toThrow();
  });
});
