# OTLS Architecture

Handoff doc for anyone picking up this codebase. If you want to know *what* the
system is or *why* a decision was made, start here. For *how* to set up and
run it, see `README.md`. For the authoritative spec, see `docs/blueprint.md`.

Last updated after Phase 7 ship (pilot runbooks + monitoring setup) and v0.2 opening work (Biome, knip, first service tests, forgot-password, per-semester checkmarks).

---

## 1. System context

OTLS is a thin LMS for a single Sri Lankan tuition center in v0.1. It replaces
three parts of the WhatsApp + Zoom + Drive stack: recordings shelf, assignment
submission, and announcements feed. It does NOT replace fees (stays in Excel)
or live classes (stays on Zoom).

Two roles: **admin** (tuition-center owner/head admin, manual provisioning) and
**student** (self-signup via email or Google OAuth, moderated enrollment).

Scale target for v0.1: ~300 students, ~500 concurrent, ~1000 assignment uploads/day.
Single region, single backend replica. Multi-region and multi-replica are v0.2.

## 2. Three-tier architecture

```
┌──────────────┐      ┌──────────────────┐      ┌─────────────────────┐
│              │      │                  │      │                     │
│   Browser    │      │  Next.js 14      │      │   Bun + Hono        │
│              │─────>│  App Router      │─────>│   Backend           │
│              │      │  (BFF only)      │      │                     │
└──────────────┘      └──────────────────┘      └─────────┬───────────┘
       │                                                    │
       │                                                    │ service-role
       │  TUS resumable (user JWT)                         │
       │                                                    v
       │                                          ┌─────────────────────┐
       └─────────────────────────────────────────>│  Supabase           │
                                                  │  Postgres + Auth    │
                                                  │  Storage            │
                                                  └─────────────────────┘
```

**Frontend** never talks to Supabase directly for data. The one exception is
`/auth/callback` which exchanges the OAuth code for a session — that has to
happen in the browser context. All reads and writes go through the Bun API
via `src/lib/api.ts`.

**Backend** holds the `service_role` key, which bypasses RLS. This is the
single place with privileged DB access. It is NOT a cover for missing authz
— RLS stays enabled as defense-in-depth, and the service layer enforces role
gates explicitly on every write.

**Supabase** provides Postgres (with RLS enabled on every public table), Auth
(email + Google OAuth, JWT via JWKS), and Storage (private `assignments`
bucket, 25 MB max, PDF/DOCX only).

## 3. Repository layout

```
otls/
├── apps/
│   ├── backend/                       Bun + Hono API
│   │   └── src/
│   │       ├── index.ts              Bun.serve entry
│   │       ├── app.ts                Hono app composition, middleware chain, route mounts
│   │       ├── config/
│   │       │   ├── env.ts            Zod-validated env at boot
│   │       │   └── supabase.ts       Service-role Supabase client
│   │       ├── middleware/
│   │       │   ├── auth.ts           authMiddleware (JWT via jose + JWKS) + requireRole
│   │       │   └── request-id.ts     UUID per request for log correlation
│   │       ├── lib/
│   │       │   ├── pagination.ts     Cursor-based schema + helpers
│   │       │   └── redact.ts         PII scrubbing for logs
│   │       ├── types/
│   │       │   └── hono.d.ts         ContextVariableMap augmentation (userId, role, etc.)
│   │       ├── routes/
│   │       │   └── health.ts         /health
│   │       └── modules/              Feature modules — one folder per resource
│   │           ├── auth/
│   │           ├── courses/
│   │           ├── semesters/
│   │           ├── enrollments/
│   │           ├── assignments/
│   │           ├── announcements/
│   │           └── progress/
│   │
│   └── frontend/                      Bun + Next.js 14 App Router
│       └── src/
│           ├── middleware.ts         Session refresh + /admin route gate
│           ├── app/
│           │   ├── page.tsx          Landing
│           │   ├── (auth)/           /login, /register, /auth/callback
│           │   ├── courses/          Public catalog + course detail + semester viewer
│           │   ├── my-courses/       Student dashboard
│           │   └── admin/            Admin surfaces (courses, enrollments, assignments, announcements)
│           ├── components/           Shared UI (AnnouncementCard, etc.)
│           └── lib/
│               ├── api.ts            Typed fetch client — the one place to call the backend
│               ├── supabase-browser.ts   Browser client (OAuth redirect + setSession only)
│               └── supabase-server.ts    Server Component client (cookie reads)
│
├── supabase/
│   └── migrations/                   Ordered SQL — 0001 schema, 0002 RLS, (future: 0003+)
│
├── docs/
│   ├── blueprint.md                  Authoritative spec
│   ├── design/edulearn-ui/           Claude Design handoff bundle (preserved as-is)
│   ├── runbooks/                     Operational playbooks (Phase 7)
│   └── ops/                          Monitoring setup, alert config (Phase 7)
│
├── DESIGN.md                         Visual system (root)
├── CLAUDE.md                         Working rules + pitfalls
├── ARCHITECTURE.md                   (this file)
├── README.md                         Getting started + phase status
└── TODOS.md                          Running backlog
```

