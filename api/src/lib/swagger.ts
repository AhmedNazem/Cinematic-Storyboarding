/**
 * OpenAPI 3.0 Specification — AXIOM BFF API
 *
 * Mounted at GET /api/docs (Swagger UI) and GET /api/docs.json (raw spec).
 * All endpoints require Bearer JWT authentication unless noted otherwise.
 */

// ─── Shared schema fragments ────────────────────────────────────────────────

const UuidParam = {
  in: "path" as const,
  name: "id",
  required: true,
  schema: { type: "string", format: "uuid" },
};

const BearerAuth = { bearerAuth: [] };

// ─── Reusable response schemas ───────────────────────────────────────────────

const ErrorResponse = {
  type: "object",
  properties: {
    success: { type: "boolean", example: false },
    message: { type: "string" },
    code: { type: "string" },
    errors: {
      type: "array",
      items: {
        type: "object",
        properties: {
          field: { type: "string" },
          message: { type: "string" },
        },
      },
    },
  },
};

const PaginationMeta = {
  type: "object",
  properties: {
    total: { type: "integer" },
    page: { type: "integer" },
    pageSize: { type: "integer" },
    totalPages: { type: "integer" },
  },
};

// ─── Domain schemas ──────────────────────────────────────────────────────────

const Organization = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string", example: "Acme Studios" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

const User = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    email: { type: "string", format: "email", example: "alice@example.com" },
    role: { type: "string", enum: ["viewer", "editor", "admin", "owner"] },
    orgId: { type: "string", format: "uuid" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

const Project = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string", example: "The Last Frame" },
    aspectRatio: {
      type: "string",
      enum: ["2.39:1", "1.85:1", "16:9", "4:3", "1:1"],
      example: "2.39:1",
    },
    orgId: { type: "string", format: "uuid" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

const Sequence = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string", example: "Opening Act" },
    orderIndex: { type: "integer", minimum: 0, example: 0 },
    projectId: { type: "string", format: "uuid" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

const Shot = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string", example: "Wide establishing shot" },
    orderIndex: { type: "integer", minimum: 0, example: 0 },
    durationSec: { type: "number", example: 5.0, maximum: 300 },
    sceneData: {
      type: "object",
      additionalProperties: true,
      nullable: true,
      description: "Arbitrary 3D scene JSON blob",
    },
    sequenceId: { type: "string", format: "uuid" },
    thumbnailUrl: { type: "string", format: "uri", nullable: true },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

// ─── Pagination query params ─────────────────────────────────────────────────

const PaginationParams = [
  {
    in: "query",
    name: "page",
    schema: { type: "integer", minimum: 1, default: 1 },
    description: "Page number (1-indexed)",
  },
  {
    in: "query",
    name: "pageSize",
    schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
    description: "Items per page",
  },
];

// ─── Response helpers ────────────────────────────────────────────────────────

function ok(schema: object, description = "Success") {
  return {
    [200]: {
      description,
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean", example: true },
              data: schema,
            },
          },
        },
      },
    },
  };
}

function okList(schema: object, description = "Success") {
  return {
    [200]: {
      description,
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean", example: true },
              data: { type: "array", items: schema },
              pagination: PaginationMeta,
            },
          },
        },
      },
    },
  };
}

const err = {
  400: { description: "Validation error", content: { "application/json": { schema: ErrorResponse } } },
  401: { description: "Missing or invalid JWT", content: { "application/json": { schema: ErrorResponse } } },
  403: { description: "Insufficient role or MFA required", content: { "application/json": { schema: ErrorResponse } } },
  404: { description: "Resource not found", content: { "application/json": { schema: ErrorResponse } } },
};

// ─── Spec ────────────────────────────────────────────────────────────────────

