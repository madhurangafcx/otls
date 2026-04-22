# Runbook: Rollback an announcement

An announcement went out that shouldn't have — wrong schedule, typo, posted to
the wrong course, confidential info, whatever. This runbook tells you how to
undo it, with the right path for the severity.

**Important:** OTLS is a teaching tool inside an already-WhatsApp-heavy
culture. If the admin clicked "Share via WhatsApp" on the announcement card
before realising, the message is already in WhatsApp groups. You cannot
unsend that. You can remove it from OTLS, but you will also need to post a
correction announcement (see the bottom of this runbook).

---

## Decision tree

```
 Was the announcement posted to the WRONG COURSE?
 │
 ├── Yes → soft delete + repost to correct course (see §1)
 │
 └── No → Does the content contain confidential/harmful information?
         │
         ├── Yes → hard delete + audit-log redaction (see §2)
         │
         └── No → soft delete via admin UI (see §1)
```

If the content is confidential (e.g. a private student name, a credential
that leaked), treat it as a security incident — go straight to §2 and tell
the project lead regardless of time.

---

## §1. Soft delete (normal path)

**Use when**: content is wrong but not harmful, and you want to keep the
audit trail (you almost always do).

### Steps

1. Log in as admin.
2. Navigate to `/admin/courses/{courseId}/announcements`.
3. Click **Delete** on the row. Confirm the prompt.
4. The UI hits `DELETE /api/announcements/:id` which sets
   `announcements.deleted_at = now()`.
5. The audit trigger fires and writes an `event_type='DELETE'` row to
   `announcement_events` with the full previous state in the diff.

### What students see

- Immediately: the announcement disappears from their course page and the
  `/my-courses` rail.
- The unread badge does NOT automatically decrement. The next time they load
  the course page, `last_announcement_read_at` is updated and the badge
  re-computes based on current announcements, which no longer includes this
  one.

### Restore if you deleted it by mistake

Soft delete is reversible. Connect to Supabase SQL Editor or psql:

```sql
-- Find the row (deleted_at IS NOT NULL, RLS policy filters it from students
-- but admins can see it via admin_all policy)
SELECT id, title, deleted_at
  FROM announcements
  WHERE course_id = '<course-uuid>'
    AND deleted_at IS NOT NULL
  ORDER BY deleted_at DESC;

-- Restore
UPDATE announcements
  SET deleted_at = NULL, updated_at = now()
  WHERE id = '<announcement-uuid>';
```

The UPDATE fires the audit trigger again, which writes an `event_type='UPDATE'`
row showing `deleted_at` going from a timestamp back to null. The full
history survives.

---

## §2. Hard delete (incident path)

**Use when**: content contains credentials, private student data, or
anything that cannot remain in the system — even in the audit trail.

This requires SQL access to production. Only the project lead or the
on-call engineer has this. Do not do this casually.

### Steps

1. Identify the announcement ID. From the admin UI, edit URL is
   `/admin/courses/{courseId}/announcements/{announcementId}` — the last
   segment is the ID. Or:

   ```sql
   SELECT id, course_id, title, created_at, author_id
     FROM announcements
     WHERE course_id = '<course-uuid>'
     ORDER BY created_at DESC
     LIMIT 10;
   ```

2. Take a snapshot of the audit trail BEFORE deleting, so you have a record
   for the incident report:

   ```sql
   SELECT * FROM announcement_events
     WHERE announcement_id = '<announcement-uuid>'
     ORDER BY created_at ASC;
   ```

   Paste this into the incident notes.

3. Hard delete — CASCADE via foreign key is NOT set on
   `announcement_events.announcement_id` (by design — events outlive the
   announcement). You'll delete the announcement row; events stay by default
   unless you want them gone too.

   ```sql
   -- Delete the announcement row
   DELETE FROM announcements WHERE id = '<announcement-uuid>';

   -- ONLY if the content also leaked into the audit table's `diff` JSONB
   -- and must be purged (e.g. a credential was in the body):
   DELETE FROM announcement_events WHERE announcement_id = '<announcement-uuid>';
   DELETE FROM announcement_events_errors WHERE announcement_id = '<announcement-uuid>';
   ```

4. The hard delete fires the audit trigger once more with `event_type='DELETE'`
   and the full OLD row in the diff. If you are NOT purging audit rows, this
   final event is your audit trail for the hard delete itself. If you ARE
   purging, delete it too along with the others.

5. File an incident note: what was leaked, who had access, what you purged,
   when. Keep this OUT of OTLS — use the project's incident channel.

### What students see

Identical to soft delete from their perspective. They cannot tell the
difference.

### Cannot be restored

Hard delete is irreversible through OTLS. You'd need a Supabase point-in-
time-restore to a moment before the delete, which restores the ENTIRE
database — not a surgical option for a running pilot. Don't hard delete
without being sure.

---

## §3. WhatsApp-already-sent correction

The `wa.me/?text=` share button on each announcement card generates a
WhatsApp message with the title, a 200-char excerpt, and a link back to the
course page in OTLS. That link is public-ish (anyone with an account and
enrollment in the course can see it). After deletion, the link 404s for the
student on the course page because the announcement is hidden — but the
WhatsApp message itself cannot be recalled.

### Correction flow

1. Soft-delete the original (§1) OR hard-delete (§2) depending on severity.
2. Post a correction announcement on the same course:
   - Title: "Correction: [original title]"
   - Body: explain what was wrong + what the correct information is. Keep
     it short. Do NOT restate the incorrect content — that just re-distributes it.
3. Pin the correction so it appears at the top for the next 24-48 hours.
4. (Optional) The client admin should post a short note in the relevant
   WhatsApp group so students who saw the original on WhatsApp see the
   correction without waiting for the OTLS badge.

Example correction body:

```
An announcement posted earlier today had the wrong exam date. The correct
date is Friday, 9 May, 10:00 AM, not Thursday. Sorry for the confusion —
please see the pinned announcement above for the current schedule.
```

---

## §4. What if the delete endpoint itself is broken?

Direct SQL still works:

```sql
-- Soft delete by hand
UPDATE announcements
  SET deleted_at = now(), updated_at = now()
  WHERE id = '<announcement-uuid>';
```

This fires the same audit trigger path the API would have. Note that the
trigger reads `auth.uid()` for `actor_id`; since you're connected as a
Supabase admin / service role, `actor_id` will be null. That's already the
case for API-driven writes in v0.1 — it's a known limitation, not new
breakage. Your incident note should record WHO ran the SQL.

---

## §5. Reference

- Schema: `supabase/migrations/0001_initial_schema.sql` (tables:
  `announcements`, `announcement_events`, `announcement_events_errors`)
- RLS: `supabase/migrations/0002_rls_policies.sql` (announcements section,
  ~line 165; audit section, ~line 185)
- Service: `apps/backend/src/modules/announcements/announcements.service.ts`
- Audit trigger: `log_announcement_event()` function, defined in the same
  migration at `apps/backend/../0001_initial_schema.sql` ~line 217
- Known limitation: `actor_id` is null for service-role writes.
  See `ARCHITECTURE.md §7` and §10.
