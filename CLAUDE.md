# AXIOM — Project Context for Claude Code

> Cinematic Storyboarding SaaS · Next.js (web/) + Express (api/)  
> Backend is **100% complete**. Frontend work starts from Phase 2 in TODO.md.

---

## Stack (actual — overrides persona.md where they conflict)

| Layer | Choice |
|---|---|
| Frontend | Next.js App Router (`web/`) |
| Backend | Express.js (`api/`) — port 3001 |
| Database | Neon PostgreSQL via **Prisma** (NOT Drizzle — persona.md is outdated) |
| Auth | Custom JWT — **NOT Auth0/NextAuth** |
| Storage | Cloudflare R2 (S3-compatible) |
| Email | Resend |
| Real-time | Socket.IO |
| ORM | Prisma with soft-delete extension |

---

## Auth Flow

1. `POST /api/auth/register` or `POST /api/auth/login` → returns `{ accessToken }` in body + sets `refresh_token` httpOnly cookie scoped to `/api/auth`
2. Attach access token to every request: `Authorization: Bearer <accessToken>` (15 min TTL)
3. When expired → `POST /api/auth/refresh` (cookie sent automatically) → new access token + rotated cookie
4. `POST /api/auth/logout` → revokes cookie

**Never store tokens in localStorage.** Access token lives in memory on the client.

---

## BFF Pattern

The browser **never calls the Express API directly**. All requests go:

```
Browser → Next.js API route (/app/api/...) → Express (localhost:3001/api/...)
```

Express URL is a server-side env var only (`NEXT_PUBLIC_*` is forbidden for it).

---

## Environment Variables needed in web/

```env
API_BASE_URL="http://localhost:3001/api"   # server-side only, no NEXT_PUBLIC_
```

---

## API Base URL

```
http://localhost:3001/api
```

All routes prefixed with `/api` in Express. Swagger UI at `http://localhost:3001/api/docs`.

---

## Response Envelope (all endpoints)

```ts
// Success
{ success: true, data: T, message?: string }

// Error
{ success: false, message: string, code: string, errors?: { field: string, message: string }[] }
```

---

## RBAC Roles (hierarchical)

| Role | Level | Notes |
|---|---|---|
| `viewer` | 0 | Read-only |
| `editor` | 1 | Create/update projects, sequences, shots, assets |
| `admin` | 2 | Delete + manage users — **requires MFA** |
| `owner` | 3 | Full access |

Role is in the JWT payload. MFA-protected routes also require `X-MFA-Token: <6-digit TOTP>` header.

---

## All API Endpoints

### Auth (no Bearer required unless noted)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/register` | — | Creates org + owner. Returns `accessToken` |
| POST | `/auth/login` | — | Returns `accessToken` |
| POST | `/auth/refresh` | cookie | Rotates refresh token |
| POST | `/auth/logout` | cookie | Clears cookie |
| GET | `/auth/me` | Bearer | Returns JWT payload |
| GET | `/auth/profile` | Bearer | Full DB profile incl. org |
| POST | `/auth/set-password` | — | Invited users set initial password |
| POST | `/auth/forgot-password` | — | Sends reset email (always 200) |
| POST | `/auth/reset-password` | — | Consumes single-use token, sets new password |
| POST | `/auth/mfa/setup` | Bearer | Returns `{ secret, otpauthUri, qrCodeDataUrl }` |
| POST | `/auth/mfa/enable` | Bearer | Body: `{ token: "123456" }` — activates MFA |
| DELETE | `/auth/mfa` | Bearer | Body: `{ token: "123456" }` — disables MFA |

### Users (Bearer required)
| Method | Path | Role | MFA |
|---|---|---|---|
| GET | `/users` | any | — |
| POST | `/users` | admin | ✅ |
| GET | `/users/:id` | any | — |
| PUT | `/users/:id` | admin | ✅ |
| DELETE | `/users/:id` | admin | ✅ |

### Organizations (Bearer required)
| Method | Path | Role | MFA |
|---|---|---|---|
| GET | `/organizations` | any | — |
| PUT | `/organizations` | admin | ✅ |

### Projects (Bearer required)
| Method | Path | Role | MFA |
|---|---|---|---|
| GET | `/projects` | any | — | Paginated |
| POST | `/projects` | editor+ | — |
| GET | `/projects/:id` | any | — | Includes sequences |
| PUT | `/projects/:id` | editor+ | — |
| DELETE | `/projects/:id` | admin | ✅ |

### Sequences (Bearer required)
| Method | Path | Role | MFA |
|---|---|---|---|
| GET | `/projects/:projectId/sequences` | any | — |
| POST | `/projects/:projectId/sequences` | editor+ | — |
| GET | `/sequences/:id` | any | — | Includes shots |
| PUT | `/sequences/:id` | editor+ | — |
| DELETE | `/sequences/:id` | admin | ✅ |

### Shots (Bearer required)
| Method | Path | Role | MFA |
|---|---|---|---|
| GET | `/sequences/:sequenceId/shots` | any | — |
| POST | `/sequences/:sequenceId/shots` | editor+ | — |
| GET | `/shots/:id` | any | — |
| PUT | `/shots/:id` | editor+ | — |
| DELETE | `/shots/:id` | admin | ✅ |

### Assets (Bearer required)
| Method | Path | Role | Notes |
|---|---|---|---|
| POST | `/assets/presign` | editor+ | Returns R2 presigned PUT URL |
| GET | `/assets/url?key=` | any | Returns signed read URL |
| GET | `/assets/gltf?key=` | any | Serves sanitized GLTF JSON |

---

## Prisma Models (DB tables)

```
Organization   id, name, createdAt, updatedAt
User           id, email, passwordHash, role, orgId, mfaEnabled, mfaSecret, deletedAt
RefreshToken   id, tokenHash, userId, expiresAt, revokedAt, ipAddress, userAgent
PasswordResetToken  id, tokenHash, userId, expiresAt, usedAt
AuditLog       id, action, entityType, entityId, actorId, orgId, createdAt
Project        id, name, aspectRatio, orgId, deletedAt, createdAt, updatedAt
Sequence       id, name, orderIndex, projectId, deletedAt, createdAt, updatedAt
Shot           id, name, orderIndex, durationSec, sceneData(JSON), sequenceId, thumbnailUrl, deletedAt
Asset          id, key, orgId, projectId, assetType, fileName, mimeType, fileSize, uploadedBy
```

Soft deletes: `deletedAt` is set instead of row deletion. Prisma extension filters these automatically.

---

## Key Conventions

- **File size law**: hard limit 150 lines per file, split at 120
- **No raw SQL** — Prisma only
- **Zod schemas** are the source of truth for request validation (in `api/src/schemas/`)
- **Pagination** query params: `?page=1&pageSize=20`
- **Aspect ratios**: `"2.39:1" | "1.85:1" | "16:9" | "4:3" | "1:1"`
- **Asset types**: `"model" | "texture" | "thumbnail" | "video" | "audio"`
- **Socket.IO namespaces**: `/studio`, `/collaboration`, `/notifications` — JWT auth on connect

---

## What is NOT yet built (frontend)

See `TODO.md` Phase 2+. Starting point:
- `web/` is a fresh Next.js App Router project
- No route groups exist yet
- No BFF proxy routes exist yet
- No auth UI exists yet
