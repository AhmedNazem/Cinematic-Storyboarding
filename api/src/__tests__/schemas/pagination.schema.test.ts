import { describe, it, expect } from "vitest";
import { paginationQuerySchema, toPrismaPage } from "../../schemas/pagination.schema";

describe("paginationQuerySchema", () => {
  // ─── Valid ──────────────────────────────────────────────────────────────────

  it("applies defaults when no query params provided", () => {
    const result = paginationQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it("parses string values and coerces to numbers", () => {
    const result = paginationQuerySchema.parse({ page: "3", pageSize: "50" });
    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(50);
  });

  it("accepts pageSize at the max boundary (100)", () => {
    const result = paginationQuerySchema.parse({ pageSize: "100" });
    expect(result.pageSize).toBe(100);
  });

  it("accepts page at the min boundary (1)", () => {
    const result = paginationQuerySchema.parse({ page: "1" });
    expect(result.page).toBe(1);
  });

  // ─── Invalid ────────────────────────────────────────────────────────────────

  it("rejects page 0 (minimum is 1)", () => {
    expect(() => paginationQuerySchema.parse({ page: "0" })).toThrow();
  });

  it("rejects negative page", () => {
    expect(() => paginationQuerySchema.parse({ page: "-1" })).toThrow();
  });

  it("rejects pageSize over 100", () => {
    expect(() => paginationQuerySchema.parse({ pageSize: "101" })).toThrow();
  });

  it("rejects pageSize of 0", () => {
    expect(() => paginationQuerySchema.parse({ pageSize: "0" })).toThrow();
  });

  it("rejects non-numeric string for page", () => {
    expect(() => paginationQuerySchema.parse({ page: "abc" })).toThrow();
  });
});

describe("toPrismaPage", () => {
  it("returns skip=0 and take=20 for page 1 pageSize 20", () => {
    expect(toPrismaPage({ page: 1, pageSize: 20 })).toEqual({ skip: 0, take: 20 });
  });

  it("returns correct skip for page 2", () => {
    expect(toPrismaPage({ page: 2, pageSize: 20 })).toEqual({ skip: 20, take: 20 });
  });

  it("returns correct skip for page 3 with pageSize 10", () => {
    expect(toPrismaPage({ page: 3, pageSize: 10 })).toEqual({ skip: 20, take: 10 });
  });

  it("returns correct skip for last page of large dataset", () => {
    expect(toPrismaPage({ page: 5, pageSize: 100 })).toEqual({ skip: 400, take: 100 });
  });
});
