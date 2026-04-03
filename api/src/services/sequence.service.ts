import * as seqRepo from "../repositories/sequence.repository";
import * as shotRepo from "../repositories/shot.repository";
import * as projectRepo from "../repositories/project.repository";
import {
  CreateSequenceInput,
  UpdateSequenceInput,
} from "../schemas/sequence.schema";
import { ApiError } from "../lib/utils/api-error";

/** List sequences in a project — verifies project belongs to org */
export async function listSequences(projectId: string, orgId: string) {
  const project = await projectRepo.findById(projectId, orgId);
  if (!project) {
    throw ApiError.notFound("Project");
  }

  return seqRepo.findByProject(projectId);
}

/** Get sequence by ID — verifies org ownership chain */
export async function getSequence(id: string, orgId: string) {
  const sequence = await seqRepo.findById(id);
  if (!sequence || sequence.project.orgId !== orgId) {
    throw ApiError.notFound("Sequence");
  }

  return sequence;
}

/** Create sequence — verifies project belongs to org */
export async function createSequence(
  projectId: string,
  orgId: string,
  data: CreateSequenceInput,
) {
  const project = await projectRepo.findById(projectId, orgId);
  if (!project) {
    throw ApiError.notFound("Project");
  }

  return seqRepo.create(projectId, data);
}

/** Update sequence — verifies ownership */
export async function updateSequence(
  id: string,
  orgId: string,
  data: UpdateSequenceInput,
) {
  const owned = await seqRepo.verifyOwnership(id, orgId);
  if (!owned) {
    throw ApiError.notFound("Sequence");
  }

  return seqRepo.update(id, data);
}

/** Delete sequence — verifies ownership, cascades soft-delete to shots */
export async function deleteSequence(id: string, orgId: string) {
  const owned = await seqRepo.verifyOwnership(id, orgId);
  if (!owned) {
    throw ApiError.notFound("Sequence");
  }

  await shotRepo.softDeleteBySequence(id);
  return seqRepo.remove(id);
}
