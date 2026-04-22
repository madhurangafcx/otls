# Deploy runbook — Phase 8

End-to-end steps to get OTLS live in prod. Three moving pieces: a production
Supabase project, the Bun backend on Fly.io, the Next.js frontend on Vercel.

Assumes fresh accounts. Time estimate: **90 minutes** start-to-finish if nothing
goes sideways. Domain wiring adds another ~30 min after DNS propagates.

---

## 0. Prerequisites (one-time)

```bash
# Fly CLI
brew install flyctl
fly auth signup        # or `fly auth login` if you already have an account

# Supabase CLI (for running migrations against prod)
brew install supabase/tap/supabase
supabase login
```

Vercel only needs a browser — no CLI required.

---

## 1. Production Supabase project

The dev project (`xbmaowwgpharieuhjqsx`) stays as dev. **Create a fresh project
for pilot traffic** — separate DB, separate storage, separate keys. Mixing dev
and prod data is the #1 way to lose pilot trust the first time you reset
something.

1. Go to https://supabase.com/dashboard → **New project**.
2. Name it `otls-prod`. Pick the region closest to your pilot users
   (Singapore = `sin` if SL-based).
3. Save the DB password in your password manager immediately. You won't see it
   again.
4. Wait ~2 minutes for provisioning.

### 1a. Link + push migrations

```bash
cd /path/to/otls
supabase link --project-ref <PROD_PROJECT_REF>   # from the project's URL
supabase db push
```

This applies `0001_initial_schema.sql`, `0002_rls_policies.sql`,
`0003_storage_bucket.sql` in order. The third creates the `assignments` storage
bucket with the right limits/MIME types.

### 1b. Create the first admin user

Admin accounts are manual per blueprint §16.1. On the prod project SQL editor:

```sql
-- After signing up through the live frontend, flip the role:
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your-admin@example.com';
```

You won't have an admin to flip until step 4's smoke test. That's fine — circle
back.

### 1c. Google OAuth (optional for v0.1, required for pilot UX)

If you want the "Continue with Google" button to actually work:

1. Supabase dashboard → Authentication → Providers → Google → Enable.
2. Configure OAuth credentials via Google Cloud Console (matches the redirect
   URI shown in the provider form).
3. Set the allowed redirect in Supabase → Authentication → URL Configuration →
   `https://<your-vercel-url>/auth/callback`.

---

## 2. Backend to Fly.io

### 2a. First launch

```bash
cd apps/backend
fly launch --no-deploy --copy-config --name otls-backend
```

`--no-deploy` lets us set secrets before the first deploy. `--copy-config` uses
the `fly.toml` we already wrote.

Pick the same region as Supabase (e.g., `sin`). Decline the Postgres offer
(we're using Supabase, not Fly Postgres). Decline the Redis offer (no Redis in
v1).

### 2b. Set secrets

Pull these four from your **prod** Supabase dashboard → Settings → API:

```bash
cd apps/backend
fly secrets set \
  SUPABASE_URL="https://<PROD_REF>.supabase.co" \
  SUPABASE_ANON_KEY="eyJ..." \
  SUPABASE_SERVICE_ROLE_KEY="eyJ..." \
  SUPABASE_JWT_SECRET="<prod jwt secret>" \
  JWT_ISSUER="https://<PROD_REF>.supabase.co/auth/v1" \
  FRONTEND_URL="https://otls.vercel.app"  # placeholder, update after step 3
```

`JWT_ISSUER` is your Supabase auth base URL — the backend's `jose` verifier
uses it to fetch JWKS for JWT validation. `SUPABASE_JWT_SECRET` is only
needed if your project still uses legacy HS256 tokens; new projects use
asymmetric keys and can leave it unset.

**The service-role key is a god-mode credential. Never commit it, never put it
in a frontend env, never paste it in Slack.**

### 2c. Deploy

```bash
fly deploy --config fly.toml --dockerfile Dockerfile ../..
```

The trailing `../..` is important — the Docker build context is the repo root
because the Dockerfile copies `package.json` + `bun.lock` from there.

Watch the build logs. First deploy takes ~3 minutes (install + copy + boot).
Successful deploy ends with:
```
==> Monitoring deployment
 ✓ Machine <id> reached state 'started'
```

### 2d. Verify

