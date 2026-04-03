import { PrismaClient, Prisma } from "@prisma/client";

/**
 * Prisma Client Extension for soft deletes — Prisma 7 $extends API.
 *
 * Behaviour:
 * - Read queries (findMany, findFirst, findUnique, count) auto-filter `deletedAt: null`
 * - delete/deleteMany are NOT intercepted here (handled at service layer for cascading)
 *
 * <!-- TRADEOFF: Cascading soft-delete is business logic, belongs in service layer.
 *      The extension only handles automatic read filtering. Services call
 *      softDeleteCascade helpers for delete operations. -->
 *
 * Per AXIOM: "Soft deletes only — no hard deletes on user content"
 */

export function withSoftDeleteFilter(client: PrismaClient) {
  return client.$extends({
    query: {
      $allModels: {
        async findMany({ args, query }) {
          (args as any).where = { ...args.where, deletedAt: (args.where as any)?.deletedAt ?? null };
          return query(args);
        },

        async findFirst({ args, query }) {
          (args as any).where = { ...args.where, deletedAt: (args.where as any)?.deletedAt ?? null };
          return query(args);
        },

        async findFirstOrThrow({ args, query }) {
          (args as any).where = { ...args.where, deletedAt: (args.where as any)?.deletedAt ?? null };
          return query(args);
        },

        async findUnique({ args, query, model }: any) {
          // findUnique where clause is strict; redirect to base client findFirst to allow deletedAt filter
          const modelKey = (model as string).charAt(0).toLowerCase() + (model as string).slice(1);
          return (client as any)[modelKey].findFirst({
            ...args,
            where: { ...args.where, deletedAt: (args.where as any)?.deletedAt ?? null },
          });
        },

        async findUniqueOrThrow({ args, query, model }: any) {
          const modelKey = (model as string).charAt(0).toLowerCase() + (model as string).slice(1);
          return (client as any)[modelKey].findFirstOrThrow({
            ...args,
            where: { ...args.where, deletedAt: (args.where as any)?.deletedAt ?? null },
          });
        },

        async count({ args, query }) {
          const countArgs = (args || {}) as any;
          countArgs.where = { ...countArgs.where, deletedAt: countArgs.where?.deletedAt ?? null };
          return query(countArgs);
        },
      },
    },
  });
}