## 4. Every module follows the same pattern

Each resource lives in `apps/backend/src/modules/{name}/`:

```
{name}.schemas.ts      Zod schemas for every API boundary (.strict() rejects unknown fields)
{name}.repository.ts   Only place that imports the supabase client. Pure data access.
{name}.service.ts      Business rules. Imports repositories, composes them.
{name}.routes.ts       Hono routes. Imports service. Handles HTTP<->service translation.
```

**Why**: this is the swap-out point for tests. Service layer takes a repository
interface; tests inject a mock. We haven't written the tests yet (that's blueprint
§7), but the seam is ready.

Services throw typed `*ServiceError` with a `code` string. Route handlers map
`code → HTTP status` via a `STATUS_MAP` constant and return the uniform error
envelope.

## 5. Auth chain — three layers

```
  Request arrives
        │
        ▼
  Next.js middleware   (src/middleware.ts)
    - refreshes Supabase session cookies if near expiry
    - redirects unauthenticated → /login for protected routes
        │
        ▼
  Bun backend          (src/middleware/auth.ts)
    - verifies Bearer JWT against Supabase JWKS (jose, 24h cache, stale-while-revalidate)
    - sets c.userId
    - requireRole('admin') re-reads role from profiles (NOT from JWT claim) so
      admin promotion takes effect on the very next request without token rotation
        │
        ▼
  Postgres RLS         (supabase/migrations/0002_rls_policies.sql)
    - enabled on every public table
    - service-role bypasses RLS but policies stay in place as defense-in-depth
        │
        ▼
  Business logic
```

Each layer catches a different class of mistake:

- **Middleware** — "someone went straight to a protected URL"
- **requireRole** — "token is valid but role has changed OR route trusts the wrong role"
- **RLS** — "service layer has a bug and leaks cross-tenant data"

## 6. Storage + TUS upload flow

Blueprint §14 is the spec. Implementation note: blueprint §14.4 showed a backend
multipart upload; we swapped to TUS direct-to-Storage per eng-review because
resumability matters on Sri Lankan 4G.

```
Client                                  Supabase Storage                 Backend
   │                                           │                            │
   │ TUS upload (user JWT + 6MB chunks)        │                            │
   │──────────────────────────────────────────>│                            │
   │                                           │                            │
   │<──────── PATCH responses / progress ──────│                            │
   │                                           │                            │
   │                                           │                            │
   │ POST /api/assignments (register)          │                            │
   │──────────────────────────────────────────────────────────────────────>│
   │                                           │                            │
   │                                           │<─── verify enrollment ─────│
   │                                           │<─── sniff magic bytes ─────│
   │                                           │     (service-role download)│
   │                                           │                            │
   │                                           │<─── INSERT assignments ────│
   │                                           │<─── UPSERT progress ───────│
   │                                           │                            │
   │                                   (on DB failure)                      │
   │                                           │<─── compensating remove ───│
   │                                           │                            │
   │<─── 201 { assignment, progress } ─────────────────────────────────────│
```

**Path convention** (load-bearing for RLS): `{student_id}/{semester_id}/{unix_ms}_{sanitized_filename}`.
Storage RLS policy keys off `(storage.foldername(name))[1] = auth.uid()::text`.
The backend re-validates the prefix against the authenticated user's ID as
defense-in-depth — a bug in the RLS policy or a misconfigured storage bucket
shouldn't silently let an attacker register someone else's uploaded file as
their own submission.

