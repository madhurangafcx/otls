# OTLS — Online Teaching & Learning System

A thin LMS for small Sri Lankan tuition centers (50-300 students). Replaces
three parts of the typical WhatsApp + Zoom + Drive stack: **recordings shelf**,
**assignment submission**, **announcements feed**. Does not touch fees or live
classes.

Target user: the tuition-center admin who currently retypes the same schedule
reminder into a WhatsApp group every day and collects handwritten homework as
phone photos. v0.1 scope is all three pillars shipped together.

## Status

**v0.1 shipped, v0.2 in progress.** Phases 1-7 complete; Phase 8 scaffolding landed but deploy is pending external accounts.

| Phase | Scope | Status |
|---|---|---|
| 1 | Foundation: monorepo, Supabase, migrations, RLS, storage bucket, JWT middleware | Done |
| 2 | Auth: email + Google OAuth, /register, /login, middleware gate, /api/auth/me | Done |
| 3 | Courses + semesters: admin CRUD, publish toggle, public catalog | Done |
| 4 | Enrollments: request, admin review, state-aware UI, /my-courses | Done |
| 5 | Content access + assignments: semester viewer, TUS resumable upload, admin assignments table, progress bars | Done |
| 6 | Announcements: admin compose/pin/soft-delete, student feed, unread badges, WhatsApp share | Done |
| 7 | Pilot runbooks + ARCHITECTURE.md + monitoring setup doc | Done |
| 8 | Deploy: Dockerfile, fly.toml, CI + deploy workflow | Scaffolding done; Fly/Vercel/prod-Supabase accounts pending |
| v0.2 | First service-layer tests, per-semester checkmarks, forgot-password, Biome + knip, rate limiting, DIVERGENCES.md | In progress |
| Blueprint §7 | Non-functional polish: Sentry, Playwright E2E, OpenAPI, ≥70% service coverage | Not started |

## Architecture

Decoupled three-tier. Not a Next.js monolith.

```
Browser ─→ Next.js 14 App Router (frontend, BFF only)
             │
             ├─→ Bun + Hono (backend, owns all business logic)
             │     │
             │     └─→ Supabase Postgres (with RLS enabled on every table)
             │
             └─→ Supabase Storage direct TUS upload (user JWT + RLS prefix gate)
```

The backend holds the service-role key and talks to Supabase through a strict
repository layer (`routes → service → repository → supabase`). Frontend only
uses Supabase JS for the OAuth redirect flow; all data goes through the Bun
API via `src/lib/api.ts`.

Three-layer authz: Next.js middleware route gate, Hono `requireRole()`, Postgres
RLS. Each layer is independently sufficient for a different failure mode.

## Key Decisions

- **TUS resumable uploads** directly from browser to Supabase Storage with the
  user's JWT. Storage RLS enforces `(storage.foldername(name))[1] = auth.uid()`.
  25 MB files never pass through the Bun backend. Backend validates file path
  prefix, sniffs magic bytes server-side, inserts the assignment row, and
  upserts `student_progress` — all in one request. Compensating storage remove
  on DB failure.
- **Progress is side-effect of submission**: the `assignments` insert auto-upserts
  `student_progress` with ON CONFLICT `(student_id, semester_id)`. No separate
  "mark complete" endpoint in v0.1.
- **Announcements audit trail** via Postgres trigger writing CREATE/UPDATE/DELETE
  events with JSONB diffs to `announcement_events`, with a fallback error table
  so a broken trigger never blocks the primary write.
- **Cursor pagination** on every list endpoint (`?limit=&cursor=<iso>`).
- **Strict TypeScript** (`strict`, `noUncheckedIndexedAccess`). Biome for format
  and lint.

## Repo layout

```
otls/
├── apps/
│   ├── backend/          Bun + Hono API (service-role Supabase client, all business logic)
│   │   └── src/
│   │       ├── app.ts           Route composition
│   │       ├── config/          env + supabase client
│   │       ├── middleware/      auth (JWT), requestId
│   │       ├── lib/             pagination, redaction
│   │       ├── types/           Hono ContextVariableMap augmentation
│   │       └── modules/         Feature modules, one folder per resource
│   │           ├── auth/
│   │           ├── courses/
│   │           ├── semesters/
│   │           ├── enrollments/
│   │           ├── assignments/
│   │           ├── announcements/
│   │           └── progress/
│   └── frontend/         Bun + Next.js 14 App Router
│       └── src/
│           ├── app/             Pages (admin, student, auth)
│           ├── components/      Shared UI
│           ├── lib/             Typed API client, Supabase SSR helpers
│           └── middleware.ts    Session refresh + route gate
├── supabase/
│   └── migrations/       SQL migrations (schema + RLS)
├── docs/
│   ├── blueprint.md      Authoritative spec (feature reqs, API, schema, RLS, env, phases)
│   └── design/           Editorial Academic visual system (Fraunces + Geist, paper + ochre)
├── DESIGN.md             Visual system source of truth (root)
├── CLAUDE.md             Working notes + non-negotiable rules for AI-assisted edits
└── package.json          Bun workspaces root
```

