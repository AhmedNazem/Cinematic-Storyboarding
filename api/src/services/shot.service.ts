import * as shotRepo from "../repositories/shot.repository";
import * as seqRepo from "../repositories/sequence.repository";
import { CreateShotInput, UpdateShotInput } from "../schemas/shot.schema";
import { ApiError } from "../lib/utils/api-error";

/** List shots in a sequence — verifies ownership chain */
export async function listShots(sequenceId: string, orgId: string) {
  const owned = await seqRepo.verifyOwnership(sequenceId, orgId);
  if (!owned) {
    throw ApiError.notFound("Sequence");
  }

  return shotRepo.findBySequence(sequenceId);
}

/** Get shot by ID — verifies org ownership chain */
export async function getShot(id: string, orgId: string) {
  const shot = await shotRepo.findById(id);
  if (!shot || shot.sequence.project.orgId !== orgId) {
    throw ApiError.notFound("Shot");
  }

  return shot;
}

/** Create shot — verifies sequence belongs to org */
export async function createShot(
  sequenceId: string,
  orgId: string,
  data: CreateShotInput,
) {
  const owned = await seqRepo.verifyOwnership(sequenceId, orgId);
  if (!owned) {
    throw ApiError.notFound("Sequence");
  }

  return shotRepo.create(sequenceId, data);
}

/** Update shot — verifies ownership */
export async function updateShot(
  id: string,
  orgId: string,
  data: UpdateShotInput,
) {
  const owned = await shotRepo.verifyOwnership(id, orgId);
  if (!owned) {
    throw ApiError.notFound("Shot");
  }

  return shotRepo.update(id, data);
}

/** Delete shot — verifies ownership */
export async function deleteShot(id: string, orgId: string) {
  const owned = await shotRepo.verifyOwnership(id, orgId);
  if (!owned) {
    throw ApiError.notFound("Shot");
  }

  return shotRepo.remove(id);
}
