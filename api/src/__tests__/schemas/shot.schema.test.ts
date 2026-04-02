import { describe, it, expect } from "vitest";
import { createShotSchema, updateShotSchema } from "../../schemas/shot.schema";

describe("createShotSchema", () => {
  // ─── Valid ──────────────────────────────────────────────────────────────────

  it("accepts name and applies all defaults", () => {
    const result = createShotSchema.parse({ name: "Wide Shot" });
    expect(result.name).toBe("Wide Shot");
    expect(result.orderIndex).toBe(0);
    expect(result.durationSec).toBe(5.0);
    expect(result.sceneData).toBeUndefined();
  });

  it("accepts all fields with explicit values", () => {
    const input = { name: "Close-Up", orderIndex: 3, durationSec: 10.5, sceneData: { camera: {} } };
    const result = createShotSchema.parse(input);
    expect(result.durationSec).toBe(10.5);
    expect(result.sceneData).toEqual({ camera: {} });
  });

  it("accepts null sceneData", () => {
    const result = createShotSchema.parse({ name: "Shot", sceneData: null });
    expect(result.sceneData).toBeNull();
  });

  it("accepts durationSec at boundary (just above 0 and at 300)", () => {
    expect(() => createShotSchema.parse({ name: "S", durationSec: 0.01 })).not.toThrow();
    expect(() => createShotSchema.parse({ name: "S", durationSec: 300 })).not.toThrow();
  });

  // ─── Invalid ────────────────────────────────────────────────────────────────

  it("rejects empty name", () => {
    expect(() => createShotSchema.parse({ name: "" })).toThrow();
  });

  it("rejects name over 150 characters", () => {
    expect(() => createShotSchema.parse({ name: "A".repeat(151) })).toThrow();
  });

  it("rejects durationSec of 0 (must be positive)", () => {
    expect(() => createShotSchema.parse({ name: "Shot", durationSec: 0 })).toThrow();
  });

  it("rejects durationSec over 300 seconds", () => {
    expect(() => createShotSchema.parse({ name: "Shot", durationSec: 301 })).toThrow();
  });

  it("rejects negative orderIndex", () => {
    expect(() => createShotSchema.parse({ name: "Shot", orderIndex: -1 })).toThrow();
  });

  it("rejects float orderIndex (must be int)", () => {
    expect(() => createShotSchema.parse({ name: "Shot", orderIndex: 2.5 })).toThrow();
  });

  it("rejects unknown fields (strict mode)", () => {
    expect(() => createShotSchema.parse({ name: "Shot", thumbnail: "url" })).toThrow();
  });
});

describe("updateShotSchema", () => {
  // ─── Valid ──────────────────────────────────────────────────────────────────

  it("accepts empty object (all fields optional)", () => {
    expect(updateShotSchema.parse({})).toEqual({});
  });

  it("accepts null sceneData to clear scene", () => {
    const result = updateShotSchema.parse({ sceneData: null });
    expect(result.sceneData).toBeNull();
  });

  it("accepts partial update with only durationSec", () => {
    const result = updateShotSchema.parse({ durationSec: 8.0 });
    expect(result.durationSec).toBe(8.0);
  });

  // ─── Invalid ────────────────────────────────────────────────────────────────

  it("rejects negative durationSec", () => {
    expect(() => updateShotSchema.parse({ durationSec: -1 })).toThrow();
  });

  it("rejects durationSec over 300", () => {
    expect(() => updateShotSchema.parse({ durationSec: 301 })).toThrow();
  });

  it("rejects unknown fields (strict mode)", () => {
    expect(() => updateShotSchema.parse({ name: "Shot", extra: true })).toThrow();
  });
});