## Getting started

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.1 (project uses 1.3.x)
- Node ≥ 20 (Bun bundles most things but some tooling still expects it)
- Supabase CLI (`bun add -g supabase` or `brew install supabase/tap/supabase`)
- A Supabase project — local stack works for dev, Cloud for pilot

### First-time setup

```bash
# 1. Install workspaces
bun install

# 2. Copy env files
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local
# Then fill in SUPABASE_URL + anon key + service_role key in both.
# Service-role key is ONLY in apps/backend/.env. Never in the frontend.

# 3. Start Supabase locally (Postgres + Auth + Storage)
bunx supabase start

# 4. Apply migrations (includes the private `assignments` bucket via 0003_storage_bucket.sql)
bunx supabase db push

# 5. Promote yourself to admin (manual — no admin signup endpoint by design)
#    psql into the local DB and run:
#      UPDATE profiles SET role = 'admin' WHERE email = 'you@example.com';
```

See `docs/runbooks/first-hour.md` for the full first-boot walkthrough.

### Daily dev

```bash
# From the repo root — starts frontend (:3000) and backend (:8080) in parallel
bun run dev

# Or individually
bun run dev:backend     # :8080
bun run dev:frontend    # :3000

# Typecheck the whole monorepo
bun run typecheck

# Tests
bun test
bun test path/to/file.test.ts
bun test -t "test name"

# Reset local DB (destructive)
bunx supabase db reset
```

## API surface

Full catalog in `docs/blueprint.md §10.4`. Quick summary:

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /login`, `POST /logout`, `GET /me` |
| Courses | `GET /api/courses` (public), `GET /:id`, `POST/PATCH/DELETE /:id` (admin), `PATCH /:id/publish` |
| Semesters | `GET /api/courses/:courseId/semesters`, `GET /api/semesters/:id`, `POST/PATCH/DELETE /:id` (admin) |
| Enrollments | `POST /api/enrollments` (student request), `GET /me`, `GET /?course_id=` (admin), `PATCH /:id` (admin review) |
| Assignments | `POST /api/assignments` (register after TUS upload), `GET /me`, `GET /` (admin list), `GET /:id/download` (60s signed URL) |
| Progress | `GET /api/progress?course_id=`, `GET /overview` |
| Announcements | `POST /api/announcements`, `GET /api/courses/:id/announcements`, `GET /:id`, `PATCH /:id`, `DELETE /:id`, `GET /overview` |

Response envelopes:

- Success: `{ "data": ... }` (collections add `"pagination": { "next_cursor": ... }`)
- Error: `{ "error": { "code": "UPPER_SNAKE", "message": "...", "request_id"?: "..." } }`

## Docs

- `docs/blueprint.md` — the spec. Authoritative on features, endpoints, schema, RLS, env vars, and the phased roadmap.
- `DESIGN.md` — visual system. Editorial Academic aesthetic, Fraunces + Geist, ochre accent, 18 screens.
- `docs/design/edulearn-ui/` — design handoff bundle (as received, preserved).
- `CLAUDE.md` — working notes, non-negotiable rules, common pitfalls, planned commands. Read before making non-trivial changes.
- `TODOS.md` — running backlog.

## Deployment

Scaffolding ready, not deployed yet. `apps/backend/Dockerfile`, `apps/backend/fly.toml`,
and `.github/workflows/deploy-backend.yml` are in place. Target: Fly.io for the Bun
backend, Vercel for the Next.js frontend, Cloudflare for DNS and managed ruleset WAF,
Supabase Cloud (Pro tier, `ap-southeast-1` / Singapore). Blocked on domain + Fly.io /
Vercel / prod-Supabase account provisioning. Full walkthrough in `docs/runbooks/deploy.md`.

## License

Proprietary. Internal to Future CX Lanka and the pilot tuition-center engagement.
