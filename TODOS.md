# TODOS

Implementation-level residual items from the office-hours + plan-eng-review sessions for OTLS v0.1. Design-stage Open Questions (client interviews, language confirmation, etc.) live in the design doc at `~/.gstack/projects/otls/pasan-unknown-design-20260422-104316.md`, not here.

---

## TODO 1 — Budget an integration week for Next.js-on-Bun + Node-prod path

**What:** In Phase 1 of the roadmap, reserve ~1 week before feature work starts to shake out the Bun-for-dev / Node-for-prod path.

**Why:** Five known gotchas, each a half-day to a full day when it bites: `bun.lockb` lockfile divergence, `next/font` Bun resolution, `sharp` native bindings, Sentry under Bun, RSC streaming + middleware edge cases under Bun runtime. Batching them into one "integration week" is cheaper than hitting each mid-feature.

**Pros:** Catch infrastructure bugs before they pollute feature commits. Team confidence high going into Phase 2.

**Cons:** One week of calendar time with nothing shippable to the client. Looks like "setup overhead" if not communicated.

**Context:** Production build runs `next start` on Node inside a Fly.io container; Bun is the dev runtime + package manager. The design doc's Distribution Plan lists the gotchas explicitly. Realistic escape hatches are "Node everywhere" (lose Bun dev ergonomics) or "Bun everywhere" (more runtime risk). Neither is chosen — test before committing.

**Depends on / blocked by:** Phase 1 kickoff. Should happen before Phase 2 starts.

---

## TODO 2 — Set a timeline buffer of zero and name it

**What:** Document explicitly that the 3-4 month v0.1 timeline has **no slack** given the full blueprint ceremony + announcements + instrumentation tables (`semester_views`, `last_announcement_read_at`) + 3 happy-path E2Es + TUS uploads + announcement audit table + per-PR preview deploys + admin runbook + restore drill. Communicate to the client that any scope addition from this point requires an explicit timeline revision.

**Why:** Left unsaid, scope will creep and the engineering team will absorb it silently until the schedule slips in week 14. Naming the zero-slack status now makes every future "can we also..." conversation explicit.

**Pros:** Client and engineering share the same reality. No surprise escalations in month 3.

**Cons:** Feels like defensive pessimism at project start. Client may push back.

**Context:** The eng review of the office-hours design doc added 3 scope expansions (TUS in v0.1, full audit table, per-PR preview deploys) that weren't in the original design doc. Each adds 1-2 days. Net effect is ~1-1.5 weeks of new scope, eating any buffer that may have existed.

**Depends on / blocked by:** Client stakeholder meeting (the one the user owes themselves per The Assignment in the design doc).

---

## TODO 3 — Single-pilot concentration risk needs a mitigation plan

**What:** Identify a backup pilot candidate (second tuition-center owner Future CX could approach) before Phase 1 starts, OR document explicitly that project viability depends on a single client not backing out.

**Why:** If the committed pilot client pauses, delays, or cancels at any point in the 3-4 month build, Future CX either finishes an unused product or restarts with a different client's workflow assumptions (which may differ from the ones in the design doc's P2).

**Pros:** Reduces single-point-of-failure risk. Second candidate validates or invalidates the P2 assumptions cheaper.

**Cons:** Sales/BD effort on a second client that may not convert. Distracts from the primary pilot.

**Context:** Design doc flagged this as "Pilot concentration risk — outside this design doc's scope but the single biggest non-technical risk." Not engineering work, but engineering pays the cost if it hits.

**Depends on / blocked by:** Future CX sales/BD ownership — not an engineer task to solve.

---

## TODO 4 — Revisit Approach B/C scaffolding after pilot week 4

**What:** Schedule a specific review checkpoint at week 4 post-launch (roughly 30 days into pilot use) to evaluate whether Approach B's scaffolding (generic notifications table, i18n framework, role-scoped API, mobile-first CSS, notification bell) or Approach C's WhatsApp Business API integration should be pulled into v0.2.

