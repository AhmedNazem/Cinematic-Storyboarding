/**
 * Custom API error class with HTTP status code and error code.
 * Thrown in services/controllers, caught by error-handler middleware.
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(statusCode: number, message: string, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  /** 400 — Bad Request */
  static badRequest(message = "Bad request"): ApiError {
    return new ApiError(400, message, "BAD_REQUEST");
  }

  /** 401 — Unauthorized */
  static unauthorized(message = "Unauthorized"): ApiError {
    return new ApiError(401, message, "UNAUTHORIZED");
  }

  /** 403 — Forbidden */
  static forbidden(message = "Forbidden"): ApiError {
    return new ApiError(403, message, "FORBIDDEN");
  }

  /** 404 — Not Found */
  static notFound(resource = "Resource"): ApiError {
    return new ApiError(404, `${resource} not found`, "NOT_FOUND");
  }

  /** 409 — Conflict */
  static conflict(message = "Resource already exists"): ApiError {
    return new ApiError(409, message, "CONFLICT");
  }

  /** 422 — Unprocessable Entity */
  static unprocessable(message = "Unprocessable entity"): ApiError {
    return new ApiError(422, message, "UNPROCESSABLE_ENTITY");
  }

  /** 429 — Too Many Requests */
  static tooManyRequests(message = "Too many requests"): ApiError {
    return new ApiError(429, message, "TOO_MANY_REQUESTS");
  }

  /** 500 — Internal Server Error */
  static internal(message = "Internal server error"): ApiError {
    return new ApiError(500, message, "INTERNAL_ERROR");
  }
}
