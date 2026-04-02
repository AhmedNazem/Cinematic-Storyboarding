import { describe, it, expect } from "vitest";
import { createUserSchema, updateUserSchema } from "../../schemas/user.schema";

describe("createUserSchema", () => {
  // ─── Valid ──────────────────────────────────────────────────────────────────

  it("accepts valid email and defaults role to viewer", () => {
    const result = createUserSchema.parse({ email: "dev@axiom.io" });
    expect(result.email).toBe("dev@axiom.io");
    expect(result.role).toBe("viewer");
  });

  it("accepts all valid roles", () => {
    for (const role of ["viewer", "editor", "admin", "owner"] as const) {
      const result = createUserSchema.parse({ email: "a@b.com", role });
      expect(result.role).toBe(role);
    }
  });

  // ─── Invalid ────────────────────────────────────────────────────────────────

  it("rejects missing email", () => {
    expect(() => createUserSchema.parse({})).toThrow();
  });

  it("rejects malformed email", () => {
    expect(() => createUserSchema.parse({ email: "not-an-email" })).toThrow();
  });

  it("rejects unknown role value", () => {
    expect(() => createUserSchema.parse({ email: "a@b.com", role: "superadmin" })).toThrow();
  });

  it("rejects unknown fields (strict mode)", () => {
    expect(() => createUserSchema.parse({ email: "a@b.com", extra: true })).toThrow();
  });
});

describe("updateUserSchema", () => {
  // ─── Valid ──────────────────────────────────────────────────────────────────

  it("accepts a valid role", () => {
    const result = updateUserSchema.parse({ role: "editor" });
    expect(result.role).toBe("editor");
  });

  // ─── Invalid ────────────────────────────────────────────────────────────────

  it("rejects missing role", () => {
    expect(() => updateUserSchema.parse({})).toThrow();
  });

  it("rejects unknown role value", () => {
    expect(() => updateUserSchema.parse({ role: "god" })).toThrow();
  });

  it("rejects unknown fields (strict mode)", () => {
    expect(() => updateUserSchema.parse({ role: "editor", hack: true })).toThrow();
  });
});
