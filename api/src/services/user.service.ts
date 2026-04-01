import * as userRepo from "../repositories/user.repository";
import { CreateUserInput, UpdateUserInput } from "../schemas/user.schema";
import { ApiError } from "../lib/utils/api-error";

/** List all users in the caller's organization */
export async function listUsers(orgId: string) {
  return userRepo.findByOrg(orgId);
}

/** Get a specific user — must belong to same org */
export async function getUser(id: string, orgId: string) {
  const user = await userRepo.findById(id, orgId);

  if (!user) {
    throw ApiError.notFound("User");
  }

  return user;
}

/** Invite a new user to the organization */
export async function createUser(
  orgId: string,
  data: CreateUserInput,
) {
  return userRepo.create(orgId, data);
}

/** Update a user's role — prevents self-demotion */
export async function updateUser(
  id: string,
  orgId: string,
  callerId: string,
  data: UpdateUserInput,
) {
  if (id === callerId) {
    throw ApiError.badRequest("Cannot change your own role");
  }

  const user = await userRepo.findById(id, orgId);
  if (!user) {
    throw ApiError.notFound("User");
  }

  return userRepo.update(id, orgId, data);
}

/** Remove user from organization — prevents self-removal */
export async function removeUser(
  id: string,
  orgId: string,
  callerId: string,
) {
  if (id === callerId) {
    throw ApiError.badRequest("Cannot remove yourself from the organization");
  }

  const user = await userRepo.findById(id, orgId);
  if (!user) {
    throw ApiError.notFound("User");
  }

  return userRepo.remove(id, orgId);
}
