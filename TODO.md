# AXIOM — Cinematic Storyboarding SaaS · Task Tracker

> Stack: Next.js · Three.js · GSAP · Express · Neon (Prisma) · Socket.IO  
> Last updated: 2026-04-02

---

## Legend
- `[ ]` Pending
- `[~]` In Progress
- `[x]` Done

---

## PHASE 1 — API Hardening (Backend Completions)

### 1.1 Middleware & Request Pipeline
- [x] `helmet` + `cors` + `rateLimit` + `errorHandler` middleware
- [x] Zod validation middleware
- [x] JWT `authenticate` middleware
- [x] RBAC `authorize` middleware
- [x] Structured JSON logger (`logger.ts`)
- [x] `correlationId` middleware
- [x] **Wire `correlationId` middleware into `index.ts` pipeline** ← missing from main stack
- [x] Upgrade rate limiting from IP-based → per-user for authenticated routes
- [x] Add per-socket emit rate limiting (Socket.IO flood protection)

### 1.2 Security Gaps
- [ ] Add `Content-Security-Policy` (CSP) header (strict mode + Three.js canvas nonce)
- [ ] Add CSRF token validation for state-mutating requests
- [ ] Add HSTS header (`Strict-Transport-Security: includeSubDomains`)
- [ ] Validate request payload size per-route (not just global 10MB)
- [ ] Admin routes: require MFA verification token in addition to JWT
- [ ] Audit logging: record who changed what and when (append-only log table)

### 1.3 Socket.IO — Real-Time Foundation
- [ ] JWT verification on `connection` event — reject unauthenticated sockets
- [ ] `/studio` namespace: room join with server-side project membership check
- [ ] `/notifications` namespace: setup
- [ ] `/collaboration` namespace: setup
- [ ] Zod validation on every incoming socket event payload
- [ ] Payload size limit per socket message
- [ ] Redis adapter for horizontal scaling (presence state)
- [ ] Optimistic UI reconciliation broadcast on conflict

### 1.4 Storage — AWS S3
- [ ] Install and configure AWS SDK (`@aws-sdk/client-s3`)
- [ ] Presigned URL generation endpoint (`POST /api/assets/presign`)
- [ ] File type validation (magic bytes check, not extension)
- [ ] Max size enforcement + virus scan hook stub
- [ ] S3 key naming: `/{org_id}/{project_id}/{asset_type}/{uuid}.{ext}`
- [ ] CloudFront signed URL generation for read access
- [ ] GLTF sanitization: strip `extras` with untrusted scripts before serving

### 1.5 Observability
- [ ] Integrate `logger` into all request handlers (currently defined but unused globally)
- [ ] Sentry SDK setup (API side): source maps, PII scrubbing, performance tracing
- [ ] Prometheus metrics: WebSocket connections, render times, 3D asset load times
- [ ] Custom middleware to emit `api_request_duration_ms` histogram
- [ ] `/metrics` endpoint (Prometheus scrape target, internal network only)

### 1.6 Testing — API
- [ ] Unit tests: services (mock repositories)
- [ ] Unit tests: Zod schemas (valid + invalid inputs)
- [ ] Integration tests: all CRUD endpoints (real DB, test org isolation)
- [ ] Integration tests: RBAC enforcement (each role boundary)
- [ ] Integration tests: soft-delete cascade (project → sequences → shots)
- [ ] Test seed fixture factory (deterministic test data)

---

## PHASE 2 — Frontend Foundation (Next.js App Router)

### 2.1 Project Structure Setup
- [ ] Create route groups: `(auth)`, `(dashboard)`, `(studio)`
- [ ] Create `src/lib/api/` — BFF fetch utilities (typed wrappers around fetch)
- [ ] Create `src/lib/auth/` — server-only auth utilities
- [ ] Create `src/stores/` — Zustand stores scaffold
- [ ] Create `src/types/` — shared TypeScript types (inferred from Zod schemas)
- [ ] Create `src/hooks/` — custom hooks scaffold
- [ ] Add `cn()` utility (`clsx` + `tailwind-merge`)
- [ ] Install and configure Shadcn/UI base components
- [ ] Add design tokens to `tailwind.config.ts` (no hardcoded colors)

