import { z } from "zod";

/** Shared pagination query schema — reused across all list endpoints */
export const paginationQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default("1")
    .transform(Number)
    .pipe(z.number().int().min(1)),
  pageSize: z
    .string()
    .optional()
    .default("20")
    .transform(Number)
    .pipe(z.number().int().min(1).max(100)),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/** Helper to calculate skip/take from pagination params */
export function toPrismaPage(query: PaginationQuery): {
  skip: number;
  take: number;
} {
  return {
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
  };
}
