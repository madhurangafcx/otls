-- ============================================================================
-- OTLS v0.1 — Initial schema
-- Based on docs/blueprint.md §12.8 + design-doc + eng/design/CEO review amendments.
-- RLS policies live in 0002_rls_policies.sql (apply in order).
-- ============================================================================

-- ── Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- for gen_random_uuid()

-- ============================================================================
-- SHARED FUNCTIONS
-- ============================================================================

-- updated_at auto-update trigger function (reused across courses, announcements)
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- is_admin() lives in 0002_rls_policies.sql (after public.profiles exists).
-- LANGUAGE sql functions validate their body at CREATE time, so the table must
-- exist first.

-- ============================================================================
-- PROFILES
-- Mirrors auth.users 1:1 via the handle_new_user trigger.
-- ============================================================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'student')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on auth signup (blueprint §11.5)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'student'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- COURSES
-- ============================================================================

CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_courses_status ON public.courses(status);
CREATE INDEX idx_courses_created_at ON public.courses(created_at DESC);

CREATE TRIGGER courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- SEMESTERS
-- ============================================================================

CREATE TABLE public.semesters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  youtube_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_semesters_course ON public.semesters(course_id, sort_order);

-- ============================================================================
-- ENROLLMENTS
-- + last_announcement_read_at added per design-review amendment (unread badge loop)
-- ============================================================================

CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  last_announcement_read_at TIMESTAMPTZ,  -- design-review: powers unread badge on /my-courses
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, course_id)
);

CREATE INDEX idx_enrollments_student ON public.enrollments(student_id);
CREATE INDEX idx_enrollments_course ON public.enrollments(course_id);
CREATE INDEX idx_enrollments_status ON public.enrollments(status);

-- ============================================================================
-- ASSIGNMENTS
-- ============================================================================

CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT CHECK (file_type IN ('pdf', 'docx')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assignments_student ON public.assignments(student_id);
CREATE INDEX idx_assignments_semester ON public.assignments(semester_id);
CREATE INDEX idx_assignments_submitted ON public.assignments(submitted_at DESC);

-- ============================================================================
-- STUDENT_PROGRESS
-- Upserted as a side effect of assignment upload.
-- ============================================================================

CREATE TABLE public.student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  UNIQUE (student_id, semester_id)
);

CREATE INDEX idx_progress_student ON public.student_progress(student_id);

-- ============================================================================
-- ANNOUNCEMENTS (v0.1 NEW — thin admin-only announcements feed)
-- Design-doc amendments: author_id nullable + ON DELETE SET NULL, partial unique
-- index for single-pin-per-course, updated_at trigger.
-- ============================================================================

CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  pinned BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,  -- soft delete per CEO-review amendment
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_announcements_course_created
  ON public.announcements(course_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Single pinned announcement per course (enforced at DB level)
CREATE UNIQUE INDEX uniq_announcements_pinned_per_course
  ON public.announcements(course_id)
  WHERE pinned = true AND deleted_at IS NULL;

CREATE TRIGGER announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- ANNOUNCEMENT_EVENTS (v0.1 NEW — audit trail per eng-review CEO-review)
-- Every CREATE/UPDATE/DELETE on announcements writes a row here with a JSON diff.
-- ============================================================================

CREATE TABLE public.announcement_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID,  -- no FK cascade: event rows survive announcement deletion
  course_id UUID,
  event_type TEXT NOT NULL CHECK (event_type IN ('CREATE', 'UPDATE', 'DELETE')),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  diff JSONB,  -- {before: {...}, after: {...}} for UPDATE; full row for CREATE; {} for DELETE
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_announcement_events_announcement
  ON public.announcement_events(announcement_id, created_at DESC);
CREATE INDEX idx_announcement_events_course
  ON public.announcement_events(course_id, created_at DESC);

-- Fallback table for when audit-trigger itself fails. CEO-review requirement:
-- a broken audit trigger must NEVER block the primary write.
CREATE TABLE public.announcement_events_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID,
  event_type TEXT,
  error_message TEXT,
  sqlstate TEXT,
  actor_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit trigger — wraps INSERT in EXCEPTION block so trigger failure NEVER blocks
-- the primary INSERT/UPDATE/DELETE on announcements.
CREATE OR REPLACE FUNCTION public.log_announcement_event()
RETURNS TRIGGER AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_event_type TEXT;
  v_diff JSONB;
  v_announcement_id UUID;
  v_course_id UUID;
BEGIN
  -- Determine event type + capture diff
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'CREATE';
    v_diff := to_jsonb(NEW);
    v_announcement_id := NEW.id;
    v_course_id := NEW.course_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Soft delete counts as DELETE event, not UPDATE
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      v_event_type := 'DELETE';
      v_diff := jsonb_build_object('deleted_at', NEW.deleted_at, 'was', to_jsonb(OLD));
    ELSE
      v_event_type := 'UPDATE';
      v_diff := jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW));
    END IF;
    v_announcement_id := NEW.id;
    v_course_id := NEW.course_id;
  ELSIF TG_OP = 'DELETE' THEN
    v_event_type := 'DELETE';
    v_diff := to_jsonb(OLD);
    v_announcement_id := OLD.id;
    v_course_id := OLD.course_id;
  END IF;

  -- Wrap in EXCEPTION block — audit failure writes to fallback, never propagates.
  BEGIN
    INSERT INTO public.announcement_events
      (announcement_id, course_id, event_type, actor_id, diff)
    VALUES
      (v_announcement_id, v_course_id, v_event_type, v_actor, v_diff);
  EXCEPTION WHEN OTHERS THEN
    -- Last-resort fallback. If THIS also fails, we swallow — audit is non-essential.
    BEGIN
      INSERT INTO public.announcement_events_errors
        (announcement_id, event_type, error_message, sqlstate, actor_id)
      VALUES
        (v_announcement_id, v_event_type, SQLERRM, SQLSTATE, v_actor);
    EXCEPTION WHEN OTHERS THEN
      -- Give up quietly. Primary write is sacred.
      NULL;
    END;
  END;

  -- Return NEW on INSERT/UPDATE, OLD on DELETE
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER announcements_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.log_announcement_event();

-- ============================================================================
-- SEMESTER_VIEWS (v0.1 NEW — telemetry for Pillar 1 success metric)
-- Per-student-per-semester-per-day view log. Powers "recording usage" metric.
-- ============================================================================

CREATE TABLE public.semester_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
  viewed_on DATE NOT NULL DEFAULT CURRENT_DATE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, semester_id, viewed_on)
);

CREATE INDEX idx_semester_views_student_date ON public.semester_views(student_id, viewed_on DESC);
CREATE INDEX idx_semester_views_semester_date ON public.semester_views(semester_id, viewed_on DESC);
