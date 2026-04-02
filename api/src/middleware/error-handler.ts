import { Request, Response, NextFunction } from "express";
import { ApiError } from "../lib/utils/api-error";
import { Prisma } from "@prisma/client";
import { ApiErrorResponse } from "../types";
import { Sentry } from "../lib/sentry";

/**
 * Centralized error handler middleware.
 * Catches ApiError, Prisma errors, and unknown errors — returns structured JSON.
 * Must be registered LAST in the middleware chain.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response<ApiErrorResponse>,
  _next: NextFunction,
): void {
  // --- Known API errors (thrown intentionally) ---
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
    });
    return;
  }

  // --- Prisma known request errors (bad queries, unique violations, etc.) ---
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const prismaResponse = handlePrismaError(err);
    res.status(prismaResponse.statusCode).json({
      success: false,
      message: prismaResponse.message,
      code: prismaResponse.code,
    });
    return;
  }

  // --- Prisma validation errors (invalid data types, etc.) ---
  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({
      success: false,
      message: "Invalid data provided",
      code: "VALIDATION_ERROR",
    });
    return;
  }

  // --- Unknown / unexpected errors ---
  Sentry.captureException(err);
  console.error("[ERROR] Unhandled:", err.stack || err.message);

  res.status(500).json({
    success: false,
    message: "Internal server error",
    code: "INTERNAL_ERROR",
  });
}

/** Maps Prisma error codes to HTTP-friendly responses */
function handlePrismaError(err: Prisma.PrismaClientKnownRequestError): {
  statusCode: number;
  message: string;
  code: string;
} {
  switch (err.code) {
    case "P2002":
      return {
        statusCode: 409,
        message: "A record with this value already exists",
        code: "CONFLICT",
      };
    case "P2025":
      return {
        statusCode: 404,
        message: "Record not found",
        code: "NOT_FOUND",
      };
    case "P2003":
      return {
        statusCode: 400,
        message: "Related record not found (foreign key constraint)",
        code: "BAD_REQUEST",
      };
    default:
      return {
        statusCode: 500,
        message: "Database error",
        code: "DATABASE_ERROR",
      };
  }
}
