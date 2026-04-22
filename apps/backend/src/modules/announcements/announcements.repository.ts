import { supabase } from '../../config/supabase';

export type AnnouncementRow = {
  id: string;
  course_id: string;
  author_id: string | null;
  title: string;
  body: string;
  pinned: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AnnouncementWithAuthor = AnnouncementRow & {
  author: { id: string; email: string; full_name: string | null } | null;
};

export type OverviewRow = {
  course_id: string;
  course_title: string;
  unread_count: number;
  recent: AnnouncementRow[];
};

export const announcementsRepository = {
  async findById(id: string): Promise<AnnouncementRow | null> {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();
    if (error) throw new Error(`announcements.findById: ${error.message}`);
    return (data as AnnouncementRow | null) ?? null;
  },

  // Pinned first, then by created_at DESC. Used on page 1 (no cursor).
  async listPinnedAndRecent(
    courseId: string,
    limit: number
  ): Promise<AnnouncementRow[]> {
    const { data: pinned, error: pErr } = await supabase
      .from('announcements')
      .select('*')
      .eq('course_id', courseId)
      .eq('pinned', true)
      .is('deleted_at', null)
      .limit(1);
    if (pErr) throw new Error(`announcements.listPinned: ${pErr.message}`);

    const pinnedRow = (pinned as AnnouncementRow[])[0] ?? null;
    const nonPinnedLimit = pinnedRow ? limit - 1 : limit;

    let q = supabase
      .from('announcements')
      .select('*')
      .eq('course_id', courseId)
      .eq('pinned', false)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(nonPinnedLimit);

    const { data: rest, error: rErr } = await q;
    if (rErr) throw new Error(`announcements.listRecent: ${rErr.message}`);

    return pinnedRow ? [pinnedRow, ...(rest as AnnouncementRow[])] : (rest as AnnouncementRow[]);
  },

  // Pages 2+: only non-pinned, cursor-paginated by created_at DESC.
  async listNonPinnedPage(
    courseId: string,
    limit: number,
    cursor: string
  ): Promise<AnnouncementRow[]> {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('course_id', courseId)
      .eq('pinned', false)
      .is('deleted_at', null)
      .lt('created_at', cursor)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(`announcements.listNonPinnedPage: ${error.message}`);
    return (data as AnnouncementRow[]) ?? [];
  },

  async create(row: {
    course_id: string;
    author_id: string;
    title: string;
    body: string;
    pinned: boolean;
  }): Promise<AnnouncementRow> {
    const { data, error } = await supabase
      .from('announcements')
      .insert(row)
      .select()
      .single();
    if (error) throw new Error(`announcements.create: ${error.message}`);
    return data as AnnouncementRow;
  },

  async update(
    id: string,
    patch: { title?: string; body?: string; pinned?: boolean }
  ): Promise<AnnouncementRow | null> {
    const { data, error } = await supabase
      .from('announcements')
      .update(patch)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .maybeSingle();
    if (error) {
      // 23505 = unique_violation from the partial unique index on (course_id)
      // WHERE pinned = true. Bubble up as a typed error so the service can
      // translate to 409.
      const e = error as { code?: string };
      if (e.code === '23505') throw new Error('PIN_CONFLICT');
      throw new Error(`announcements.update: ${error.message}`);
    }
    return (data as AnnouncementRow | null) ?? null;
  },

  async unpinAllForCourse(courseId: string): Promise<void> {
    const { error } = await supabase
      .from('announcements')
      .update({ pinned: false })
      .eq('course_id', courseId)
      .eq('pinned', true)
      .is('deleted_at', null);
    if (error) throw new Error(`announcements.unpinAll: ${error.message}`);
  },

  // Soft delete — set deleted_at. Trigger converts to a DELETE event in audit.
  async softDelete(id: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('announcements')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle();
    if (error) throw new Error(`announcements.softDelete: ${error.message}`);
    return !!data;
  },

  // Student marks course as read when they view announcements. Silently no-ops
  // if the student has no enrollment in the course.
  async markReadForStudent(studentId: string, courseId: string): Promise<void> {
    const { error } = await supabase
      .from('enrollments')
      .update({ last_announcement_read_at: new Date().toISOString() })
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .eq('status', 'approved');
    if (error) {
      // Non-fatal — log and swallow. The student can still see the feed.
      console.warn(`[announcements.markReadForStudent] ${error.message}`);
    }
  },

  // Overview for /my-courses: per approved-enrolled course, a count of
  // announcements newer than the student's last-read + up to 5 most recent.
  //
  // v0.1 keeps this as N+1 through approved courses (typically 1-10 per student).
  // The design doc's single-query approach would work too; this is easier to read.
  async overviewForStudent(studentId: string): Promise<OverviewRow[]> {
    const { data: enrollments, error: eErr } = await supabase
      .from('enrollments')
      .select('course_id, last_announcement_read_at, course:courses(id, title)')
      .eq('student_id', studentId)
      .eq('status', 'approved');
    if (eErr) throw new Error(`announcements.overviewForStudent.enrollments: ${eErr.message}`);

    // Supabase-js types embedded relations as arrays by default even when
    // the FK is one-to-one. Accept that shape and normalise below.
    type EnrollmentRow = {
      course_id: string;
      last_announcement_read_at: string | null;
      course: { id: string; title: string } | { id: string; title: string }[] | null;
    };
    const rawRows = (enrollments as unknown as EnrollmentRow[]) ?? [];
    const rows = rawRows.map((e) => ({
      ...e,
      course: Array.isArray(e.course) ? (e.course[0] ?? null) : e.course,
    }));

    const results = await Promise.all(
      rows.map(async (e): Promise<OverviewRow> => {
        const [recentRes, unreadRes] = await Promise.all([
          supabase
            .from('announcements')
            .select('*')
            .eq('course_id', e.course_id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(5),
          (() => {
            let q = supabase
              .from('announcements')
              .select('*', { count: 'exact', head: true })
              .eq('course_id', e.course_id)
              .is('deleted_at', null);
            if (e.last_announcement_read_at) {
              q = q.gt('created_at', e.last_announcement_read_at);
            }
            return q;
          })(),
        ]);

        if (recentRes.error) {
          console.warn(`[announcements.overview.recent] ${recentRes.error.message}`);
        }
        if (unreadRes.error) {
          console.warn(`[announcements.overview.unread] ${unreadRes.error.message}`);
        }

        return {
          course_id: e.course_id,
          course_title: e.course?.title ?? 'Course',
          unread_count: unreadRes.count ?? 0,
          recent: (recentRes.data as AnnouncementRow[]) ?? [],
        };
      })
    );

    return results;
  },
};