export const swaggerSpec = {
  openapi: "3.0.3",
  info: {
    title: "AXIOM BFF API",
    version: "1.0.0",
    description: `
## Authentication flow
1. **Register** — \`POST /api/auth/register\` (first user) or **Login** — \`POST /api/auth/login\`
2. Both return an **access token** (15 min) in the JSON body — attach to every request:
\`\`\`
Authorization: Bearer <accessToken>
\`\`\`
3. When the access token expires, call **\`POST /api/auth/refresh\`** — the httpOnly cookie is sent automatically by the browser. Returns a new access token + rotates the cookie.
4. **Logout** — \`POST /api/auth/logout\` revokes the cookie.

## RBAC Roles
Roles are hierarchical — each level inherits permissions from all lower levels.

| Role    | Level | Capabilities |
|---------|-------|--------------|
| viewer  | 0     | Read-only access |
| editor  | 1     | Create & update projects, sequences, shots, assets |
| admin   | 2     | Delete resources, manage users (requires MFA) |
| owner   | 3     | Full access including org settings |

## MFA
Sensitive write/delete operations (marked with 🔐) require a valid TOTP token in the \`X-MFA-Token\` header.

## Error Format
All errors follow a consistent shape:
\`\`\`json
{ "success": false, "message": "...", "code": "...", "errors": [{ "field": "...", "message": "..." }] }
\`\`\`
    `.trim(),
  },
  servers: [
    { url: "/api", description: "Current server" },
    { url: "http://localhost:3001/api", description: "Local development" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT issued by POST /dev/token (dev) or your auth flow",
      },
    },
    schemas: {
      Organization,
      User,
      Project,
      Sequence,
      Shot,
      ErrorResponse,
      PaginationMeta,
    },
  },
  security: [BearerAuth],
  tags: [
    { name: "Auth", description: "Authentication — register, login, token refresh, logout, password reset, and MFA enrollment" },
    { name: "Organizations", description: "Manage the authenticated user's organization" },
    { name: "Users", description: "Invite and manage members within the org" },
    { name: "Projects", description: "Cinematic projects container" },
    { name: "Sequences", description: "Ordered scenes within a project" },
    { name: "Shots", description: "Individual shots within a sequence" },
    { name: "Assets", description: "File upload (R2 presigned URLs) and signed read URLs" },
  ],
  paths: {

    // ── Auth ─────────────────────────────────────────────────────────────────

    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register — create org + owner account",
        description: "Creates a new organization and its first **owner** user. Returns a short-lived access token in the body and sets an httpOnly refresh token cookie.",
        operationId: "register",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["orgName", "email", "password"],
                properties: {
                  orgName: { type: "string", minLength: 1, maxLength: 100, example: "Acme Studios" },
                  email: { type: "string", format: "email", example: "alice@example.com" },
                  password: { type: "string", minLength: 8, maxLength: 128, example: "super-secret-123" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Registered. `refresh_token` httpOnly cookie is set automatically.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: { accessToken: { type: "string", description: "JWT — 15 min TTL" } },
                    },
                  },
                },
              },
            },
          },
          400: { description: "Validation error", content: { "application/json": { schema: ErrorResponse } } },
          409: { description: "Email already in use", content: { "application/json": { schema: ErrorResponse } } },
        },
      },
    },

    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login — email + password",
        description: "Returns a short-lived access token in the body and rotates the httpOnly refresh token cookie.",
        operationId: "login",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email", example: "alice@example.com" },
                  password: { type: "string", example: "super-secret-123" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Authenticated. `refresh_token` httpOnly cookie is set automatically.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: { accessToken: { type: "string", description: "JWT — 15 min TTL" } },
                    },
                  },
                },
              },
            },
          },
          400: { description: "Validation error", content: { "application/json": { schema: ErrorResponse } } },
          401: { description: "Wrong email or password", content: { "application/json": { schema: ErrorResponse } } },
        },
      },
    },

    "/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Refresh — get a new access token",
        description: "Reads the `refresh_token` httpOnly cookie, validates it, revokes it (one-time use), and issues a fresh access token + new refresh token cookie. **No request body needed.**",
        operationId: "refresh",
        security: [],
        responses: {
          200: {
            description: "New access token issued. New `refresh_token` cookie is set.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: { accessToken: { type: "string", description: "JWT — 15 min TTL" } },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Missing, expired, or already-used refresh token", content: { "application/json": { schema: ErrorResponse } } },
        },
      },
    },

    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout — revoke refresh token",
        description: "Revokes the `refresh_token` cookie and clears it. The access token expires naturally after 15 min — discard it on the client.",
        operationId: "logout",
        security: [],
        responses: {
          200: {
            description: "Logged out",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Logged out" },
                  },
                },
              },
            },
          },
        },
      },
    },

    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Me — verify token and return current user",
        description: "Returns the authenticated user's `id`, `orgId`, and `role`. Use this to confirm a token is valid and to hydrate the frontend session.",
        operationId: "me",
        security: [BearerAuth],
        responses: {
          200: {
            description: "Current user",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        id: { type: "string", format: "uuid" },
                        orgId: { type: "string", format: "uuid" },
                        role: { type: "string", enum: ["viewer", "editor", "admin", "owner"] },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Invalid or expired access token", content: { "application/json": { schema: ErrorResponse } } },
        },
      },
    },

    "/auth/profile": {
      get: {
        tags: ["Auth"],
        summary: "Profile — full user info from DB",
        description: "Returns the authenticated user's complete profile including email, role, MFA status, and their organization. Safe fields only — no password hash or secrets.",
        operationId: "profile",
        security: [BearerAuth],
        responses: {
          200: {
            description: "User profile",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        id: { type: "string", format: "uuid" },
                        email: { type: "string", format: "email", example: "alice@example.com" },
                        role: { type: "string", enum: ["viewer", "editor", "admin", "owner"] },
                        mfaEnabled: { type: "boolean", example: false },
                        createdAt: { type: "string", format: "date-time" },
                        updatedAt: { type: "string", format: "date-time" },
                        organization: {
                          type: "object",
                          properties: {
                            id: { type: "string", format: "uuid" },
                            name: { type: "string", example: "Acme Studios" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Invalid or expired access token", content: { "application/json": { schema: ErrorResponse } } },
        },
      },
    },

    "/auth/set-password": {
      post: {
        tags: ["Auth"],
        summary: "Set password — for invited users",
        description: "Invited users are created without a password. Call this once to set their initial password before they can log in. Fails if a password is already set.",
        operationId: "setPassword",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email", example: "bob@example.com" },
                  password: { type: "string", minLength: 8, maxLength: 128, example: "my-new-password" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Password set — user can now log in" },
          400: { description: "Validation error", content: { "application/json": { schema: ErrorResponse } } },
          404: { description: "User not found", content: { "application/json": { schema: ErrorResponse } } },
          409: { description: "Password already set", content: { "application/json": { schema: ErrorResponse } } },
        },
      },
    },

    "/auth/forgot-password": {
      post: {
        tags: ["Auth"],
        summary: "Forgot password — send reset email",
        description: "Sends a password reset link to the given email address. **Always returns 200** regardless of whether the email exists (anti-enumeration). The reset token is valid for **1 hour** and can only be used once.",
        operationId: "forgotPassword",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: { type: "string", format: "email", example: "alice@example.com" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Reset email dispatched (or silently skipped if address not found)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "If that email exists, a reset link has been sent" },
                  },
                },
              },
            },
          },
          400: { description: "Validation error", content: { "application/json": { schema: ErrorResponse } } },
        },
      },
    },

    "/auth/reset-password": {
      post: {
        tags: ["Auth"],
        summary: "Reset password — complete reset with token",
        description: "Consumes the single-use token from the reset email and sets a new password. The token expires after **1 hour**.",
        operationId: "resetPassword",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token", "password"],
                properties: {
                  token: { type: "string", description: "Raw reset token from the email link", example: "abc123..." },
                  password: { type: "string", minLength: 8, maxLength: 128, example: "my-new-secure-password" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Password updated — user can now log in" },
          400: {
            description: "Validation error, token expired, or token already used",
            content: { "application/json": { schema: ErrorResponse } },
          },
          404: { description: "Token not found", content: { "application/json": { schema: ErrorResponse } } },
        },
      },
    },

    "/auth/mfa/setup": {
      post: {
        tags: ["Auth"],
        summary: "MFA setup — generate TOTP secret and QR code",
        description: "Generates a new TOTP secret and stores it on the user's account (MFA is **not** enabled yet). Returns a QR code data URL to scan with an authenticator app and the raw `otpauthUri` for manual entry. Call `POST /auth/mfa/enable` with a valid code to activate.",
        operationId: "mfaSetup",
        security: [BearerAuth],
        responses: {
          200: {
            description: "TOTP secret generated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        secret: { type: "string", description: "Base32-encoded TOTP secret (for manual entry)", example: "JBSWY3DPEHPK3PXP" },
                        otpauthUri: { type: "string", description: "otpauth:// URI (encode as QR code)", example: "otpauth://totp/Axiom:alice%40example.com?secret=..." },
                        qrCodeDataUrl: { type: "string", description: "data:image/png;base64,... — render directly as <img> src" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Invalid or expired access token", content: { "application/json": { schema: ErrorResponse } } },
        },
      },
    },

    "/auth/mfa/enable": {
      post: {
        tags: ["Auth"],
        summary: "MFA enable — verify TOTP and activate MFA",
        description: "Verifies the 6-digit TOTP code from the authenticator app and permanently enables MFA on the account. Must call `POST /auth/mfa/setup` first.",
        operationId: "mfaEnable",
        security: [BearerAuth],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token"],
                properties: {
                  token: { type: "string", minLength: 6, maxLength: 6, pattern: "^\\d{6}$", example: "123456" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "MFA enabled" },
          400: {
            description: "Invalid TOTP code or MFA not set up yet",
            content: { "application/json": { schema: ErrorResponse } },
          },
          401: { description: "Invalid or expired access token", content: { "application/json": { schema: ErrorResponse } } },
        },
      },
    },

    "/auth/mfa": {
      delete: {
        tags: ["Auth"],
        summary: "MFA disable — deactivate MFA with valid TOTP code",
        description: "Verifies the 6-digit TOTP code and clears the TOTP secret, disabling MFA on the account.",
        operationId: "mfaDisable",
        security: [BearerAuth],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token"],
                properties: {
                  token: { type: "string", minLength: 6, maxLength: 6, pattern: "^\\d{6}$", example: "123456" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "MFA disabled" },
          400: {
            description: "Invalid TOTP code or MFA not currently enabled",
            content: { "application/json": { schema: ErrorResponse } },
          },
          401: { description: "Invalid or expired access token", content: { "application/json": { schema: ErrorResponse } } },
        },
      },
    },

    // ── Organizations ────────────────────────────────────────────────────────

    "/organizations": {
      get: {
        tags: ["Organizations"],
        summary: "Get own organization",
        operationId: "getOrganization",
        security: [BearerAuth],
        responses: { ...ok(Organization, "Organization details"), ...err },
      },
      put: {
        tags: ["Organizations"],
        summary: "Update organization 🔐",
        description: "Requires **admin** role and a valid MFA token (`X-MFA-Token` header).",
        operationId: "updateOrganization",
        security: [BearerAuth],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", minLength: 1, maxLength: 100, example: "Acme Studios" },
                },
              },
            },
          },
        },
        responses: { ...ok(Organization, "Updated organization"), ...err },
      },
    },

    // ── Users ────────────────────────────────────────────────────────────────

    "/users": {
      get: {
        tags: ["Users"],
        summary: "List org members",
        operationId: "listUsers",
        security: [BearerAuth],
        responses: { ...okList(User, "List of org members"), ...err },
      },
      post: {
        tags: ["Users"],
        summary: "Invite a user 🔐",
        description: "Requires **admin** role and MFA. Creates a new user in the org.",
        operationId: "createUser",
        security: [BearerAuth],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: { type: "string", format: "email", example: "bob@example.com" },
                  role: {
                    type: "string",
                    enum: ["viewer", "editor", "admin", "owner"],
                    default: "viewer",
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "User created",
            content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, data: User } } } },
          },
          ...err,
        },
      },
    },

    "/users/{id}": {
      parameters: [UuidParam],
      get: {
        tags: ["Users"],
        summary: "Get a user",
        operationId: "getUser",
        security: [BearerAuth],
        responses: { ...ok(User, "User details"), ...err },
      },
      put: {
        tags: ["Users"],
        summary: "Update user role 🔐",
        description: "Requires **admin** role and MFA.",
        operationId: "updateUser",
        security: [BearerAuth],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["role"],
                properties: {
                  role: { type: "string", enum: ["viewer", "editor", "admin", "owner"] },
                },
              },
            },
          },
        },
        responses: { ...ok(User, "Updated user"), ...err },
      },
      delete: {
        tags: ["Users"],
        summary: "Remove a user 🔐",
        description: "Requires **admin** role and MFA.",
        operationId: "deleteUser",
        security: [BearerAuth],
        responses: {
          200: { description: "User removed" },
          ...err,
        },
      },
    },

    // ── Projects ─────────────────────────────────────────────────────────────

    "/projects": {
      get: {
        tags: ["Projects"],
        summary: "List projects (paginated)",
        operationId: "listProjects",
        security: [BearerAuth],
        parameters: PaginationParams,
        responses: { ...okList(Project, "Paginated list of projects"), ...err },
      },
      post: {
        tags: ["Projects"],
        summary: "Create a project",
        description: "Requires **editor** role or above.",
        operationId: "createProject",
        security: [BearerAuth],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", minLength: 1, maxLength: 150, example: "The Last Frame" },
                  aspectRatio: {
                    type: "string",
                    enum: ["2.39:1", "1.85:1", "16:9", "4:3", "1:1"],
                    default: "2.39:1",
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Project created",
            content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, data: Project } } } },
          },
          ...err,
        },
      },
    },

    "/projects/{id}": {
      parameters: [UuidParam],
      get: {
        tags: ["Projects"],
        summary: "Get a project with its sequences",
        operationId: "getProject",
        security: [BearerAuth],
        responses: {
          ...ok(
            {
              allOf: [
                Project,
                {
                  type: "object",
                  properties: {
                    sequences: { type: "array", items: Sequence },
                  },
                },
              ],
            },
            "Project with sequences",
          ),
          ...err,
        },
      },
      put: {
        tags: ["Projects"],
        summary: "Update a project",
        description: "Requires **editor** role or above.",
        operationId: "updateProject",
        security: [BearerAuth],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", minLength: 1, maxLength: 150, example: "The Last Frame" },
                  aspectRatio: { type: "string", enum: ["2.39:1", "1.85:1", "16:9", "4:3", "1:1"] },
                },
              },
            },
          },
        },
        responses: { ...ok(Project, "Updated project"), ...err },
      },
      delete: {
        tags: ["Projects"],
        summary: "Delete a project 🔐",
        description: "Requires **admin** role and MFA. Cascades to sequences and shots.",
        operationId: "deleteProject",
        security: [BearerAuth],
        responses: {
          200: { description: "Project deleted" },
          ...err,
        },
      },
    },

    // ── Sequences ────────────────────────────────────────────────────────────

    "/projects/{projectId}/sequences": {
      parameters: [
        {
          in: "path",
          name: "projectId",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      get: {
        tags: ["Sequences"],
        summary: "List sequences in a project",
        operationId: "listSequences",
        security: [BearerAuth],
        responses: { ...okList(Sequence, "Sequences ordered by orderIndex"), ...err },
      },
      post: {
        tags: ["Sequences"],
        summary: "Create a sequence",
        description: "Requires **editor** role or above.",
        operationId: "createSequence",
        security: [BearerAuth],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", minLength: 1, maxLength: 150, example: "Opening Act" },
                  orderIndex: { type: "integer", minimum: 0, default: 0 },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Sequence created",
            content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, data: Sequence } } } },
          },
          ...err,
        },
      },
    },

    "/sequences/{id}": {
      parameters: [UuidParam],
      get: {
        tags: ["Sequences"],
        summary: "Get a sequence with its shots",
        operationId: "getSequence",
        security: [BearerAuth],
        responses: {
          ...ok(
            {
              allOf: [
                Sequence,
                { type: "object", properties: { shots: { type: "array", items: Shot } } },
              ],
            },
            "Sequence with shots",
          ),
          ...err,
        },
      },
      put: {
        tags: ["Sequences"],
        summary: "Update a sequence",
        description: "Requires **editor** role or above.",
        operationId: "updateSequence",
        security: [BearerAuth],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", minLength: 1, maxLength: 150 },
                  orderIndex: { type: "integer", minimum: 0 },
                },
              },
            },
          },
        },
        responses: { ...ok(Sequence, "Updated sequence"), ...err },
      },
      delete: {
        tags: ["Sequences"],
        summary: "Delete a sequence 🔐",
        description: "Requires **admin** role and MFA. Cascades to shots.",
        operationId: "deleteSequence",
        security: [BearerAuth],
        responses: {
          200: { description: "Sequence deleted" },
          ...err,
        },
      },
    },

    // ── Shots ────────────────────────────────────────────────────────────────

    "/sequences/{sequenceId}/shots": {
      parameters: [
        {
          in: "path",
          name: "sequenceId",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      get: {
        tags: ["Shots"],
        summary: "List shots in a sequence",
        operationId: "listShots",
        security: [BearerAuth],
        responses: { ...okList(Shot, "Shots ordered by orderIndex"), ...err },
      },
      post: {
        tags: ["Shots"],
        summary: "Create a shot",
        description: "Requires **editor** role or above.",
        operationId: "createShot",
        security: [BearerAuth],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", minLength: 1, maxLength: 150, example: "Wide establishing shot" },
                  orderIndex: { type: "integer", minimum: 0, default: 0 },
                  durationSec: { type: "number", minimum: 0, maximum: 300, default: 5.0, example: 5.0 },
                  sceneData: {
                    type: "object",
                    additionalProperties: true,
                    nullable: true,
                    description: "Arbitrary 3D scene JSON",
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Shot created",
            content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, data: Shot } } } },
          },
          ...err,
        },
      },
    },

    "/shots/{id}": {
      parameters: [UuidParam],
      get: {
        tags: ["Shots"],
        summary: "Get a shot",
        operationId: "getShot",
        security: [BearerAuth],
        responses: { ...ok(Shot, "Shot details"), ...err },
      },
      put: {
        tags: ["Shots"],
        summary: "Update a shot",
        description: "Requires **editor** role or above.",
        operationId: "updateShot",
        security: [BearerAuth],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", minLength: 1, maxLength: 150 },
                  orderIndex: { type: "integer", minimum: 0 },
                  durationSec: { type: "number", minimum: 0, maximum: 300 },
                  sceneData: { type: "object", additionalProperties: true, nullable: true },
                },
              },
            },
          },
        },
        responses: { ...ok(Shot, "Updated shot"), ...err },
      },
      delete: {
        tags: ["Shots"],
        summary: "Delete a shot 🔐",
        description: "Requires **admin** role and MFA.",
        operationId: "deleteShot",
        security: [BearerAuth],
        responses: {
          200: { description: "Shot deleted" },
          ...err,
        },
      },
    },

    // ── Assets ───────────────────────────────────────────────────────────────

    "/assets/presign": {
      post: {
        tags: ["Assets"],
        summary: "Request a presigned R2 upload URL",
        description: "Requires **editor** role. Returns a time-limited PUT URL for uploading a file directly to R2/S3. The client must PUT the file to the returned URL.",
        operationId: "presignUpload",
        security: [BearerAuth],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["projectId", "assetType", "fileName", "mimeType", "fileSize"],
                properties: {
                  projectId: { type: "string", format: "uuid" },
                  assetType: {
                    type: "string",
                    enum: ["model", "texture", "thumbnail", "video", "audio"],
                    description: "Asset category — determines the S3 path prefix",
                  },
                  fileName: {
                    type: "string",
                    minLength: 1,
                    maxLength: 255,
                    pattern: "^[\\w\\-. ]+$",
                    example: "hero_model.glb",
                    description: "Original filename (display only, not stored in key)",
                  },
                  mimeType: {
                    type: "string",
                    example: "model/gltf-binary",
                    description: "Declared MIME type — must be in the server allowlist",
                  },
                  fileSize: {
                    type: "integer",
                    minimum: 1,
                    maximum: 500000000,
                    description: "File size in bytes — capped at 500 MB",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Presigned upload URL",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        uploadUrl: { type: "string", format: "uri", description: "S3 presigned PUT URL" },
                        assetKey: { type: "string", description: "R2 object key — store this to later read the asset" },
                        expiresAt: { type: "string", format: "date-time" },
                        method: { type: "string", example: "PUT" },
                      },
                    },
                  },
                },
              },
            },
          },
          ...err,
        },
      },
    },

    "/assets/url": {
      get: {
        tags: ["Assets"],
        summary: "Get a signed read URL for an asset",
        description: "Returns a time-limited CloudFront signed URL. The service verifies the key belongs to the requesting org.",
        operationId: "getAssetUrl",
        security: [BearerAuth],
        parameters: [
          {
            in: "query",
            name: "key",
            required: true,
            schema: { type: "string" },
            description: "R2 object key returned by POST /assets/presign",
          },
        ],
        responses: {
          200: {
            description: "Signed read URL",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        readUrl: { type: "string", format: "uri" },
                        expiresAt: { type: "string", format: "date-time" },
                      },
                    },
                  },
                },
              },
            },
          },
          ...err,
        },
      },
    },

    "/assets/gltf": {
      get: {
        tags: ["Assets"],
        summary: "Fetch and serve a sanitized .gltf file",
        description: "Fetches a `.gltf` file from R2, strips untrusted `extras` fields, and serves it inline. Binary `.glb` files must use `/assets/url` instead.",
        operationId: "serveGltf",
        security: [BearerAuth],
        parameters: [
          {
            in: "query",
            name: "key",
            required: true,
            schema: { type: "string" },
            description: "R2 object key for the .gltf file",
          },
        ],
        responses: {
          200: {
            description: "Sanitized GLTF JSON",
            content: {
              "model/gltf+json": {
                schema: { type: "object", additionalProperties: true },
              },
            },
          },
          ...err,
        },
      },
    },
  },
};
