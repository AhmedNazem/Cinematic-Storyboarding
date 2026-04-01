import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";

/**
 * Zod validation middleware factory.
 * Validates request body, params, and/or query against provided schemas.
 * Rejects with 400 + structured error details on validation failure.
 *
 * Usage:
 *   router.post("/", validate({ body: createOrgSchema }), controller.create);
 */
export function validate(schemas: {
  body?: AnyZodObject;
  params?: AnyZodObject;
  query?: AnyZodObject;
}) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.params) {
        req.params = (await schemas.params.parseAsync(
          req.params,
        )) as typeof req.params;
      }
      if (schemas.query) {
        req.query = (await schemas.query.parseAsync(
          req.query,
        )) as typeof req.query;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }));

        res.status(400).json({
          success: false,
          message: "Validation failed",
          code: "VALIDATION_ERROR",
          errors,
        });
        return;
      }

      next(error);
    }
  };
}
