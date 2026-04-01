import * as projectRepo from "../repositories/project.repository";
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

/** Delete project — verifies ownership */
export async function deleteProject(id: string, orgId: string) {
  const project = await projectRepo.findById(id, orgId);
  if (!project) {
    throw ApiError.notFound("Project");
  }

  return projectRepo.remove(id, orgId);
}
