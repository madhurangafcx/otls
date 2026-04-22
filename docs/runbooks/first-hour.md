# Runbook: First hour of the pilot

Owner: on-call engineer for the launch window (tuition center's working hours,
typically 07:00-21:00 Asia/Colombo).

This runbook covers the first 60 minutes after you switch OTLS on for the
tuition-center pilot. Goal: catch issues before a student or admin notices,
and have clear rollback hatches if something's wrong.

---

## T-24h: pre-launch checklist

Work through this the day before. All items MUST be green.

### Infrastructure

- [ ] Supabase Cloud project provisioned in `ap-southeast-1` (Singapore), Pro tier
- [ ] Backend deployed to Fly.io (`otls-backend`, `sin` region)
- [ ] Frontend deployed to Vercel (or Fly.io, whichever chosen)
- [ ] Cloudflare DNS configured for the custom domain, TLS active
- [ ] `ap-southeast-1` Postgres backups enabled, retention ≥ 7 days
- [ ] Storage bucket `assignments` exists, PRIVATE, 25 MB max, PDF+DOCX only

### Secrets

- [ ] `SUPABASE_SERVICE_ROLE_KEY` set in backend Fly secrets ONLY
- [ ] `SUPABASE_URL` + `SUPABASE_ANON_KEY` set on both apps
- [ ] `JWT_ISSUER`, `JWT_AUDIENCE` set on backend
- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL` set on frontend
- [ ] `FRONTEND_URL` on backend matches the frontend's public domain (CORS)
- [ ] `SENTRY_DSN` + `SENTRY_ENVIRONMENT=production` set on both (if Sentry is live)

### Data

- [ ] Admin user created + promoted to `admin` via SQL:
      `UPDATE profiles SET role='admin' WHERE email='owner@tuition-center.example';`
- [ ] At least one course created, with ≥ 1 semester, each with a valid YouTube URL
- [ ] Course published (so students can request enrollment)
- [ ] Test student account created, enrollment requested + approved, test assignment uploaded — verify admin sees it in `/admin/assignments`
- [ ] First announcement posted on the flagship course — verify it renders in the student feed

### Observability (Phase 7)

- [ ] Fly log drain or Grafana Cloud agent running, receiving logs
- [ ] Grafana dashboard "OTLS v0.1" exists with the panels in `docs/ops/monitoring-setup.md`
- [ ] Better Uptime monitors configured per `docs/ops/monitoring-setup.md` and all green
- [ ] Alert routing verified with a manual test alert (you got paged when the test monitor was forced DOWN)

### Client-side

- [ ] Tuition-center admin has their credentials, logged in at least once
- [ ] Admin has been walked through: creating an announcement, pinning one, reviewing an enrollment, downloading a submitted assignment
- [ ] Support channel agreed (WhatsApp number or email) — admin knows how to reach you

### Rollback

- [ ] You know how to revert the frontend/backend deploy (Fly.io: `fly releases list` + `fly releases rollback`)
- [ ] You know how to soft-delete announcements if needed (see `docs/runbooks/rollback-announcements.md`)
- [ ] Supabase point-in-time-restore window confirmed

---

## T-0: launch

Flip DNS / announce to students / whatever the launch moment is. Start timer.

Keep these open in tabs:

1. Grafana "OTLS v0.1" dashboard
2. Better Uptime status page
3. Fly logs for the backend: `fly logs -a otls-backend`
4. The admin UI logged in as admin, on `/admin/courses`
5. A student test account on `/my-courses`
6. Support channel (WhatsApp / email)

---

## Monitoring windows

### First 5 minutes

Watch for the cold-start spike. Focus on:

- **5xx rate** in the last 1 minute. Expect 0. Any 5xx → triage immediately.
- **JWT verification failures** in logs. A handful are normal (user opens app,
  token expired). A flood means JWKS is unreachable — check `SUPABASE_URL` on
  the backend.
- **CORS errors** in the browser console. If the `FRONTEND_URL` env on the
  backend doesn't match the actual frontend origin, every authenticated
  request fails. Fix: set the env + redeploy.

### First 15 minutes

- **First login (not seeded admin)**. When a real student signs up, check:
  `SELECT id, email, role FROM profiles ORDER BY created_at DESC LIMIT 5;`
  A row must appear. If not, the `handle_new_user` trigger in the migration
  is broken (reference: blueprint §11.5). Verify with
  `SELECT tgname FROM pg_trigger WHERE tgrelid='auth.users'::regclass;`
- **First enrollment request**. Student POSTs `/api/enrollments`. Row appears
  with `status='pending'`. Admin sees it in `/admin/courses/:id/enrollments`.
- **First assignment upload**. This is the highest-risk flow:
  - TUS upload hits `${SUPABASE_URL}/storage/v1/upload/resumable`. Watch for
    400s (chunk size wrong) or 401s (JWT issue).
  - Magic byte sniff happens server-side. If the student uploads a non-PDF
    renamed `.pdf`, expect `422 INVALID_FILE_CONTENT` — that's correct.
  - `student_progress` row appears after submission. Verify:
    `SELECT * FROM student_progress WHERE student_id='...' ORDER BY completed_at DESC LIMIT 1;`

### First 30-60 minutes

- **Announcement flow**. Admin posts. Check:
  - Row appears in `announcements` with correct `course_id`, `author_id`, `pinned` flag.
  - Row appears in `announcement_events` with `event_type='CREATE'`. (Note:
    `actor_id` will be null — known v0.1 limitation. The announcement's
    `author_id` column captures the creator.)
  - Student on the course page sees it.
  - Student on `/my-courses` sees the unread badge increment.
  - Loading the course page clears the badge on next `/my-courses` load
    (check: `SELECT last_announcement_read_at FROM enrollments WHERE student_id='...'`
    after the student viewed the course).
- **WhatsApp share**. Click the Share button on an announcement card. Verify
  the `wa.me/?text=` link opens WhatsApp (mobile) or WA Web (desktop) with
  the title + excerpt + course link pre-filled.

---

## Failure modes and responses

| Symptom | Likely cause | Action |
|---|---|---|
| `5xx` spike on `/api/*` | Backend crash or DB connection exhaustion | `fly logs` for stack trace; `fly status` for instance health; scale up to 2 replicas if DB OK: `fly scale count 2 -a otls-backend` |
| Login/register both 500 | Supabase Auth unreachable OR wrong JWT issuer | Check `SUPABASE_URL` env + Supabase status page |
| `/api/auth/*` returns `UNAUTHORIZED` on valid tokens | JWKS URL wrong or clock skew | Hit `${SUPABASE_URL}/auth/v1/.well-known/jwks.json` directly; verify `JWT_ISSUER` matches |
| Assignment upload fails at TUS stage | Chunk size wrong | Confirm client is sending 6 MB chunks (code default); anything else is a bug in `upload-dropzone.tsx` |
| Assignment upload fails at register stage with `PATH_MISMATCH` | Client built the wrong path | Check path is `{student_id}/{semester_id}/{unix_ms}_{name}` and student_id is the logged-in user |
| Announcements don't appear for approved students | RLS misconfigured OR enrollment not `approved` | `SELECT status FROM enrollments WHERE student_id='...' AND course_id='...'` |
| Unread badge never clears | `last_announcement_read_at` update failing silently | Check backend logs for `[announcements.markReadForStudent]` warnings |
| Admin can't delete course/announcement | Role check failing | Verify `SELECT role FROM profiles WHERE id='...'` returns `admin`; note service restarts preserve role but token may need refresh |

---

## Escalation

- Minor (< 5% of users affected, workaround exists): note in log, fix in next
  deploy window. Tell the client admin.
- Moderate (10-25% affected, degraded): consider rollback. Wake the lead
  engineer if outside business hours.
- Severe (site-wide 5xx, data loss suspected, or security): immediate rollback
  + page everyone on the incident channel + tell the client admin to pause
  communicating new enrollments to students until resolved.

Rollback hatch:

```bash
# Backend
fly releases list -a otls-backend
fly releases rollback <previous-version> -a otls-backend

# Frontend (Vercel)
vercel rollback <deployment-url>

# Announcements — see docs/runbooks/rollback-announcements.md
```

---

## After the first hour

- Write a short end-of-first-hour note: what shipped, what we saw, any surprises.
- Decide: continue watching through the rest of the admin's workday, or stand
  down to ambient monitoring.
- Schedule a check-in with the client admin tomorrow morning: what was the
  student reception, anything confusing, any bug reports.
- File a note against `TODOS.md` for any friction seen.
