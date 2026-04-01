import * as projectRepo from "../repositories/project.repository";
import * as seqRepo from "../repositories/sequence.repository";
import * as shotRepo from "../repositories/shot.repository";
import {
  CreateProjectInput,
  UpdateProjectInput,
} from "../schemas/project.schema";
import { PaginationQuery, toPrismaPage } from "../schemas/pagination.schema";
import { ApiError } from "../lib/utils/api-error";

/** List paginated projects for the user's org */
export async function listProjects(
  orgId: string,
  pagination: PaginationQuery,
) {
  const { skip, take } = toPrismaPage(pagination);
  const { data, total } = await projectRepo.findByOrg(orgId, skip, take);

  return {
    data,
    pagination: {
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(total / pagination.pageSize),
    },
  };
}

/** Get project by ID — verifies org membership */
export async function getProject(id: string, orgId: string) {
  const project = await projectRepo.findById(id, orgId);

  if (!project) {
    throw ApiError.notFound("Project");
  }

  return project;
}

/** Create project — orgId from JWT */
export async function createProject(
  orgId: string,
  data: CreateProjectInput,
) {
  return projectRepo.create(orgId, data);
}

/** Update project — verifies ownership */
export async function updateProject(
  id: string,
  orgId: string,
  data: UpdateProjectInput,
) {
  const project = await projectRepo.findById(id, orgId);
  if (!project) {
    throw ApiError.notFound("Project");
  }

  return projectRepo.update(id, orgId, data);
}

/** Soft-delete project + cascade to child sequences and shots */
export async function deleteProject(id: string, orgId: string) {
  const project = await projectRepo.findById(id, orgId);
  if (!project) {
    throw ApiError.notFound("Project");
  }

  // Cascade: soft-delete all shots in all sequences of this project
  for (const seq of project.sequences) {
    await shotRepo.softDeleteBySequence(seq.id);
  }

  // Cascade: soft-delete all sequences in this project
  await seqRepo.softDeleteByProject(id);

  return projectRepo.remove(id, orgId);
}
