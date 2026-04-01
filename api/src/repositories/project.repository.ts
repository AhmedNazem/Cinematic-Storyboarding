import { prisma } from "../lib/db/client";
import {
  CreateProjectInput,
  UpdateProjectInput,
} from "../schemas/project.schema";

/** Find paginated projects for an organization */
export async function findByOrg(
  orgId: string,
  skip: number,
  take: number,
) {
  const [data, total] = await Promise.all([
    prisma.project.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: { _count: { select: { sequences: true } } },
    }),
    prisma.project.count({ where: { orgId } }),
  ]);

  return { data, total };
}

/** Find project by ID — scoped to org */
export async function findById(id: string, orgId: string) {
  return prisma.project.findFirst({
    where: { id, orgId },
    include: {
      sequences: {
        orderBy: { orderIndex: "asc" },
        include: { _count: { select: { shots: true } } },
      },
    },
  });
}

/** Create project in org */
export async function create(orgId: string, data: CreateProjectInput) {
  return prisma.project.create({
    data: { ...data, orgId },
  });
}

/** Update project */
export async function update(
  id: string,
  orgId: string,
  data: UpdateProjectInput,
) {
  return prisma.project.update({
    where: { id, orgId },
    data,
  });
}

/** Delete project */
export async function remove(id: string, orgId: string) {
  return prisma.project.delete({
    where: { id, orgId },
  });
}
