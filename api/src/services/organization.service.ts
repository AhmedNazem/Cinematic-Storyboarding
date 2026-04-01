import * as orgRepo from "../repositories/organization.repository";
import { UpdateOrganizationInput } from "../schemas/organization.schema";
import { ApiError } from "../lib/utils/api-error";

/** Get the authenticated user's organization */
export async function getOrganization(orgId: string) {
  const org = await orgRepo.findById(orgId);

  if (!org) {
    throw ApiError.notFound("Organization");
  }

  return org;
}

/** Update organization — orgId from JWT ensures tenant isolation */
export async function updateOrganization(
  orgId: string,
  data: UpdateOrganizationInput,
) {
  const org = await orgRepo.findById(orgId);

  if (!org) {
    throw ApiError.notFound("Organization");
  }

  return orgRepo.update(orgId, data);
}
