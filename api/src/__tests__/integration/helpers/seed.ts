/**
 * DB seed factory for integration tests.
 * Each test suite creates its own org with unique email tags → full isolation.
 * Cleanup hard-deletes the org; DB cascade removes all child records.
 */
import { prisma } from "../../../lib/db/client";
import { generateToken } from "../../../lib/auth/jwt";
import { generateSync, NobleCryptoPlugin, ScureBase32Plugin } from "otplib";

/** Fixed TOTP secret — 40 base32 chars (25 bytes / 200 bits), satisfies otplib v13 minimum */
export const TEST_MFA_SECRET = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

const _otpOpts = {
  strategy: "totp" as const,
  crypto: new NobleCryptoPlugin(),
  base32: new ScureBase32Plugin(),
};

/** Generate a valid TOTP code for MFA-gated routes */
export function mfaCode(): string {
  return generateSync({ ...(_otpOpts as any), secret: TEST_MFA_SECRET }) as string;
}

export type TestUser = { id: string; orgId: string; role: string };
export type TestCtx = {
  org: { id: string; name: string };
  owner: TestUser;
  admin: TestUser;
  editor: TestUser;
  viewer: TestUser;
};

/** Create an isolated org with four users (owner/admin/editor/viewer) */
export async function seedOrg(tag: string): Promise<TestCtx> {
  const org = await prisma.organization.create({ data: { name: `TestOrg-${tag}` } });
  const [owner, admin, editor, viewer] = await Promise.all([
    prisma.user.create({
      data: { orgId: org.id, email: `owner-${tag}@test.io`, role: "owner",
              mfaEnabled: true, mfaSecret: TEST_MFA_SECRET },
    }),
    prisma.user.create({
      data: { orgId: org.id, email: `admin-${tag}@test.io`, role: "admin",
              mfaEnabled: true, mfaSecret: TEST_MFA_SECRET },
    }),
    prisma.user.create({ data: { orgId: org.id, email: `editor-${tag}@test.io`, role: "editor" } }),
    prisma.user.create({ data: { orgId: org.id, email: `viewer-${tag}@test.io`, role: "viewer" } }),
  ]);
  return { org, owner, admin, editor, viewer };
}

/** Sign a JWT for a test user */
export function token(user: TestUser): string {
  return generateToken({ sub: user.id, orgId: user.orgId, role: user.role });
}

/** Hard-delete org + cascade (users, projects, sequences, shots). Cleans audit logs first. */
export async function teardownOrg(orgId: string): Promise<void> {
  await prisma.auditLog.deleteMany({ where: { orgId } });
  await prisma.organization.delete({ where: { id: orgId } });
}