### 2.2 BFF Proxy Routes (`/app/api/`)
- [ ] `POST /api/auth/login` — proxy to Express, return httpOnly cookie
- [ ] `POST /api/auth/logout` — clear session cookie
- [ ] `GET  /api/auth/session` — validate session, return user info
- [ ] `GET  /api/projects` — proxy paginated project list
- [ ] `POST /api/projects` — proxy create project
- [ ] `GET  /api/projects/[id]` — proxy project detail
- [ ] `PUT  /api/projects/[id]` — proxy update
- [ ] `DELETE /api/projects/[id]` — proxy soft-delete
- [ ] `GET  /api/projects/[id]/sequences` — proxy sequences
- [ ] `GET  /api/sequences/[id]/shots` — proxy shots
- [ ] BFF never exposes Express URL to browser (server-side env var only)

### 2.3 Auth UI — `(auth)` Route Group
- [ ] Login page (`/login`) — email/password form + OAuth buttons
- [ ] Register page (`/register`) — org creation + first user setup
- [ ] OAuth callback handler (`/auth/callback`)
- [ ] NextAuth or Auth0 integration (PKCE flow)
- [ ] Short-lived JWT (15 min) + refresh token in `httpOnly` secure cookie
- [ ] `middleware.ts` — protect all non-public routes, redirect to `/login`

### 2.4 Dashboard — `(dashboard)` Route Group
- [ ] Projects list page (`/dashboard`) — SSR with ISR revalidation
- [ ] Project card component with aspect ratio preview
- [ ] Create project modal (name + aspect ratio selector)
- [ ] Organization settings page (`/settings/org`)
- [ ] Team members page (`/settings/team`) — invite, role management
- [ ] User profile page (`/settings/profile`)

---

## PHASE 3 — Studio Editor — `(studio)` Route Group

> All canvas components: `dynamic(() => import(...), { ssr: false })`

### 3.1 Studio Shell (SSR)
- [ ] Studio layout: toolbar + left panel + canvas area + right panel + timeline
- [ ] Shot strip (bottom): thumbnails for all shots in current sequence
- [ ] Sequence selector (top): breadcrumb `Project → Sequence → Shot`
- [ ] Keyboard shortcut scaffold (space = play/pause, arrow keys = prev/next shot)

### 3.2 Three.js Scene (`src/components/three/`)
- [ ] `SceneCanvas.tsx` — R3F Canvas with `<Suspense>` fallback
- [ ] `webglcontextlost` listener + graceful recovery
- [ ] `CameraRig.tsx` — standard film rigs (dolly, crane, handheld) as Three.js groups
- [ ] `LightingPreset.tsx` — golden hour, overcast, night presets
- [ ] `AspectRatioOverlay.tsx` — 2.39:1, 1.85:1, 16:9, 4:3, 1:1 canvas masks
- [ ] Asset loading: `useGLTF` + `useTexture` with Draco compression (models >1MB)
- [ ] LOD switching for large scenes
- [ ] `Stats` component from drei (fps monitor, dev only)
- [ ] `<Perf>` panel toggle in dev mode

### 3.3 GSAP Timeline Scrubber
- [ ] `useTimelineScrubber.ts` — hook wrapping `gsap.globalTimeline`
- [ ] Timeline UI: range input scrubbing, play/pause button, time display
- [ ] Keyframe markers on timeline track
- [ ] Camera path animation: GSAP MotionPath on Three.js `CatmullRomCurve3`
- [ ] `gsap.context()` cleanup in all React components

### 3.4 Shot Panel & Thumbnails
- [ ] Shot thumbnail generation: `gl.domElement.toDataURL()` → upload to S3
- [ ] Thumbnail caching: retrieve from S3/CDN on load
- [ ] Shot panel component: thumbnail + name + duration display
- [ ] Drag-to-reorder shots (`orderIndex` update)

### 3.5 Undo / Redo
- [ ] Command pattern: every scene mutation is a reversible `Command` object
- [ ] `useUndoRedo.ts` hook with command stack
- [ ] Keyboard: Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y