**Why:** The design doc's Pillar 3b success metric (60% of students have read at least one announcement in 30 days) is the canary. If 3b fails while 3a passes, the in-app feed is being ignored and C is the right pivot. If 3b passes, B's scaffolding becomes the right v0.2 investment pattern.

**Pros:** Turns Approach A/B/C from a one-shot decision into a validated-by-data pivot point.

**Cons:** Requires actual instrumentation data and a post-launch retro discipline that's easy to skip.

**Context:** Three approaches were explored in office hours; A was chosen for v0.1 with explicit rationale that B/C wait for validation. The validation metric is already defined (Success Criteria Pillar 3b). The review checkpoint needs to actually happen.

**Depends on / blocked by:** v0.1 launch + 30 days of pilot data.

---

## TODO 5 — Supabase JWT signing mode — verify asymmetric (JWKS) before Phase 2

**Status:** ✅ Completed during Phase 2. `apps/backend/src/middleware/auth.ts:13` calls `createRemoteJWKSet(new URL(\`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json\`))` with stale-while-revalidate caching and every authed request verifies cleanly. Supabase project is RS256.

**What:** Before building auth middleware in Phase 2, confirm the Supabase project uses **asymmetric JWT signing (RS256 via JWKS endpoint)** rather than the legacy symmetric HS256 with a shared secret. If it's HS256, either migrate the project or use the shared secret directly in `jose.jwtVerify` (not the JWKS approach the blueprint specifies).

**Why:** Blueprint §9.5 auth middleware code uses `createRemoteJWKSet` against `/auth/v1/.well-known/jwks.json`. That endpoint only exists for asymmetric-signing projects. Older Supabase projects use HS256 and that endpoint returns 404. Wrong signing mode = auth middleware fails silently at startup.

---

## TODO 6 — Instructor-role migration plan for v0.2

**What:** When v0.2 adds an `instructor` role, update `announcements.author_id` (and any other v0.1 author-scoped columns) to accept either an admin OR an instructor of the associated course. Migration must touch existing announcement rows, not just new ones.

**Why:** v0.1 ships with admin-only announcement authoring per design doc P-resolved-3. v0.2's instructor-role feature needs RLS + constraint changes that cross the announcements module. Capturing now so v0.2 planning doesn't miss the migration shape.

**Pros:** v0.2 engineer sees the dependency at plan time. No surprise migration week-3 of v0.2 build.

**Cons:** None — this is just a note.

**Context:** Blueprint has only `admin` and `student` roles. `announcements.author_id` is an FK to `profiles(id) ON DELETE SET NULL`. When instructor role lands, the column's semantic meaning changes from "always an admin" to "admin OR course-instructor." RLS policy needs a parallel branch. Example SQL sketch:

```sql
-- v0.2 instructor-role announcement authorship policy
CREATE POLICY announcements_instructor_write ON public.announcements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.instructor_courses ic
      WHERE ic.instructor_id = auth.uid() AND ic.course_id = announcements.course_id
    )
  ) WITH CHECK (...same as USING...);
```

**Depends on / blocked by:** v0.2 instructor-role feature work. Not blocking v0.1.

---

## TODO 7 — Pin `superfly/flyctl-actions/setup-flyctl@master` to a commit SHA

**What:** Replace `uses: superfly/flyctl-actions/setup-flyctl@master` in `.github/workflows/deploy-backend.yml:29` with a commit-SHA pin (e.g. `@fc58fcb9...` with the tag in a trailing comment).

**Why:** `@master` is a mutable ref on a third-party action. Whoever controls that branch can ship new code the next time the workflow runs, and the deploy runner holds `FLY_API_TOKEN` — full production access. Same failure mode as the tj-actions/changed-files compromise (March 2025). This is the single highest-risk item in the repo right now.

**Pros:** Five-minute PR. Zero runtime risk (SHA-pinning never breaks builds, only freezes them).

**Cons:** Loses automatic upstream updates. Rebump manually when upstream cuts a new flyctl version.

