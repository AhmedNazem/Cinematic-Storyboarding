import { Prisma } from "@prisma/client";
import { prisma } from "../lib/db/client";
import { CreateShotInput, UpdateShotInput } from "../schemas/shot.schema";

/** Convert null sceneData → Prisma.DbNull for nullable Json fields */
function sanitizeSceneData(
  data: Record<string, unknown> | null | undefined,
): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined {
  if (data === null) return Prisma.DbNull;
  return data as Prisma.InputJsonValue | undefined;
}

/** Find all shots in a sequence (ordered by orderIndex) */
export async function findBySequence(sequenceId: string) {
  return prisma.shot.findMany({
    where: { sequenceId },
    orderBy: { orderIndex: "asc" },
  });
}

/** Find shot by ID with parent chain for ownership check */
export async function findById(id: string) {
  return prisma.shot.findUnique({
    where: { id },
    include: {
      sequence: {
        select: {
          id: true,
          name: true,
          project: { select: { orgId: true } },
        },
      },
    },
  });
}

/** Create shot in a sequence */
export async function create(
  sequenceId: string,
  data: CreateShotInput,
) {
  return prisma.shot.create({
    data: {
      ...data,
      sequenceId,
      sceneData: sanitizeSceneData(data.sceneData),
    },
  });
}

/** Update shot */
export async function update(id: string, data: UpdateShotInput) {
  return prisma.shot.update({
    where: { id },
    data: {
      ...data,
      sceneData: sanitizeSceneData(data.sceneData),
    },
  });
}

/** Soft-delete shot — sets deletedAt instead of removing */
export async function remove(id: string) {
  return prisma.shot.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

/** Verify shot belongs to an org through sequence→project chain */
export async function verifyOwnership(
  shotId: string,
  orgId: string,
): Promise<boolean> {
  const shot = await prisma.shot.findFirst({
    where: {
      id: shotId,
      sequence: { project: { orgId } },
    },
  });
  return shot !== null;
}

/** Bulk soft-delete all shots in a sequence (cascade helper) */
export async function softDeleteBySequence(sequenceId: string) {
  return prisma.shot.updateMany({
    where: { sequenceId },
    data: { deletedAt: new Date() },
  });
}
