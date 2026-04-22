# Divergences from `docs/blueprint.md`

The blueprint is the v0.1 contract. What shipped isn't identical to what the
blueprint described — this document lists every material delta so the spec
can stay a historical record without being rewritten.

Each item has: the blueprint section it diverges from, what the blueprint
said, what we actually shipped, and why.

---

## Upload path: TUS resumable instead of multipart

**Blueprint:** §2.10, §10.4, §14.4 — student uploads via multipart POST to
`POST /api/assignments` with the file in the request body. Backend writes to
Storage + inserts the row in one round trip.

**Shipped:** Two-step TUS (resumable) flow.
1. Client uploads the file **directly** to Supabase Storage via TUS (the
   `tus-js-client` library) using the student's own JWT. Storage RLS gates
   the upload via `storage.foldername(name)[1] = auth.uid()`.
2. Client POSTs `/api/assignments` with just the metadata
   (`{semester_id, file_path, file_name, file_type}`). Backend sniffs magic
   bytes, inserts the assignments row, upserts `student_progress`.

**Why:** pilot users on Sri Lankan mobile connections will drop mid-upload.
TUS resumes automatically. The Bun backend also doesn't need to buffer 25 MB
blobs — it just reads the first 8 bytes for magic-byte sniff, so no extra RAM
pressure. The two-step split does mean the client has to hold a valid
Supabase JWT (in addition to our own), but `@supabase/ssr` makes that
invisible.

---

## Register endpoint leaks email existence

**Blueprint:** §2.1, §16 — register should accept signup and transition to email
confirmation for new accounts. Login returns a generic error so an attacker
can't distinguish unknown-email from wrong-password.

**Shipped:** `/api/auth/register` returns `409 EMAIL_TAKEN` when the email is
already registered. Login stays generic — "Invalid email or password" — so
the leak is register-only.

**Why:** the "proper" mitigation (return 200 regardless + send a password-reset
email on collision) requires the email confirmation flow that blueprint §2.1
explicitly defers out of v0.1. For a closed pilot with a small number of
tuition-center admins and their students, the enumeration leak is low-impact.
Tracked as TODO 10 — revisit when email confirmation lands in v0.2+, or
earlier if we open register to public signup.

---

## Rate limiting: not wired in v1

**Blueprint:** §10.5 — `hono-rate-limiter` on every endpoint, sliding-window,
100 req/min default, 10/min on auth + upload.

**Shipped:** Rate-limit env vars (`RATE_LIMIT_MAX`, `_WINDOW_MS`, `_AUTH_MAX`,
`_UPLOAD_MAX`) are validated at boot, but no `rate-limiter` middleware is
mounted yet.

**Why:** pilot traffic is tens of requests per day. The failure mode isn't
abuse, it's "is this running at all." Mount it when we go public. Wiring is
~10 lines — see `hono-rate-limiter` docs, add to `app.ts` per-route-group.

---

## OpenAPI spec: deferred to v0.2+

**Blueprint:** §10.6, §19.3 Phase 7 — emit a full OpenAPI spec from Hono +
Zod schemas, serve a Swagger UI at `/docs`.

**Shipped:** Nothing. The typed `apps/frontend/src/lib/api.ts` client is the
de-facto contract.

**Why:** only consumer is our own frontend. External docs would be overhead
without readers. Revisit when we add a mobile app, third-party integration,
or a partner SDK.

---

## Test coverage: zero tests shipped in v0.1

**Blueprint:** §19.5 — ≥70% unit coverage on services, integration tests for
critical paths, 3-5 Playwright E2E flows.

**Shipped:** `bun test` wired, Biome + knip in place, but zero test files.
Both workspace `test` scripts are wired but produce no output. v0.2 begins
service-layer tests — `assignments.service.ts` first (highest complexity,
most failure modes).

**Why:** shipping a working pilot was judged higher-leverage than shipping a
tested greenfield. The bugs we hit this session (403 on every submit, storage
bucket missing, PostgREST ambiguous join) wouldn't all have been caught by
unit tests anyway — two were integration-level (live DB state) and one was a
config gap (missing bucket). E2E would have caught the submit path; that's
the test to write first.

