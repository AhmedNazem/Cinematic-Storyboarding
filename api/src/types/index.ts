import { Request } from "express";

/** Standard API response wrapper */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/** Standard API error response */
export interface ApiErrorResponse {
  success: false;
  message: string;
  code: string;
  errors?: ValidationErrorDetail[];
}

/** Individual field validation error */
export interface ValidationErrorDetail {
  field: string;
  message: string;
}

/** Paginated response with metadata */
export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: PaginationMeta;
}

/** Pagination metadata */
export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Pagination query params */
export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}

/**
 * Authenticated request — extends Express Request with verified user info.
 * <!-- TRADEOFF: Stubbed for now; will be populated by auth middleware later -->
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    orgId: string;
    role: string;
  };
}