**Magic byte sniff** validates file content matches declared type:

- PDF: `25 50 44 46` (`%PDF`)
- DOCX: `50 4B 03 04` (`PK\x03\x04`, ZIP header)

For v0.1 the sniff is a full blob download via service-role (acceptable at
25 MB max and low pilot volume). Future optimization: HTTP Range-GET on the
Storage REST URL to drop cost from O(filesize) to 8 bytes per upload.

## 7. Announcements audit trail

The `announcement_events` table is populated by a Postgres trigger
(`log_announcement_event`) that fires on INSERT/UPDATE/DELETE. It captures:

- Event type (`CREATE`, `UPDATE`, `DELETE` — including soft delete via `deleted_at`)
- `actor_id` from `auth.uid()` (null for service-role writes, which is most
  API-driven writes today — see limitation below)
- `diff` as JSONB: full row for CREATE, `{before, after}` for UPDATE, `{deleted_at, was}` for soft delete

The trigger wraps the insert in an EXCEPTION block and falls back to
`announcement_events_errors`. If THAT also fails, the error is swallowed.
The CEO-review requirement was explicit: **a broken audit trigger must never
block the primary write**.

**Soft delete**: setting `announcements.deleted_at = now()` triggers a DELETE
event in the audit table and hides the row from students (RLS and repository
queries both filter `deleted_at IS NULL`). Restoring is a single SQL UPDATE
(see `docs/runbooks/rollback-announcements.md`).

**Known limitation**: because the backend uses the service-role client,
`auth.uid()` in the trigger returns null, so `actor_id` is null for
API-driven writes. The `author_id` column on the announcement itself captures
creator correctly. UPDATE/DELETE actor attribution is v0.2 work — two paths
forward: (a) pass the admin JWT to a scoped client for writes, or (b) pass
actor_id explicitly via a SET LOCAL GUC before each write.

## 8. RLS model

RLS enabled on every public table. Policies in `supabase/migrations/0002_rls_policies.sql`.

Pattern:

- `profiles` — users read/update own row; admins read all
- `courses` — students read published only; admins read/write all
- `semesters` — approved-enrolled students read (via join to enrollments); admins read/write all
- `enrollments` — students read/write own (create with status=pending only); admins read/write all
- `assignments` — students read/write own (via student_id=auth.uid); admins read all
- `student_progress` — students read/write own; admins read all
- `announcements` — approved-enrolled students read (deleted_at IS NULL); admins read/write all
- `announcement_events` / `announcement_events_errors` — admin-only read; writes only via trigger (SECURITY DEFINER)
- `semester_views` — admin read all; students insert own via enrollment check; no student read of history in v0.1
- `storage.objects` (assignments bucket) — student owns files under their UUID prefix; admins read all

The service-role bypasses all of this. The service layer is responsible for
not accidentally leaking data across tenants. Three guardrails keep that honest:

1. Every list query filters by the current user's ID where appropriate (see
   `assignments.repository.findByStudent` vs `listForAdmin`).
2. Route handlers call `requireRole('admin')` before any admin-scope service call.
3. RLS is still on as a backstop.

## 9. Key invariants

These are enforced in the code and documented in `CLAUDE.md` as non-negotiable:

1. **Publishing a course requires ≥ 1 semester, and all semesters must have a
   valid YouTube URL.** Server-side check in `coursesService.setStatus`; 422
   on violation.
2. **Assignment submission auto-upserts `student_progress`** in the same
   request. There is no separate "mark complete" endpoint in v0.1.
3. **Admin provisioning is manual** — `UPDATE profiles SET role='admin' WHERE ...`
   directly in SQL. No self-service admin signup endpoint.
4. **Cursor-based pagination** on every list endpoint (`?limit=&cursor=<iso_timestamp>`).
   Not offset.
5. **Zod `.strict()`** on every request boundary — unknown fields are a 400.
6. **Repository pattern is mandatory**. Services never import the Supabase
   client directly.
7. **JWT verified every request** via `jose` + JWKS. No session store.
8. **Single pinned announcement per course** enforced by a partial unique
   index. Service layer does unpin-all-then-pin; catches 23505 → 409 CONFLICT.
9. **Assignment storage path shape** (`{student_id}/{semester_id}/{unix_ms}_{safe_name}`)
   is load-bearing for RLS. Do not change.