### 3.6 Zustand Stores
- [ ] `useStudioStore.ts` — active project, sequence, shot
- [ ] `useSceneStore.ts` — Three.js scene graph state (objects, cameras, lights)
- [ ] `useTimelineStore.ts` — GSAP keyframes, playhead position
- [ ] `useCollaborationStore.ts` — presence, peer cursors

---

## PHASE 4 — Real-Time Collaboration

- [ ] Socket.IO client setup in Next.js (`socket.io-client`)
- [ ] Connect to `/studio` namespace on scene open
- [ ] Yjs CRDT integration: shared scene document (`Y.Doc`)
- [ ] Awareness protocol: show peer cursors and selected objects
- [ ] Broadcast GSAP timeline `progress()` for preview sync
- [ ] Optimistic UI: apply local mutation immediately, reconcile on server ack
- [ ] Conflict resolution: last-write-wins for simple props; CRDT for concurrent edits
- [ ] Presence indicator: avatar stack showing who's in the scene

---

## PHASE 5 — Export Pipeline

- [ ] Server-side headless render endpoint (`POST /api/shots/:id/render`)
- [ ] Puppeteer + headless Three.js scene render (frame capture)
- [ ] FFmpeg pipeline: frames → MP4 animatic
- [ ] Export to PDF panel sheet (shot thumbnails + metadata)
- [ ] Export status: SSE progress stream to client
- [ ] S3 upload of rendered output + signed download URL

---

## PHASE 6 — Infrastructure & DevOps

### 6.1 Docker
- [ ] Multi-stage `Dockerfile` for API (builder → runner, non-root user)
- [ ] Multi-stage `Dockerfile` for web (builder → runner)
- [ ] `docker-compose.yml` for local dev (API + web + Postgres + Redis)

### 6.2 CI/CD
- [ ] GitHub Actions: lint + type-check on PR
- [ ] GitHub Actions: run test suite on PR
- [ ] GitHub Actions: `npm audit` + Snyk/Dependabot scan
- [ ] GitHub Actions: build and push Docker images on merge to main
- [ ] Secrets via GitHub Secrets — never in env files committed to git

### 6.3 Kubernetes (Production)
- [ ] K8s Deployment manifests (API + web)
- [ ] HPA (Horizontal Pod Autoscaler) on CPU/memory
- [ ] PodDisruptionBudget for zero-downtime deploys
- [ ] K8s Secrets for all sensitive config
- [ ] Network policies: pods only communicate on declared ports
- [ ] `/health/live` and `/health/ready` endpoints (already implemented in API)

---

## PHASE 7 — Database & Migrations (Drizzle Migration)

> Note: Currently using Prisma. Persona spec calls for Drizzle ORM + Neon.
> Decision needed: stay on Prisma or migrate to Drizzle.

- [ ] **Decision**: Confirm ORM choice (Prisma vs Drizzle) — adjust tasks below
- [ ] If Drizzle: migrate schema from `prisma/schema.prisma` to Drizzle schema files
- [ ] If Drizzle: replace Prisma client calls with Drizzle queries across all repositories
- [ ] Add `?pgbouncer=true` connection string parameter (Neon built-in pooler)
- [ ] Enable Postgres RLS policies at DB level (currently only application-level)
- [ ] Composite indexes: `(org_id, createdAt DESC)` on all paginated tables ← verify in schema
- [ ] Add `(org_id, updatedAt DESC)` index for dashboard "recently modified" queries
- [ ] Drizzle-kit migration workflow for production deployments

---

## Backlog / Nice-to-Have

- [ ] Dark mode support (design token based)
- [ ] i18n (English + one other language as proof of concept)
- [ ] In-app notifications (SSE-based)
- [ ] Comment threads on shots
- [ ] Version history for scene data (append-only `scene_snapshots` table)
- [ ] Storyboard PDF export with custom branding
- [ ] Mobile-responsive dashboard (studio is desktop-only)
- [ ] Onboarding flow for new organizations
- [ ] Usage analytics (anonymous, privacy-respecting)
- [ ] Demo mode with read-only sample project

---

## Quick Reference — AXIOM File Size Law
> Hard limit: **150 lines per file**. Split at 120 lines (buffer).  
> Extract: types → `types.ts`, constants → `constants.ts`, hooks → `use{Name}.ts`, utils → `utils/{name}.ts`
