# Ops: Monitoring setup

Provisioning checklist for the v0.1 pilot launch. Most items here are blocked
on external accounts being set up (Fly.io, Grafana Cloud, Better Uptime). This
doc is concrete enough to hand to whoever provisions those accounts so they
don't have to re-derive what we need.

**Targets** (per blueprint §5.1 and §5.3):

- API p95 ≤ 300ms
- 99.9% monthly uptime (≤ 43 min downtime/month)
- p95 DB query ≤ 50ms
- Assignment upload success rate ≥ 99%

---

## 1. Fly.io

### Apps

Two apps, both in `sin` (Singapore) region for proximity to Sri Lankan users
and our Supabase project in `ap-southeast-1`.

- `otls-backend` — Bun + Hono. 1 replica for v0.1 (design-doc trim from
  blueprint §5.3's min-2). Scale to 2 if p95 degrades.
- `otls-frontend` — Next.js (or Vercel — the design doc is open on which).
  If Fly, 1 replica, same region.

### Health checks

Backend exposes `GET /health` which returns 200 only when Supabase is reachable:

```json
{
  "ok": true,
  "db_reachable": true,
  "db_latency_ms": 178,
  "profiles_count": 3,
  "timestamp": "2026-04-22T10:38:21.794Z"
}
```

`fly.toml` should configure:

```toml
[[http_service.checks]]
  grace_period = "10s"
  interval = "30s"
  method = "get"
  timeout = "5s"
  path = "/health"
```

### Secrets (not committed — set via `fly secrets set`)

Backend:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FRONTEND_URL`
- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `NODE_ENV=production`
- `SENTRY_DSN`, `SENTRY_ENVIRONMENT=production` (once Sentry lands)

Frontend:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL` (points at the backend app's public URL)

### Log drain

Fly logs → either Grafana Cloud (via agent) or a log aggregator of choice.
`fly logs` is fine for debugging but not for alerting or retention.

---

## 2. Grafana Cloud — dashboards and alerts

### Prometheus metrics the backend should export

None, as of v0.1. The backend has no metrics endpoint yet. Three paths forward
in priority order:

1. **Log-based metrics (easiest)**: Grafana Cloud can derive counters and
   latency histograms from structured logs. No code change. Recommended
   starting point.
2. **Hono prometheus middleware**: add `hono-prom` or equivalent, expose
   `/metrics`, scrape from Fly. Moderate work.
3. **OpenTelemetry**: full tracing + metrics. Phase 7+ or v0.2.

For v0.1 pilot: go with log-based metrics. When traffic justifies it, upgrade.

### Dashboard: "OTLS v0.1"

Panels (from logs or Prometheus once it lands):

| Panel | Source | Query sketch |
|---|---|---|
| **RPS by route** | logs | `count by route, method` over 1m window |
| **p50/p95/p99 latency by route** | logs | `histogram_quantile(0.95, rate(request_duration_ms_bucket[5m]))` |
| **5xx rate** | logs | `sum(rate(5xx[1m])) / sum(rate(requests[1m]))` |
| **4xx breakdown by code** | logs | split by `error.code` from our error envelope |
| **Assignment upload success** | logs | `POST /api/assignments` 201 count vs 4xx/5xx |
| **TUS upload errors at Supabase** | logs | capture client-side `onError` events via Sentry (requires Sentry) |
| **Announcement publish rate** | logs | `POST /api/announcements` 201 count, 24h view |
| **JWT verify failures** | logs | `UNAUTHORIZED` count with `auth.ts` source |
| **Active enrollments** | DB query panel | `SELECT count(*) FROM enrollments WHERE status='approved'` |
| **Assignments submitted today** | DB query panel | `SELECT count(*) FROM assignments WHERE submitted_at > current_date` |
| **Supabase DB p95 query time** | Supabase | exposed via Supabase's metrics endpoint |

### Alerts

All alerts page the on-call engineer during business hours (07:00-21:00
Asia/Colombo); warn-only outside that window unless severity=critical.

| Alert | Condition | Severity |
|---|---|---|
| Backend 5xx spike | `rate(5xx) > 0.01` over 5m | critical |
| Backend down | `/health` failing 3 consecutive Fly checks | critical |
| Frontend down | home page returns non-200 for 2 consecutive Better Uptime checks | critical |
| p95 latency breach | `p95 > 300ms` over 10m on authenticated routes | warning |
| JWT verify failures spike | > 20 failures/min sustained 3 min | warning (likely JWKS outage) |
| Upload failure rate | register endpoint 4xx+5xx > 5% over 10m | warning |
| DB connection errors | `PGRST` or connection timeouts in logs | critical |

---

## 3. Better Uptime — status page + external monitoring

### Monitors

Public-facing probes from multiple regions. Recommended: Singapore, Mumbai,
Frankfurt (Frankfurt as a geographically-independent control).

| Monitor | URL | Method | Expected | Interval |
|---|---|---|---|---|
| Frontend landing | `https://<frontend>/` | GET | 200, body contains "OTLS" or similar | 60s |
| Frontend login | `https://<frontend>/login` | GET | 200 | 5m |
| Backend health | `https://<backend>/health` | GET | 200, JSON body `ok: true` AND `db_reachable: true` | 60s |
| Backend API root | `https://<backend>/` | GET | 200 | 5m |
| Public course catalog | `https://<backend>/api/courses` | GET | 200 (anonymous allowed) | 5m |

### Status page

Public status page at `status.otls.example` (or subdomain of chosen). Show:

- Frontend health
- Backend API health
- Supabase status (subscribe to their status page as a dependency)

The tuition-center admin should know the status page URL. If OTLS is down,
that page tells them so — and tells them it's a known issue and someone's on it.

### Escalation

Primary: on-call engineer (SMS + email via Better Uptime integration).
Secondary: lead engineer after 5 minutes no-ack.
Tertiary: project lead after 15 minutes no-ack.

---

## 4. Sentry (error tracking)

Add to both apps. Backend: `@sentry/bun` or `@sentry/node` (works under Bun).
Frontend: `@sentry/nextjs`.

DSN lives in env:
- `SENTRY_DSN` (backend)
- `NEXT_PUBLIC_SENTRY_DSN` (frontend)
- `SENTRY_ENVIRONMENT=production|staging|development`

PII: scrub `email` and `full_name` from breadcrumbs and error context. Keep
`user_id` (UUID) for correlation. The `apps/backend/src/lib/redact.ts` helper
is the right place to extend.

Release tagging: on every deploy, set `SENTRY_RELEASE` to the git commit SHA
so errors are attributable to a specific release.

---

## 5. Structured logs

Today: Hono's default logger → stdout → Fly logs. Unstructured.

Goal: JSON logs with `request_id`, `user_id` (when authenticated), `route`,
`method`, `status`, `duration_ms`, `error.code` (on error), and a scrubbed
`msg`. This is what the Grafana log-based metrics derive from.

Implementation path (deferred to blueprint §7 polish phase):

1. Replace `hono/logger` with a custom middleware that emits JSON.
2. Add user_id from `c.get('userId')` when present.
3. `redact.ts` for email/name scrubbing.
4. Fly log drain → Grafana Cloud Loki.

---

## 6. Provisioning order

1. Fly.io accounts + apps + secrets → deploy
2. Better Uptime monitors → verify all green
3. Grafana Cloud account + agent on Fly → log ingestion working
4. Grafana dashboard "OTLS v0.1" with initial panels
5. Sentry projects (backend + frontend) + DSNs wired
6. Alert routing → test alert end-to-end (force a monitor DOWN and confirm page received)
7. Status page public + client admin knows URL

Don't skip step 6. A silent alert is worse than no alert.

---

## 7. Reference

- Blueprint §3 (availability + fault tolerance targets)
- Blueprint §5.1 (performance targets)
- Blueprint §5.3 (availability techniques)
- `ARCHITECTURE.md` (what needs monitoring and why)
- `docs/runbooks/first-hour.md` (what to watch during launch)