## 10. Known v0.1 limitations (deferred to v0.2+)

| Area | Limitation | Path forward |
|---|---|---|
| Audit attribution | `actor_id` is null for API-driven announcement writes (service-role). `author_id` captures creator correctly. | Use a user-scoped Supabase client for writes, OR pass actor_id via SET LOCAL. |
| Magic byte sniff | Downloads full blob to read 8 bytes. Fine at 25 MB, wasteful at scale. | HTTP Range-GET on the Storage REST URL. |
| Pin concurrency | Unpin-all and new-pin are two separate Supabase writes, not one Postgres transaction. Concurrent second-pinner races and gets 409. | Move to a Postgres RPC function so it's one atomic transaction. |
| Rate limiting | Configured in env but not wired up. | Mount `hono-rate-limiter` on `/api/*` and `/api/assignments/*` per blueprint §10.5. |
| Observability | No Sentry, no structured logs aggregation, no dashboards. | Phase 7 — see `docs/ops/monitoring-setup.md`. |
| Test coverage | Target: 50% on business-logic services (design-doc trim from blueprint's 70%). Actual today: 0. | Blueprint §7 polish phase. |
| OpenAPI | `@hono/zod-openapi` not wired. | Deferred to v0.2 per design-doc. |
| `@hono/zod-validator` envelope | Emits its own error shape, not our uniform `{error:{code,message}}`. Affects 400 validation errors only. | Wrap with a small adapter or swap to `@hono/valibot-validator`. |
| `ignoreDeprecations` was misconfigured as `"6.0"` across prior phases, silently disabling typecheck. | Fixed in `chore(tooling)`; latent type errors surfaced and fixed. | Done. |

Full backlog in `TODOS.md`.

## 11. How to add a new feature (the pattern)

Say you want to add a `quizzes` resource. You'd:

1. Write the migration: new table + indexes + RLS policies (follow `0001` + `0002`).
2. Scaffold `apps/backend/src/modules/quizzes/` with the four-file split.
3. Mount in `apps/backend/src/app.ts`:
   ```ts
   import { quizzesRoutes } from './modules/quizzes/quizzes.routes';
   app.route('/api/quizzes', quizzesRoutes);
   ```
4. Extend `apps/frontend/src/lib/api.ts` with `api.quizzes.*` typed methods.
5. Build pages under `apps/frontend/src/app/` as Server Components where
   possible; client components only where interaction requires state.
6. Run `bun run typecheck` — both workspaces must be clean before committing.
7. Commit in the feature pattern: `feat(phase-X-backend): ...` and
   `feat(phase-X-frontend): ...`.

The repo is optimized for adding resources by copying an existing module and
replacing nouns. `enrollments/` is the smallest reference; `assignments/` is
the most complex (multi-step write with side effects).

## 12. Debugging tips

- Every request has an `X-Request-Id` set by `middleware/request-id.ts` and
  echoed in the error envelope's `request_id` field. Grep logs by it.
- Hono dev mode hot-reloads on file save. If routes stop responding, the
  server probably crashed — check the terminal for the stack trace.
- Supabase RLS errors look like PostgREST 401s. If you're using the service-
  role key and still getting denied, your `profiles.role` is probably not
  `admin` — check with `SELECT role FROM profiles WHERE email='...'`.
- Magic-byte rejection on assignment upload → backend returns 422
  `INVALID_FILE_CONTENT`. The backend compensates by removing the object from
  storage automatically; check `[assignments.register]` log lines.
- `@hono/zod-validator` errors land as 400 with a `{success:false, error:{...}}`
  shape (not our envelope) — known limitation, see above.

## 13. References

- `docs/blueprint.md` — spec (feature reqs, full API catalog in §10.4, SQL in §12.8, RLS in §14, env in §18, phases in §19.3, access-control matrix in §16.2)
- `DESIGN.md` — Editorial Academic visual system
- `CLAUDE.md` — working rules + pitfall list
- `docs/runbooks/first-hour.md` — pilot launch playbook (Phase 7)
- `docs/runbooks/rollback-announcements.md` — announcement recovery (Phase 7)
- `docs/ops/monitoring-setup.md` — Fly.io + Grafana + Better Uptime provisioning (Phase 7)
- `TODOS.md` — running backlog