```bash
curl https://otls-backend.fly.dev/health
# Expect: {"ok":true,"db_reachable":true,"db_latency_ms":<N>,...}
```

If `db_reachable: false`, the secrets are wrong — re-run step 2b and
`fly deploy` again.

### 2e. (Later) Enable auto-deploy on push

Once you have a Fly API token:
```bash
fly tokens create deploy -x 999999h   # long-lived deploy token
```

Paste it into GitHub → Repo Settings → Secrets → Actions → `FLY_API_TOKEN`.
Now `.github/workflows/deploy-backend.yml` triggers automatically on main
pushes that touch `apps/backend/**`.

---

## 3. Frontend to Vercel

Vercel auto-detects Next.js in a monorepo and handles the build itself.

1. https://vercel.com/new → import your GitHub repo.
2. **Root Directory:** `apps/frontend`. Critical — Vercel defaults to repo root
   which won't find `next.config.mjs`.
3. Framework preset: Next.js (auto-detected).
4. Build command: leave default (`next build`).
5. Install command: `bun install --frozen-lockfile` (override from `npm install`).
6. **Environment Variables** (add under Settings → Environment Variables):

   | Name | Value | Scope |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://<PROD_REF>.supabase.co` | Production |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` (anon key, NOT service-role) | Production |
   | `NEXT_PUBLIC_API_URL` | `https://otls-backend.fly.dev` | Production |
   | `NEXT_PUBLIC_APP_URL` | `https://otls.vercel.app` | Production |

7. Click **Deploy**. First build ~2 minutes.

### 3a. Update CORS on the backend

Now that the frontend URL is real, update the backend CORS allowlist:

```bash
cd apps/backend
fly secrets set FRONTEND_URL="https://otls.vercel.app"
# fly auto-restarts on secret change
```

### 3b. Update Supabase redirect URL

Supabase dashboard → Authentication → URL Configuration:
- **Site URL:** `https://otls.vercel.app`
- **Redirect URLs:** add `https://otls.vercel.app/auth/callback`

Without this, Google OAuth bounces to a broken localhost redirect.

---

## 4. Smoke test in prod

Rough happy-path tour. Each step is a real failure mode that bit us in dev.

1. **Sign up a test student** at `https://otls.vercel.app/register` → create
   account → land on `/my-courses` (empty).
2. **Flip yourself to admin** via the SQL snippet in step 1b.
3. **Create a course** at `/admin/courses/new` → add a semester with a
   YouTube URL → publish.
4. **Log in as a different test student** → enroll in the published course.
5. **Flip back to admin** → `/admin/enrollments` → approve the enrollment.
6. **As the student**, open the course → click the semester → upload a small
   PDF. Dropzone should cycle: idle → uploading → success, with CircleCheck
   and "Semester marked complete".
7. **Verify progress** in `/my-courses` → course card shows 100% or the
   right fraction.
8. **As admin**, `/admin/assignments` → see the new row with Course, Semester,
   Student, File all populated. Click Download → PDF opens in a new tab.

If any step fails, the most likely culprits:
- Wrong env var wire-up (step 2b / step 3)
- Wrong redirect URL in Supabase (step 3b)
- Storage bucket RLS policy not applied (re-run `supabase db push`)

---

## 5. Post-deploy

- **Monitoring:** follow `docs/ops/monitoring-setup.md` for Better Uptime +
  Axiom hookup.
- **First-hour checklist:** `docs/runbooks/first-hour.md`.
- **Rollback:** `docs/runbooks/rollback-announcements.md` for the announcement
  soft-delete path. For a full backend rollback: `fly releases` →
  `fly releases rollback <version>`.

---

## Custom domain (optional, later)

Once the `*.vercel.app` and `*.fly.dev` URLs are stable, wire a real domain:

1. Vercel → Settings → Domains → add `edulearn.example.com`. Vercel hands you
   a CNAME to set with your registrar.
2. Fly → `fly certs add api.edulearn.example.com` → set the AAAA + A records
   Fly prints.
3. Update `NEXT_PUBLIC_API_URL` in Vercel + `FRONTEND_URL` in Fly secrets to
   the new domains. Both auto-redeploy.
4. Update Supabase Site URL + Redirect URLs to match.

DNS propagation is 5-30 min typically.
