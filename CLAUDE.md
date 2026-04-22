# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current State

**Greenfield.** The repo contains the spec (`docs/blueprint.md`), the visual system (`DESIGN.md` + `docs/design/edulearn-ui/` handoff bundle), and an empty `README.md`. No source code, no `package.json`, no migrations, no monorepo structure yet. Any implementation work starts from Phase 1 of the roadmap in `docs/blueprint.md` §19.3.

When asked to implement a feature, first confirm which phase/section of the blueprint it corresponds to, then scaffold the minimum structure needed rather than inventing a different layout.

## Source of Truth

`docs/blueprint.md` is the authoritative spec (OTLS — Online Teaching & Learning System): feature requirements, quality attributes, architecture patterns, directory layouts, API contracts, DB schema (full SQL in §12.8), RLS policies, env vars, phased roadmap. Treat it as the contract — do not redesign without explicit instruction.

`DESIGN.md` at the repo root is the authoritative visual system (Edulearn wordmark, Editorial Academic aesthetic, Fraunces + Geist, ochre accent, 18 screens). Extracted from the Claude Design handoff bundle at `docs/design/edulearn-ui/`, which is preserved as-received.

## Architecture at a Glance

**Decoupled three-tier**, not a Next.js monolith:

1. **Frontend** (`apps/frontend/`) — Bun + Next.js 14 App Router + React 18 + Tailwind + shadcn/ui. Pure presentation/BFF. Uses Supabase JS *only* for the OAuth redirect flow; all data mutations go through the Bun backend.
2. **Backend** (`apps/backend/`) — Bun + TypeScript + Hono. Owns all business logic. Holds the Supabase **service-role** key. Layered: `routes → service → repository → Supabase`. Feature-based modules (`modules/courses/`, `modules/enrollments/`, etc.), each with `*.routes.ts`, `*.service.ts`, `*.repository.ts`, `*.schemas.ts`, `*.test.ts`.
3. **Supabase** — Postgres (with RLS enabled on every table), Auth (email + Google OAuth), Storage (private `assignments` bucket, 25 MB max, PDF/DOCX only).

Monorepo via Turborepo; shared DTOs live in `packages/shared-types/`; migrations live in `supabase/migrations/`.

## Non-Negotiable Rules (from the blueprint)

- **Repository pattern is mandatory.** Services never import the Supabase client directly — only repositories do. This is the swap-out point for tests.
- **Three-layer authz**: Next.js middleware (route gate) → Hono `requireRole()` middleware → Postgres RLS. Never rely on only one.
- **JWT verification every request** via `jose` against Supabase's JWKS endpoint. No session store.
- **RLS stays enabled** even though the backend uses the service role — it's defense-in-depth.
- **Zod at every API boundary**, `.strict()` to reject unknown fields. Shared with frontend where possible.
- **Cursor-based pagination** on every list endpoint (`?limit=&cursor=<iso_timestamp>`), not offset.
- **Assignment storage path**: `{student_id}/{semester_id}/{unix_ms}_{sanitized_filename}` — the leading `student_id` is what the storage RLS policy keys off (`(storage.foldername(name))[1] = auth.uid()`). Don't change this shape.
- **Assignment uploads auto-upsert `student_progress`** (ON CONFLICT `student_id, semester_id`) in the same request. This is the *only* way progress is marked complete in v1 — there is no separate "mark complete" endpoint.
- **Publishing a course requires ≥ 1 semester** and all semesters must have a valid `youtube_url` — enforce server-side, return `422`.
- **Admin provisioning is manual** — update `profiles.role = 'admin'` via SQL. No self-service admin signup endpoint.
- **Strict TypeScript**: `"strict": true`, `noUncheckedIndexedAccess: true`. No `any`.
- **Biome** is the chosen linter/formatter (not ESLint+Prettier).
- **No long-running jobs / background workers in v1.** Any heavy work must fit in a single request.
- **Error envelope**: `{ "error": { "code", "message", "details" } }`. Success envelope: `{ "data": ... }` (with `pagination.next_cursor` on collections).

## Planned Commands (once scaffolded)

These don't exist yet — they'll be wired up during Phase 1. Use them once `package.json` files exist:

```bash
# From the monorepo root
bun install                              # install all workspaces
bun run dev                              # Turborepo runs frontend + backend in parallel
bun run build                            # build both apps
bun run lint                             # biome across the monorepo
bun run typecheck                        # tsc --noEmit in each app
bun test                                 # all unit/integration tests
bun test path/to/file.test.ts            # single test file
bun test -t "test name"                  # single test by name

# Supabase (local dev stack)
bunx supabase start                      # spin up local Postgres + Auth + Storage
bunx supabase db push                    # apply migrations from supabase/migrations/
bunx supabase db reset                   # wipe + re-apply all migrations (destructive)
```

Backend-specific entry is `apps/backend/src/index.ts` using `Bun.serve({ fetch: app.fetch })` — not `node` or `ts-node`.

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
