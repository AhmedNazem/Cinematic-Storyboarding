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

        async findUnique({ args, query }) {
          // findUnique where clause is strict; transform to findFirst to allow deletedAt filter
          // Use client[model] to access the specialized findFirst method
          return (client as any)[(query as any).model].findFirst({
            ...args,
            where: { ...args.where, deletedAt: (args.where as any)?.deletedAt ?? null },
          });
        },

        async findUniqueOrThrow({ args, query }) {
          return (client as any)[(query as any).model].findFirstOrThrow({
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
