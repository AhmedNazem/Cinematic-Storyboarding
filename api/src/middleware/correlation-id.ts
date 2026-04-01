import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

const HEADER_NAME = "X-Correlation-ID";

/**
 * Correlation ID middleware.
 * Reads existing `X-Correlation-ID` from incoming request or generates one.
 * Attaches to `req.correlationId` and echoes back on the response header.
 *
 * Per AXIOM: structured logging with correlation_id on every request.
 */
export function correlationId(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const id =
    (req.headers[HEADER_NAME.toLowerCase()] as string) || randomUUID();

  (req as Request & { correlationId: string }).correlationId = id;
  res.setHeader(HEADER_NAME, id);

  next();
}
