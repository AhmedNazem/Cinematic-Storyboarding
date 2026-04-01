import { z } from "zod";
import { ROLES } from "../lib/auth/constants";

export const createUserSchema = z
  .object({
    email: z.string().email(),
    role: z.enum(ROLES).optional().default("viewer"),
  })
  .strict();

export const updateUserSchema = z
  .object({
    role: z.enum(ROLES),
  })
  .strict();

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
