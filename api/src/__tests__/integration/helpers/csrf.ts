/**
 * CSRF helper for supertest integration tests.
 *
 * The app uses the double-submit cookie pattern: any GET issues a csrf-token
 * cookie; mutations must echo it in the x-csrf-token header.
 * This helper does a GET /health and extracts both forms for reuse.
 */
import request from "supertest";
import type { Express } from "express";

export type CsrfCtx = { cookie: string; token: string };

export async function getCsrf(app: Express): Promise<CsrfCtx> {
  const res = await request(app).get("/health");
  const raw: string[] = ([] as string[]).concat(res.headers["set-cookie"] ?? []);
  const entry = raw.find((c) => c.startsWith("csrf-token=")) ?? "";
  const token = entry.split(";")[0].split("=")[1] ?? "";
  return { cookie: `csrf-token=${token}`, token };
}
