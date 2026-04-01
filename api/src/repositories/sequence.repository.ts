import { prisma } from "../lib/db/client";
import {
  CreateSequenceInput,
  UpdateSequenceInput,
} from "../schemas/sequence.schema";

/** Find all sequences in a project (ordered by orderIndex) */
export async function findByProject(projectId: string) {
  return prisma.sequence.findMany({
    where: { projectId },
    orderBy: { orderIndex: "asc" },
    include: { _count: { select: { shots: true } } },
  });
}

/** Find sequence by ID with shots */
export async function findById(id: string) {
  return prisma.sequence.findUnique({
    where: { id },
    include: {
      shots: { orderBy: { orderIndex: "asc" } },
      project: { select: { orgId: true } },
    },
  });
}

/** Create sequence in a project */
export async function create(
  projectId: string,
  data: CreateSequenceInput,
) {
  return prisma.sequence.create({
    data: { ...data, projectId },
  });
}

/** Update sequence */
export async function update(id: string, data: UpdateSequenceInput) {
  return prisma.sequence.update({
    where: { id },
    data,
  });
}

/** Soft-delete sequence — sets deletedAt instead of removing */
export async function remove(id: string) {
  return prisma.sequence.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

/** Verify sequence belongs to a project in the given org */
export async function verifyOwnership(
  sequenceId: string,
  orgId: string,
): Promise<boolean> {
  const sequence = await prisma.sequence.findFirst({
    where: {
      id: sequenceId,
      project: { orgId },
    },
  });
  return sequence !== null;
}

/** Bulk soft-delete all sequences in a project (cascade helper) */
export async function softDeleteByProject(projectId: string) {
  return prisma.sequence.updateMany({
    where: { projectId },
    data: { deletedAt: new Date() },
  });
}
