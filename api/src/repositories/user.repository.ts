import { prisma } from "../lib/db/client";
import { CreateUserInput, UpdateUserInput } from "../schemas/user.schema";

/** Find all users in an organization */
export async function findByOrg(orgId: string) {
  return prisma.user.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/** Find user by ID — scoped to org */
export async function findById(id: string, orgId: string) {
  return prisma.user.findFirst({
    where: { id, orgId },
    select: {
      id: true,
      email: true,
      role: true,
      orgId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/** Create (invite) a user in an organization */
export async function create(orgId: string, data: CreateUserInput) {
  return prisma.user.create({
    data: { ...data, orgId },
  });
}

/** Update user role */
export async function update(
  id: string,
  orgId: string,
  data: UpdateUserInput,
) {
  return prisma.user.update({
    where: { id, orgId },
    data,
  });
}

/** Soft-delete user — sets deletedAt instead of removing */
export async function remove(id: string, orgId: string) {
  return prisma.user.update({
    where: { id, orgId },
    data: { deletedAt: new Date() },
  });
}