**Context:** Flagged HIGH by `/cso` audit 2026-04-22 (see `.gstack/cso-reports/cso-2026-04-22.md` F-1). Get the current SHA with `gh api repos/superfly/flyctl-actions/commits/master --jq .sha`.

**Depends on / blocked by:** Nothing. Should happen before first Fly.io deploy.

---

## TODO 8 — Pin `oven-sh/setup-bun@v2` to a commit SHA in CI

**What:** Replace `uses: oven-sh/setup-bun@v2` in `.github/workflows/ci.yml` with a commit-SHA pin.

**Why:** Same supply-chain pattern as TODO 7. Lower blast radius (CI runner has no prod creds), but a compromised build action can tamper with artifacts, inject test bypasses, or modify the lockfile in flight.

**Pros:** Same as TODO 7 — trivial change, freezes build behavior.

**Cons:** Same as TODO 7.

**Context:** Flagged MEDIUM by `/cso` 2026-04-22 (F-2). Do at the same time as TODO 7 — one PR pins both.

**Depends on / blocked by:** Nothing.

---

## TODO 9 — Wire `hono-rate-limiter` on `/api/auth/*` before pilot launch

**What:** Add `hono-rate-limiter` to `apps/backend/package.json`, create `apps/backend/src/middleware/rate-limit.ts` with a 15-minute window / 20-attempts-per-IP limiter, and mount it in `app.ts` before `app.route('/api/auth', authRoutes)`. The env vars `RATE_LIMIT_MAX`, `_WINDOW_MS`, `_AUTH_MAX`, `_UPLOAD_MAX` already validate at boot — wire the middleware to consume them.

**Why:** Blueprint §5.5 + §18 require in-memory rate limiting for v1. It's not wired. `/api/auth/login` and `/api/auth/register` are wide open. Register uses the service-role client (via `supabase.auth.admin.createUser`), which bypasses Supabase's own anon-client throttle entirely. Credential stuffing and email enumeration are the two scans every new public auth surface gets within hours of going live.

**Pros:** 20-minute PR. Cheapest defense-in-depth we can buy. Supabase's own rate limit on `signInWithPassword` helps but isn't per-IP under our backend's reverse-proxy setup.

**Cons:** In-memory state is per-process — won't coordinate across Fly.io machines when we scale beyond one. Pilot runs on one machine, so fine until that changes.

**Context:** Flagged MEDIUM by `/cso` 2026-04-22 (F-3). Blueprint said do-this-from-day-one. We didn't. Pilot users are tens of requests per day so the miss is low-impact today, but the moment a public URL exists, bots find it.

**Depends on / blocked by:** Nothing. Do before Phase 8 deploy goes live.

---

## TODO 10 — Document (or fix) `/api/auth/register` email enumeration

**What:** `/api/auth/register` returns `409 EMAIL_TAKEN` when an email already has an account, enabling attackers to probe whether a given email is registered. Either (a) add this to `docs/DIVERGENCES.md` as an accepted v0.1 tradeoff, or (b) gate register behind an admin-issued invite token until email confirmation lands in v0.2.

**Why:** v0.1 explicitly skips email confirmation (per blueprint §2.1), so the "proper" fix (return 200 + send password-reset email on collision) isn't available. For a closed pilot with a few tuition centers, the leak is low-impact. For a public launch, it's Medium. Named risk is better than silent risk.

**Pros:** (a) is a 5-minute doc change. (b) is a ~1 day auth workflow change but closes the hole for public launch.

**Cons:** (b) adds signup friction during pilot — not worth it for a closed audience.

**Context:** Flagged LOW by `/cso` 2026-04-22 (F-4). Login endpoint correctly returns a generic error — no enumeration on that path. The gap is register-only.

**Depends on / blocked by:** Nothing. Pick (a) now, revisit (b) when email confirmation lands in v0.2+.

---

## Format

Each TODO has What, Why, Pros, Cons, Context, and Depends-on per `review/TODOS-format.md`. Add new TODOs by following the same shape. Keep the list short — if it grows past 20 items, either something is architecturally off or the TODOs need to be grouped.
