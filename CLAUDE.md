# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current State

**v0.1 shipped, v0.2 in progress.** Phases 1-7 of the blueprint roadmap are complete: the monorepo is scaffolded (Bun workspaces + Turborepo), both apps run (`bun run dev` → frontend :3000 + backend :8080), three migrations are in place (`supabase/migrations/0001_initial_schema.sql`, `0002_rls_policies.sql`, `0003_storage_bucket.sql`), the full Edulearn design is ported across 4 tiers, and Phase 8 deploy scaffolding (Dockerfile + fly.toml + CI workflow) is committed.

Phase 8 deploy itself is **pending external accounts** — no Fly.io or Vercel project exists yet. `docs/runbooks/deploy.md` walks through the account-level steps.

v0.2 work in flight: per-semester completion checkmarks (shipped), forgot-password flow (shipped), Biome + knip tooling (shipped), first service-layer tests + CLAUDE.md + divergences (this doc pass).

When asked to implement a feature, first confirm which blueprint section or GAPS.md tier it corresponds to. When fixing a bug, prefer the `/investigate` skill for root-cause discipline.

Known divergences from the blueprint are listed in `docs/DIVERGENCES.md` — check there before "fixing" what looks like a discrepancy.

## Source of Truth

`docs/blueprint.md` is the authoritative spec (OTLS — Online Teaching & Learning System): feature requirements, quality attributes, architecture patterns, directory layouts, API contracts, DB schema (full SQL in §12.8), RLS policies, env vars, phased roadmap. Treat it as the contract — do not redesign without explicit instruction.

`DESIGN.md` at the repo root is the authoritative visual system (Edulearn wordmark, Editorial Academic aesthetic, Fraunces + Geist, ochre accent, 18 screens). Extracted from the Claude Design handoff bundle at `docs/design/edulearn-ui/`, which is preserved as-received.

## Architecture at a Glance

**Decoupled three-tier**, not a Next.js monolith:

1. **Frontend** (`apps/frontend/`) — Bun + Next.js 14 App Router + React 18 + Tailwind + shadcn/ui. Pure presentation/BFF. Uses Supabase JS *only* for the OAuth redirect flow; all data mutations go through the Bun backend.
2. **Backend** (`apps/backend/`) — Bun + TypeScript + Hono. Owns all business logic. Holds the Supabase **service-role** key. Layered: `routes → service → repository → Supabase`. Feature-based modules (`modules/courses/`, `modules/enrollments/`, etc.), each with `*.routes.ts`, `*.service.ts`, `*.repository.ts`, `*.schemas.ts`, `*.test.ts`.
3. **Supabase** — Postgres (with RLS enabled on every table), Auth (email + Google OAuth), Storage (private `assignments` bucket, 25 MB max, PDF/DOCX only).

Monorepo via Bun workspaces + Turborepo. Migrations live in `supabase/migrations/`. `packages/shared-types/` is **not yet in use** — types are currently mirrored between `apps/backend/src/modules/*/schemas.ts` and `apps/frontend/src/lib/api.ts`. Shared-types extraction is deferred to v0.3 when the API surface stabilizes.

## Non-Negotiable Rules (from the blueprint)

- **Repository pattern is mandatory.** Services never import the Supabase client directly — only repositories do. This is the swap-out point for tests.
- **Three-layer authz**: Next.js middleware (route gate) → Hono `requireRole()` middleware → Postgres RLS. Never rely on only one.
- **JWT verification every request** via `jose` against Supabase's JWKS endpoint. No session store.
- **RLS stays enabled** even though the backend uses the service role — it's defense-in-depth.
- **Zod at every API boundary**. Use `.strict()` on request body schemas (rejects unknown fields). Query-string schemas are not strict because PostgREST/browsers may add params. Shared with frontend where possible.
- **Cursor-based pagination** on most list endpoints (`?limit=&cursor=<iso_timestamp>`), not offset. Some per-user endpoints (`enrollments/me`, `assignments/me`, `progress/overview`) intentionally return the full set — the per-user count is bounded and not worth paginating.
- **Assignment storage path**: `{student_id}/{semester_id}/{unix_ms}_{sanitized_filename}` — the leading `student_id` is what the storage RLS policy keys off (`(storage.foldername(name))[1] = auth.uid()`). Don't change this shape.
- **Assignment uploads auto-upsert `student_progress`** (ON CONFLICT `student_id, semester_id`) in the same request. This is the *only* way progress is marked complete in v1 — there is no separate "mark complete" endpoint.
- **Publishing a course requires ≥ 1 semester** and all semesters must have a valid `youtube_url` — enforce server-side, return `422`.
- **Admin provisioning is manual** — update `profiles.role = 'admin'` via SQL. No self-service admin signup endpoint.
- **Strict TypeScript**: `"strict": true`, `noUncheckedIndexedAccess: true`. No `any`.
- **Biome** is the chosen linter/formatter (not ESLint+Prettier).
- **No long-running jobs / background workers in v1.** Any heavy work must fit in a single request.
- **Error envelope**: `{ "error": { "code", "message", "details" } }`. Success envelope: `{ "data": ... }` (with `pagination.next_cursor` on collections).

## Commands

```bash
# From the monorepo root
bun install                              # install all workspaces
bun run dev                              # runs frontend :3000 + backend :8080 in parallel
bun run build                            # build both apps
bun run lint                             # biome check apps (config: biome.json)
bun run lint:fix                         # biome auto-fix pass
bun run typecheck                        # tsc --noEmit across both workspaces
bun run deadcode                         # knip — flags unused exports + deps
bun test                                 # all tests (bun:test). Zero tests yet — v0.2 item.
bun test path/to/file.test.ts            # single test file

# Supabase (local dev stack)
bunx supabase start                      # spin up local Postgres + Auth + Storage
bunx supabase db push                    # apply migrations from supabase/migrations/
bunx supabase db reset                   # wipe + re-apply all migrations (destructive)
```

Backend-specific entry is `apps/backend/src/index.ts` using `Bun.serve({ fetch: app.fetch })` — not `node` or `ts-node`.

## Health Stack

Read by the `/health` skill. Don't re-detect tools — these are the canonical
commands. Update here if you swap any of them.

- typecheck: `bun run typecheck`
- lint: `bun run lint`
- test: `bun run test`
- deadcode: `bun run deadcode`
- shell: skipped — no shell scripts in the repo

## Common Pitfalls to Avoid

- Don't put Supabase calls in Next.js Route Handlers — they go through the Bun backend via `src/lib/api-client.ts`. The only exception is the OAuth callback (`app/(auth)/callback/route.ts`) which exchanges the code for a session.
- Don't use offset pagination — the blueprint explicitly requires cursor-based.
- Don't validate file types by extension or MIME alone — also check magic bytes (see §5.5 security).
- Don't expose the Supabase service-role key to the frontend. It lives only in backend env.
- Don't add a Redis dependency for v1 — in-memory rate limiting via `hono-rate-limiter` is sufficient until traffic justifies it.
- Don't write raw SQL that interpolates user input — always use the Supabase client's parameterized query builder.

## Key Blueprint Sections (when you need detail)

| Need | Section |
|---|---|
| Full endpoint catalog + request/response shapes | §10.4 |
| Complete SQL migration (tables, indexes, triggers, RLS skeleton) | §12.8 |
| Storage RLS policies for the `assignments` bucket | §14.3 |
| Assignment upload code example (end-to-end) | §14.4 |
| Env var definitions + Zod validation | §18 |
| Phased implementation roadmap with checklists | §19.3 |
| Access control matrix (who can do what) | §16.2 |

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
