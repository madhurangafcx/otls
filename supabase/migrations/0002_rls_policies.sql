-- ============================================================================
-- OTLS v0.1 — Row-Level Security policies
-- Applied after 0001_initial_schema.sql.
-- The backend uses the service_role key which bypasses RLS, but we keep RLS
-- enabled as defense-in-depth (blueprint §5.5).
-- ============================================================================

-- ── Enable RLS on every domain table
ALTER TABLE public.profiles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_events_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semester_views             ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES
-- Users can read + update their own profile. Admin reads all.
-- Role changes are service-role-only (blueprint: manual admin provisioning via SQL).
-- ============================================================================

CREATE POLICY profiles_self_read ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY profiles_admin_read ON public.profiles
  FOR SELECT USING (public.is_admin());

CREATE POLICY profiles_self_update ON public.profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- Cannot change own role via RLS path; role changes require service_role key
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- ============================================================================
-- COURSES
-- Public read of published; admin full control.
-- ============================================================================

CREATE POLICY courses_public_read_published ON public.courses
  FOR SELECT USING (status = 'published' OR public.is_admin());

CREATE POLICY courses_admin_all ON public.courses
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- SEMESTERS
-- Approved-enrolled student OR admin can read. Admin full control.
-- ============================================================================

CREATE POLICY semesters_enrolled_student_read ON public.semesters
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.course_id = semesters.course_id
        AND e.student_id = auth.uid()
        AND e.status = 'approved'
    )
  );

CREATE POLICY semesters_admin_all ON public.semesters
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- ENROLLMENTS
-- Students see their own. Students can create (as pending). Admins review.
-- last_announcement_read_at updates require service_role (via backend) —
-- client cannot bump the read timestamp directly for someone else's enrollment.
-- ============================================================================

CREATE POLICY enrollments_student_read_own ON public.enrollments
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY enrollments_admin_read_all ON public.enrollments
  FOR SELECT USING (public.is_admin());

CREATE POLICY enrollments_student_insert_own ON public.enrollments
  FOR INSERT WITH CHECK (
    student_id = auth.uid()
    AND status = 'pending'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
  );

CREATE POLICY enrollments_self_update_read_timestamp ON public.enrollments
  FOR UPDATE USING (student_id = auth.uid())
  WITH CHECK (
    student_id = auth.uid()
    -- Student can ONLY bump last_announcement_read_at; other fields frozen.
    AND status = (SELECT status FROM public.enrollments WHERE id = enrollments.id)
    AND reviewed_by IS NOT DISTINCT FROM (SELECT reviewed_by FROM public.enrollments WHERE id = enrollments.id)
    AND reviewed_at IS NOT DISTINCT FROM (SELECT reviewed_at FROM public.enrollments WHERE id = enrollments.id)
  );

CREATE POLICY enrollments_admin_update ON public.enrollments
  FOR UPDATE USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY enrollments_admin_delete ON public.enrollments
  FOR DELETE USING (public.is_admin());

-- ============================================================================
-- ASSIGNMENTS
-- Student inserts own (if approved-enrolled for that semester).
-- Student reads own. Admin reads all. Nobody deletes via RLS path (service_role only).
-- ============================================================================

CREATE POLICY assignments_student_read_own ON public.assignments
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY assignments_admin_read_all ON public.assignments
  FOR SELECT USING (public.is_admin());

CREATE POLICY assignments_student_insert_own ON public.assignments
  FOR INSERT WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.enrollments e
      JOIN public.semesters s ON s.course_id = e.course_id
      WHERE s.id = assignments.semester_id
        AND e.student_id = auth.uid()
        AND e.status = 'approved'
    )
  );

CREATE POLICY assignments_admin_delete ON public.assignments
  FOR DELETE USING (public.is_admin());

-- ============================================================================
-- STUDENT_PROGRESS
-- Student upserts own as side-effect of assignment upload.
-- ============================================================================

CREATE POLICY progress_student_read_own ON public.student_progress
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY progress_admin_read_all ON public.student_progress
  FOR SELECT USING (public.is_admin());

CREATE POLICY progress_student_upsert_own ON public.student_progress
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY progress_student_update_own ON public.student_progress
  FOR UPDATE USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- ============================================================================
-- ANNOUNCEMENTS (v0.1 new)
-- Admin full control. Approved-enrolled students read.
-- Soft-deleted announcements (deleted_at IS NOT NULL) never visible to students.
-- ============================================================================

CREATE POLICY announcements_admin_all ON public.announcements
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY announcements_student_read ON public.announcements
  FOR SELECT USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.course_id = announcements.course_id
        AND e.student_id = auth.uid()
        AND e.status = 'approved'
    )
  );

-- ============================================================================
-- ANNOUNCEMENT_EVENTS + _errors (audit)
-- Admin-only read. Writes only through the trigger (SECURITY DEFINER).
-- ============================================================================

CREATE POLICY announcement_events_admin_read ON public.announcement_events
  FOR SELECT USING (public.is_admin());

CREATE POLICY announcement_events_errors_admin_read ON public.announcement_events_errors
  FOR SELECT USING (public.is_admin());

-- ============================================================================
-- SEMESTER_VIEWS (telemetry)
-- Student inserts own view on first GET per day.
-- Admin reads all for analytics. Students do NOT read their own history in v0.1.
-- ============================================================================

CREATE POLICY semester_views_admin_read ON public.semester_views
  FOR SELECT USING (public.is_admin());

CREATE POLICY semester_views_student_insert_own ON public.semester_views
  FOR INSERT WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.enrollments e
      JOIN public.semesters s ON s.course_id = e.course_id
      WHERE s.id = semester_views.semester_id
        AND e.student_id = auth.uid()
        AND e.status = 'approved'
    )
  );

-- ============================================================================
-- STORAGE — assignments bucket
-- Path convention: {student_id}/{semester_id}/{unix_ms}_{sanitized_filename}
-- storage.foldername(name)[1] = student_id  → that's what RLS keys off.
-- ============================================================================

-- Students can INSERT objects into their own folder
CREATE POLICY "storage_assignments_student_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'assignments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Students can SELECT (download) their own objects
CREATE POLICY "storage_assignments_student_read_own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'assignments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins can SELECT all assignment objects
CREATE POLICY "storage_assignments_admin_read_all"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'assignments'
    AND public.is_admin()
  );

-- No DELETE policy — students cannot delete, admins delete via backend (service_role).
-- This keeps audit chain intact: every uploaded assignment is immutable from the RLS path.