---

## Phase numbering reshuffled

**Blueprint:** §19.3 lists Phases 1-8 over 6 weeks: setup → auth → admin
courses → enrollments → assignments + progress → announcements (§2.12
sidebar, later merged) → polish → deploy.

**Shipped:** same order, but announcements became its own named phase
(6) earlier — scope-add after the CEO review identified per-course
messaging as a pilot requirement. The pilot runbooks (`first-hour.md`,
`rollback-announcements.md`, `monitoring-setup.md`) were written in Phase
7 ahead of Phase 8 so deploy has something to execute against.

---

## Admin delta/trend arrows on StatCards: scalar only for now

**Blueprint:** GAPS.md §8 design note — admin dashboard stat cards show
`{value, delta, direction}` per metric ("+12 this week ↑").

**Shipped:** `/api/admin/stats` returns scalars only (`students`,
`courses_total`, `courses_draft`, `pending_enrollments`,
`submissions_today`). No time-window deltas.

**Why:** deltas need a second query per metric with a timestamp filter,
bumping the endpoint from 5 head-count queries to 10. Cheap but not free.
Defer until pilot users care about "what changed this week" (first sign:
they start asking for a weekly email digest).

---

## Shared types package: not created

**Blueprint:** §9 — `packages/shared-types/` with DTOs shared by frontend
+ backend.

**Shipped:** types are mirrored between `apps/backend/src/modules/*/schemas.ts`
(Zod schemas) and `apps/frontend/src/lib/api.ts` (hand-written
`CoursePayload`, `EnrollmentPayload` etc.).

**Why:** at 15 types total, the mirror is low-friction. Extraction would be
~2 hours of plumbing (tsconfig paths, Turborepo wiring, import rewrites) for
little immediate gain. Revisit when we add a third consumer (mobile app) or
when the types cross 30.

---

## PostgREST caveats (for future reference)

Not a divergence per se, but three pitfalls hit and resolved during v0.1:

1. **`table_a → table_b!inner(col)` requires a direct FK.** If `a` and `b`
   only relate through a third table `c`, PostgREST returns PGRST200
   "Could not find a relationship." Two-step lookup or explicit join
   through `c` instead. Caught in `semesters.repository.ts`.

2. **Multiple FK paths → ambiguous join.** When `profiles` is referenced
   by `enrollments.student_id` AND `enrollments.reviewed_by`, a plain
   `enrollments(count)` nested select errors with "more than one
   relationship was found." Pin the FK by name:
   `enrollments!enrollments_student_id_fkey(count)`. Caught in
   `admin.repository.ts`.

3. **Storage bucket creation is not idempotent in PostgREST.** Buckets
   need a one-time INSERT into `storage.buckets` (we do it in migration
   `0003_storage_bucket.sql` with `ON CONFLICT DO UPDATE`). Easy to miss
   when the app-level RLS policies already reference the bucket.

All three show up as runtime errors only — typecheck passes cleanly. Curl
new queries against the live Supabase before wiring them to the frontend.

---

## What is NOT a divergence

These are blueprint requirements that shipped exactly as specified. Listed
here so future sessions don't second-guess them:

- Three-tier decoupled architecture (Next.js frontend, Bun/Hono backend,
  Supabase) — all intact
- Repository pattern — services never import `supabase` directly
- Three-layer authz — middleware + `requireRole` + RLS all active
- JWT verification via `jose` against JWKS — every authed endpoint
- Error envelope `{ error: { code, message, request_id } }` — uniform
- Success envelope `{ data: ..., pagination: { next_cursor } }` — uniform
- RLS enabled on every public-schema table
- Assignment path shape `{student_id}/{semester_id}/{unix_ms}_{name}`
- Upload auto-upserts `student_progress` (no separate mark-complete)
- Publish validation (≥1 semester, all with youtube_url) → 422
- Admin provisioning is manual via SQL — no self-service admin signup
- Strict TypeScript, Biome as linter (not ESLint+Prettier)
