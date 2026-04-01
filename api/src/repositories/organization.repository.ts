import { prisma } from "../lib/db/client";
import { UpdateOrganizationInput } from "../schemas/organization.schema";

/** Find organization by ID — verifies membership via orgId */
export async function findById(orgId: string) {
  return prisma.organization.findUnique({
    where: { id: orgId },
    include: { _count: { select: { projects: true, users: true } } },
  });
}

/** Update organization — only within user's own org */
export async function update(orgId: string, data: UpdateOrganizationInput) {
  return prisma.organization.update({
    where: { id: orgId },
    data,
  });
}
